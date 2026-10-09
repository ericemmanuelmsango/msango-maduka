/* =====================================================================
   E.E.MSANGO POS — Mauzo ya Rejareja na Jumla (Spea za Pikipiki)
   A SEPARATE app that works on the SAME business data as "Wadai na Wadaiwa":
     • reads the stock items, quantities and prices of the first system
     • every sale here reduces the stock there too (and the other way round)
     • credit (Mkopo) sales are added to the customer's account in Debtors
     • has its own users, sales, reports and settings
   ===================================================================== */
const APP_VERSION = "MM POS v5";
/* Firebase config + admin email live in ../duka.js (shared with the main app). */
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
let colRef = db.collection("wadai_na_wadaiwa");     // same place the first system keeps its data (changes per shop — duka.js)
const POS_DOC = "pos_settings";
const SALE_PREFIX = "possale_";
const EXP_PREFIX = "posexp_", PAY_PREFIX = "pospay_", CLOSE_PREFIX = "posclose_";
const SHARED = ["entries", "products", "stockItems", "stockMovements"];
const PART_LIMIT = 550000;

/* ---------- helpers ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmt = (n) => "TSh " + Math.round(Number(n) || 0).toLocaleString("en-US");
const num = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normName = (n) => (n || "").toLowerCase().replace(/[.,'"`]/g, "").replace(/\s+/g, " ").trim();
const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const todayStr = () => dayStr(Date.now());
const timeStr = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const dateTimeStr = (ms) => { const d = new Date(ms); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + timeStr(ms); };
const DAYS = ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"];
function dayLabel(ds) {
  const t = todayStr(), y = dayStr(Date.now() - 864e5);
  if (ds === t) return "Leo · " + ds;
  if (ds === y) return "Jana · " + ds;
  return DAYS[new Date(ds + "T12:00:00").getDay()] + " · " + ds;
}
const clean = (o) => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined values

/* ---------- live data from the cloud ---------- */
const D = {
  loaded: false, err: "", sync: null,
  products: [], stockItems: [], stockMovements: [], entries: [], settings: {},
  sales: [], expenses: [], payments: [], closings: [], pos: null, needDeviceLogin: false,
  parts: {},            // shared field -> number of part documents
};
const POS_DEFAULTS = {
  users: [], wholePrices: {}, defaultStore: "dukani", allowPriceEdit: true, counter: 0, activity: [],
  shop: {
    name: "E.E.MSANGO COMPANY LIMITED",
    line: "SPEA ZA PIKIPIKI — JUMLA NA REJAREJA",
    tin: "118-065-771",
    phone: "",
    address: "",
    footer: "Asante kwa kununua! Karibu tena 🙏",
  },
};
function posCfg() {
  const p = D.pos || {};
  return { ...POS_DEFAULTS, ...p, shop: { ...POS_DEFAULTS.shop, ...(p.shop || {}) }, wholePrices: p.wholePrices || {}, users: p.users || [], activity: p.activity || [] };
}

function startListening() {
  colRef.onSnapshot({ includeMetadataChanges: true }, (snap) => {
    const docs = {};
    snap.forEach((d) => { docs[d.id] = d.data(); });
    const main = docs.data || {};
    SHARED.forEach((f) => {
      const parts = Object.keys(docs).filter((id) => id.startsWith(f + "__")).map((id) => docs[id]).sort((a, b) => a.part - b.part);
      D.parts[f] = parts.length;
      if (parts.length) {
        const n = parts[0].of;
        let list = [].concat(...parts.filter((p) => p.of === n).map((p) => p.items || []));
        if (Array.isArray(main[f])) { // records an old device wrote into the old place
          const ids = new Set(list.map((x) => x && x.id));
          main[f].forEach((x) => { if (x && x.id && !ids.has(x.id)) list.push(x); });
        }
        D[f] = list;
      } else {
        D[f] = main[f] || [];
      }
    });
    D.settings = main.settings || {};
    const pick = (pre) => Object.keys(docs).filter((id) => id.startsWith(pre)).map((id) => docs[id]);
    D.sales = pick(SALE_PREFIX);
    D.expenses = pick(EXP_PREFIX);
    D.payments = pick(PAY_PREFIX);
    D.closings = pick(CLOSE_PREFIX);
    D.pos = docs[POS_DOC] || null;
    D.sync = { fromCache: snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites, at: Date.now() };
    D.loaded = true;
    D.err = "";
    rebuildView();
    maybeTrimActivity();
    render();
  }, (err) => {
    D.loaded = true;
    const denied = err && err.code === "permission-denied";
    const u = auth.currentUser;
    if (denied && (!u || u.isAnonymous)) D.needDeviceLogin = true;
    else D.err = denied ? "rules" : (err && err.message) || "Hitilafu ya mtandao";
    render();
  });
}

/* ---------- stock & prices (shared with the first system) ----------
   Stock of an item = everything received − everything sent out/sold in the
   first system − everything sold here. Deleted sales still count (deleting a
   sale record never brings stock back — same rule as the first system). */
let V = { qty: {}, buy: {}, items: [] };
function rebuildView() {
  const qty = {}, inQty = {}, inCost = {};
  D.stockMovements.forEach((m) => {
    qty[m.itemId] = (qty[m.itemId] || 0) + (m.type === "in" ? m.qty : -m.qty);
    if (m.type === "in" && m.price != null) { inQty[m.itemId] = (inQty[m.itemId] || 0) + m.qty; inCost[m.itemId] = (inCost[m.itemId] || 0) + m.qty * m.price; }
  });
  D.sales.forEach((s) => (s.items || []).forEach((i) => { qty[i.itemId] = (qty[i.itemId] || 0) - i.qty; }));
  const prodByName = {};
  D.products.forEach((p) => { if (!p.deleted) prodByName[normName(p.name)] = p; });
  const cfg = posCfg();
  const items = D.stockItems.map((it) => {
    const key = normName(it.name);
    const p = prodByName[key];
    let buy = it.buyPrice != null && it.buyPrice !== "" ? Number(it.buyPrice) : (p && p.buyPrice != null && p.buyPrice !== "" ? Number(p.buyPrice) : (inQty[it.id] > 0 ? inCost[it.id] / inQty[it.id] : null));
    const retail = p ? Number(p.price) || 0 : 0;
    const wp = cfg.wholePrices[key];
    return {
      id: it.id, name: it.name, key, category: it.category || "Other", store: it.store || "dukani",
      low: it.lowStockLimit != null && it.lowStockLimit !== "" ? Number(it.lowStockLimit) : 2,
      qty: qty[it.id] || 0, buy, retail, whole: wp != null && wp !== "" ? Number(wp) : retail, hasWhole: wp != null && wp !== "",
    };
  });
  V = { qty, items, byId: Object.fromEntries(items.map((i) => [i.id, i])) };
}
const storeItems = (store) => V.items.filter((i) => i.store === store);
const itemById = (id) => V.byId && V.byId[id];
const priceFor = (it, mode) => (mode === "jumla" ? it.whole : it.retail);

/* ---------- writing safely to the shared lists ----------
   Changes to a shared list are done inside a transaction: read the latest
   copy from the cloud, change it, write it back. So the two systems never
   overwrite each other's work. */
function chunkList(list) {
  const chunks = [[]]; let size = 0;
  list.forEach((item) => {
    const len = JSON.stringify(item).length + 1;
    if (size + len > PART_LIMIT && chunks[chunks.length - 1].length) { chunks.push([]); size = 0; }
    chunks[chunks.length - 1].push(item); size += len;
  });
  return chunks;
}
function txUpdateShared(field, mutate) {
  return db.runTransaction(async (tx) => {
    const n = D.parts[field] || 0;
    let list = [];
    if (n === 0) {
      const s = await tx.get(colRef.doc("data"));
      list = ((s.exists && s.data()) || {})[field] || [];
      list = mutate(clean(list));
      tx.set(colRef.doc("data"), { [field]: clean(list) }, { merge: true });
      return;
    }
    for (let i = 0; i < n; i++) {
      const s = await tx.get(colRef.doc(field + "__" + i));
      if (s.exists) list = list.concat(s.data().items || []);
    }
    list = mutate(clean(list));
    const chunks = chunkList(clean(list));
    chunks.forEach((items, i) => tx.set(colRef.doc(field + "__" + i), { part: i, of: chunks.length, items }));
    for (let i = chunks.length; i < n; i++) tx.delete(colRef.doc(field + "__" + i));
  });
}
function savePos(patch) {
  return colRef.doc(POS_DOC).set(clean(patch), { merge: true });
}
function logActivity(action, detail) {
  if (!U.user) return Promise.resolve();
  return colRef.doc(POS_DOC).set({
    activity: firebase.firestore.FieldValue.arrayUnion({ id: uid(), t: Date.now(), user: U.user.name, action, detail: detail || "" }),
  }, { merge: true }).catch(() => {});
}
let _trimming = false;
function maybeTrimActivity() {
  const act = posCfg().activity;
  if (_trimming || act.length <= 800 || !U.user || U.user.role !== "owner") return;
  _trimming = true;
  db.runTransaction(async (tx) => {
    const s = await tx.get(colRef.doc(POS_DOC));
    const a = ((s.data() || {}).activity || []).sort((x, y) => x.t - y.t).slice(-500);
    tx.set(colRef.doc(POS_DOC), { activity: a }, { merge: true });
  }).finally(() => { _trimming = false; });
}

/* =====================================================================
   UI STATE
   ===================================================================== */
const U = {
  user: null, pickUser: null, pinMsg: "", page: "uza", toast: "",
  store: null, mode: "rejareja", cat: "Zote", q: "",
  cart: [], pay: "Cash", paid: "", customer: "", phone: "", saleDate: "",
  receipt: null, printList: null, busy: false,
  salesRange: "today", salesFrom: "", salesTo: "", salesQ: "", openSale: null, showDeleted: false,
  repRange: "today", repFrom: "", repTo: "",
  stockCat: "Zote", stockQ: "", stockStore: null, editPrice: null,
  userForm: null, setup: { name: "", pin: "", pin2: "" }, shopMsg: "",
};
try { U.pickUser = localStorage.getItem("pos_last_user"); } catch (e) {}
const isOwner = () => U.user && U.user.role === "owner";
const curStore = () => U.store || posCfg().defaultStore || "dukani";
const storeLabel = (s) => (s === "godown" ? "Godown" : "Dukani");

async function hashPin(userId, pin) {
  const data = new TextEncoder().encode("eepos:" + userId + ":" + pin);
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return "plain:" + pin; // very old browsers only
}

/* ---------- render with focus preservation ---------- */
let _softT = null;
function soft(ms) { clearTimeout(_softT); _softT = setTimeout(render, ms == null ? 220 : ms); }
function render() {
  clearTimeout(_softT);
  const app = document.getElementById("app");
  const a = document.activeElement, id = a && a.id, s = a && a.selectionStart, e = a && a.selectionEnd;
  const scroll = { x: window.scrollX, y: window.scrollY };
  const grid = document.querySelector(".grid"); const gTop = grid ? grid.scrollTop : 0;
  app.innerHTML = view();
  if (id) { const el = document.getElementById(id); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(s, e); } catch (x) {} } }
  const g2 = document.querySelector(".grid"); if (g2) g2.scrollTop = gTop;
  window.scrollTo(scroll.x, scroll.y);
}
function setText(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }
function toast(m) { U.toast = m; render(); clearTimeout(toast.t); toast.t = setTimeout(() => { U.toast = ""; render(); }, 2400); }

function logoHtml() {
  if (D.settings && D.settings.logoBase64) return `<img src="${D.settings.logoBase64}" alt="">`;
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#0e2a3f"/><text x="50" y="62" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">EE</text></svg>`;
}

function view() {
  if (!D.loaded) return `<div class="loading"><div class="spin"></div>Inaunganisha na database...</div>`;
  if (D.needDeviceLogin) return deviceLoginView();
  if (D.blocked) return dukaBlockedView();
  if (D.adminHome) return dukaAdminRedirect();
  if (!ed().pos) return `<div class="login"><div class="login-card" style="text-align:center"><div style="font-size:40px">🧾</div><h2>POS haipo kwenye ${esc(ed().name)}</h2>
    <p style="color:var(--mute);font-size:14px">Mfumo wa ${esc(bizName())} ni ${esc(ed().name)} — madeni, stock na ripoti za msingi. Kupata POS ya mauzo, risiti za WhatsApp na kufunga siku, pandisha kwenda DukaSmart. Wasiliana na E.E.Msango.</p></div></div>`;
  if (D.err) return errorView();
  const cfg = posCfg();
  if (!cfg.users.length) return setupView();
  if (!U.user) return loginView();
  // user removed or disabled on another device → sign out
  const fresh = cfg.users.find((x) => x.id === U.user.id);
  if (!fresh || fresh.active === false) { U.user = null; return loginView(); }
  U.user = fresh;
  return shellView();
}
function errorView() {
  return `<div class="login"><div class="login-card">
    <div class="logo"><span class="mk">⚠️</span>Haiwezi kufungua data</div>
    ${D.err === "rules" ? `<p style="font-size:13px">Firebase rules zinazuia POS kusoma data ya biashara. Fungua <b>Firebase Console → Firestore Database → Rules</b>, weka rules hizi kisha bonyeza <b>Publish</b>:</p>
    <pre style="font-size:11px;background:var(--bg);padding:10px;border-radius:8px;overflow-x:auto">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /wadai_na_wadaiwa/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}</pre>` : `<p class="err">${esc(D.err)}</p>`}
    <button class="btn btn-p" style="width:100%" onclick="location.reload()">🔄 Jaribu tena</button>
  </div></div>`;
}

/* ---------- first run: create the owner ---------- */
function setupView() {
  const s = U.setup;
  return `<div class="login"><div class="login-card">
    <div class="logo"><span class="mk">${logoHtml()}</span>${esc(SHOP ? SHOP.name : "E.E.MSANGO POS")}</div>
    <p style="color:var(--mute);font-size:13px;margin:4px 0 0">Karibu! Hii ni mara ya kwanza. Tengeneza akaunti ya <b>mmiliki</b> (Owner). Baadaye utaongeza wauzaji.</p>
    <label class="l">Jina lako</label>
    <input id="su-name" class="field" value="${esc(s.name)}" oninput="U.setup.name=this.value" placeholder="mf. Eric">
    <label class="l">PIN (namba 4–6)</label>
    <input id="su-pin" class="field" type="password" inputmode="numeric" maxlength="6" value="${esc(s.pin)}" oninput="U.setup.pin=this.value.replace(/\\D/g,'')">
    <label class="l">Rudia PIN</label>
    <input id="su-pin2" class="field" type="password" inputmode="numeric" maxlength="6" value="${esc(s.pin2)}" oninput="U.setup.pin2=this.value.replace(/\\D/g,'')">
    ${U.pinMsg ? `<div class="err">${esc(U.pinMsg)}</div>` : ""}
    <button class="btn btn-p" style="width:100%;margin-top:14px" onclick="createOwner()">✅ Tengeneza na Uingie</button>
  </div></div>`;
}
async function createOwner() {
  const s = U.setup;
  if (!s.name.trim()) { U.pinMsg = "Andika jina lako."; return render(); }
  if (s.pin.length < 4) { U.pinMsg = "PIN iwe na namba 4 hadi 6."; return render(); }
  if (s.pin !== s.pin2) { U.pinMsg = "PIN mbili hazifanani."; return render(); }
  const id = uid();
  const user = { id, name: s.name.trim(), role: "owner", pinHash: await hashPin(id, s.pin), active: true, createdAt: Date.now() };
  // transaction so two devices can't both create the "first" owner
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(colRef.doc(POS_DOC));
    const cur = (snap.exists && snap.data().users) || [];
    if (cur.length) throw new Error("exists");
    tx.set(colRef.doc(POS_DOC), { users: [user] }, { merge: true });
  }).then(() => {
    U.user = user; U.pinMsg = ""; U.setup = { name: "", pin: "", pin2: "" };
    rememberUser(user.id);
    logActivity("Akaunti ya mmiliki imetengenezwa", user.name);
    render();
  }).catch((e) => { U.pinMsg = e.message === "exists" ? "Mmiliki tayari yupo — ingia kwa PIN." : "Imeshindikana kuhifadhi. Angalia mtandao."; render(); });
}
function rememberUser(id) { try { localStorage.setItem("pos_last_user", id); sessionStorage.setItem("pos_session", id); } catch (e) {} }

/* ---------- login ---------- */
function loginView() {
  const users = posCfg().users.filter((u) => u.active !== false);
  if (!U.pickUser || !users.some((u) => u.id === U.pickUser)) U.pickUser = users[0] && users[0].id;
  return `<div class="login"><div class="login-card">
    <div class="logo"><span class="mk">${logoHtml()}</span>${esc(SHOP ? SHOP.name : "E.E.MSANGO POS")}</div>
    <div style="color:var(--mute);font-size:13px">Chagua jina lako, kisha weka PIN</div>
    <div class="users">${users.map((u) => `<button class="user-btn ${U.pickUser === u.id ? "on" : ""}" onclick="U.pickUser='${u.id}';U.pinMsg='';render();setTimeout(()=>{const p=document.getElementById('pin');p&&p.focus()},30)">
      <span>${u.role === "owner" ? "👑" : "🧑‍💼"} ${esc(u.name)}</span><small>${u.role === "owner" ? "Mmiliki" : "Muuzaji"}</small></button>`).join("")}</div>
    <input id="pin" class="field" type="password" inputmode="numeric" maxlength="6" placeholder="PIN" onkeydown="if(event.key==='Enter')doLogin()">
    ${U.pinMsg ? `<div class="err">${esc(U.pinMsg)}</div>` : ""}
    <button class="btn btn-p" style="width:100%;margin-top:12px" onclick="doLogin()">Ingia</button>
    <div class="hint">Umesahau PIN? Mmiliki anaweza kukubadilishia kwenye 👥 Watumiaji. Mmiliki akisahau, wasiliana na E.E.Msango.</div>
  </div></div>`;
}
async function doLogin() {
  const u = posCfg().users.find((x) => x.id === U.pickUser);
  const pin = (document.getElementById("pin") || {}).value || "";
  if (!u) return;
  if (u.pinHash === (await hashPin(u.id, pin))) {
    U.user = u; U.pinMsg = ""; U.page = "uza"; rememberUser(u.id);
    logActivity("Ameingia", "");
  } else U.pinMsg = "PIN si sahihi.";
  render();
}
function logout() {
  logActivity("Ametoka", "");
  U.user = null; U.cart = []; U.receipt = null;
  try { sessionStorage.removeItem("pos_session"); } catch (e) {}
  render();
}

/* ---------- app shell ---------- */
function shellView() {
  const tabs = [["uza", "🛒 Uza"], ["stock", "📦 Bidhaa"], ["mauzo", "🧾 Mauzo"], ["madeni", "📒 Madeni"], ["matumizi", "💸 Matumizi"], ["funga", "💰 Funga Siku"]]
    .filter(([k]) => ({ madeni: "posMadeni", matumizi: "matumizi", funga: "funga" })[k] ? has(({ madeni: "posMadeni", matumizi: "matumizi", funga: "funga" })[k]) : true);
  if (isOwner()) { if (ed().profit) tabs.push(["ripoti", "📊 Ripoti"]); tabs.push(["watu", "👥 Watumiaji"], ["mipangilio", "⚙️ Mipangilio"]); }
  const s = D.sync;
  const sync = !s ? "⚪" : s.fromCache ? "🔴 Offline" : s.pending ? "🟡 Inahifadhi" : "🟢 Live";
  const pages = { uza: pagePOS, stock: pageStock, mauzo: pageSales, madeni: pageDebts, matumizi: pageExpenses, funga: pageClose, ripoti: pageReport, watu: pageUsers, mipangilio: pageSettings };
  if (!pages[U.page] || (!isOwner() && ["ripoti", "watu", "mipangilio"].includes(U.page)) || (U.page !== "uza" && !tabs.some(([k]) => k === U.page))) U.page = "uza";
  return `${dukaAdminBanner()}${dukaExpiryBanner()}<div class="top"><div class="logo"><span class="mk">${logoHtml()}</span><span class="t">${esc(SHOP ? SHOP.name : "E.E.MSANGO POS")}</span></div>
    <div class="who"><span class="sync">${sync}</span>
      <button class="icon-top" title="Dark / Light" onclick="toggleTheme()">${document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙"}</button>
      <button class="icon-top" title="Skrini nzima" onclick="toggleFull()">⛶</button><b>${isOwner() ? "👑" : "🧑‍💼"} ${esc(U.user.name)}</b><button onclick="logout()">⏻ Toka</button></div></div>
  <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${U.page === k ? "on" : ""}" onclick="go('${k}')">${l}</button>`).join("")}<button class="tab" onclick="location.href=dukaHref('./')">📚 Wadai na Stock</button></div>
  <main>${pages[U.page]()}</main>
  ${U.page === "uza" && U.cart.length ? `<button class="cart-fab no-print" onclick="document.getElementById('cart').scrollIntoView({behavior:'smooth'})">🛒 ${U.cart.length} · ${fmt(cartTotal())}</button>` : ""}
  ${U.receipt ? receiptModal(U.receipt) : ""}
  ${U.printList ? printListModal() : ""}
  ${U.userForm ? userFormModal() : ""}
  ${U.editPrice ? priceModal() : ""}
  ${U.payFor ? payModal() : ""}
  ${U.payReceipt ? payReceiptModal(U.payReceipt) : ""}
  ${U.toast ? `<div class="toast">${esc(U.toast)}</div>` : ""}`;
}
function go(p) { U.page = p; U.openSale = null; window.scrollTo(0, 0); render(); }

/* =====================================================================
   🛒 UZA — the selling screen
   ===================================================================== */
const lineUnit = (l) => { const it = itemById(l.itemId); return l.price != null && l.price !== "" ? Number(l.price) : (it ? priceFor(it, U.mode) : 0); };
const cartTotal = () => U.cart.reduce((s, l) => s + lineUnit(l) * (Number(l.qty) || 0), 0);
function categoriesOf(list) { return ["Zote", ...[...new Set(list.map((i) => i.category))].sort()]; }

function pagePOS() {
  const store = curStore();
  const all = storeItems(store);
  const q = normName(U.q);
  const words = q.split(" ").filter(Boolean);
  let list = all.filter((i) => (U.cat === "Zote" || i.category === U.cat) && words.every((w) => i.key.includes(w)));
  list.sort((a, b) => (b.qty > 0) - (a.qty > 0) || a.name.localeCompare(b.name));
  const shown = list.slice(0, 150);
  const cfg = posCfg();
  return `<div class="pos">
  <div class="panel">
    ${ed().jumla ? `<div class="mode">
      <button class="${U.mode === "rejareja" ? "on" : ""}" onclick="setMode('rejareja')">Rejareja</button>
      <button class="${U.mode === "jumla" ? "on whole" : ""}" onclick="setMode('jumla')">Jumla</button>
    </div>` : ""}
    ${isOwner() && ed().stores ? `<div class="filters" style="margin-bottom:8px"><span style="font-size:12px;color:var(--mute);font-weight:700">Unauza kutoka:</span>
      ${["dukani", "godown"].map((s) => `<button class="chip ${store === s ? "on" : ""}" onclick="switchStore('${s}')">${s === "godown" ? "🏭 Godown" : "🏪 Dukani"}</button>`).join("")}</div>` : ""}
    <input id="q" class="field" type="search" autocomplete="off" placeholder="🔍 Tafuta spea kwa jina... (${all.length} zipo ${storeLabel(store)})" value="${esc(U.q)}" oninput="U.q=this.value;soft()">
    <div class="chips">${categoriesOf(all).map((c) => `<button class="chip ${U.cat === c ? "on" : ""}" onclick="U.cat='${esc(c)}';render()">${esc(c)}</button>`).join("")}</div>
    <div class="grid">${shown.length ? shown.map((i) => {
      const inCart = (U.cart.find((l) => l.itemId === i.id) || {}).qty || 0;
      const left = i.qty - inCart;
      const price = priceFor(i, U.mode);
      return `<button class="prod" ${left <= 0 ? "disabled" : ""} onclick="addToCart('${i.id}')">
        <span class="nm">${esc(i.name)}</span><span class="ct">${esc(i.category)}</span>
        <span class="pr">${price > 0 ? fmt(price) : '<span style="color:var(--amber)">Bei haijawekwa</span>'}</span>
        <span class="st ${left <= i.low ? "low" : ""}">${i.qty <= 0 ? "Imeisha" : left <= 0 ? "Zote ziko kikapuni" : (left <= i.low ? "⚠️ " : "") + "Zipo: " + left}</span></button>`;
    }).join("") : `<div class="empty">${all.length ? "Hakuna spea inayolingana na utafutaji." : "Hakuna bidhaa kwenye stock ya " + storeLabel(store) + " bado. Ongeza bidhaa kwenye system ya kwanza (Pokea Mzigo)."}</div>`}</div>
    ${list.length > shown.length ? `<p class="hint">Zinaonyeshwa ${shown.length} kati ya ${list.length}. Andika jina zaidi ili kupunguza.</p>` : ""}
  </div>
  <div class="panel" id="cart">
    <div class="cart-head"><h2 style="margin:0">Kikapu ${U.mode === "jumla" ? '<span class="badge am">JUMLA</span>' : ""}</h2>
      ${U.cart.length ? `<button class="btn btn-g sm" onclick="if(confirm('Futa vitu vyote kwenye kikapu?')){U.cart=[];render()}">Futa zote</button>` : ""}</div>
    <div class="cart-list">${U.cart.length ? U.cart.map(cartLine).join("") : `<div class="empty">Bonyeza spea kuiongeza kwenye kikapu</div>`}</div>
    <div class="sum">
      <div class="big"><span>Jumla</span><span id="cart-total">${fmt(cartTotal())}</span></div>
      <datalist id="cust-list">${customerSuggestions().map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist>
      <div class="two">
        <input id="cust" class="field sm" list="cust-list" placeholder="Jina la mteja${U.pay === "Mkopo" ? " *" : ""}" value="${esc(U.customer)}" oninput="U.customer=this.value" onchange="fillPhone()">
        <input id="phone" class="field sm" type="tel" inputmode="tel" placeholder="Namba ya simu" value="${esc(U.phone)}" oninput="U.phone=this.value">
      </div>
      <div class="pay">${["Cash", "M-Pesa", "Mkopo"].map((m) => `<button class="${U.pay === m ? "on" : ""}" onclick="U.pay='${m}';render()">${m === "Cash" ? "💵" : m === "M-Pesa" ? "📱" : "📒"} ${m === "M-Pesa" ? "Simu/Benki" : m}</button>`).join("")}</div>
      ${U.pay === "Mkopo" ? `<div class="note" style="margin:0">📒 Deni litaongezwa moja kwa moja kwa mteja huyu kwenye <b>Debtors</b> ya system ya kwanza.</div>` : ""}
      ${U.pay === "Cash" ? `<div class="row"><input id="paid" class="field" inputmode="numeric" placeholder="Pesa aliyotoa mteja" value="${esc(U.paid)}" oninput="this.value=this.value.replace(/[^0-9]/g,'');U.paid=this.value;updateChange()"></div>
        <div class="row"><span>Chenji</span><span id="change" class="change">${changeText()}</span></div>` : ""}
      <button class="btn btn-p" style="font-size:16px;padding:14px" onclick="checkout()" ${U.cart.length && !U.busy ? "" : "disabled"}>${U.busy ? "Inahifadhi..." : "✅ Maliza Mauzo"}</button>
      <div class="hint" style="margin:0;text-align:center">📅 ${dayLabel(todayStr())} · Muuzaji: ${esc(U.user.name)} · ${storeLabel(store)}</div>
    </div>
  </div></div>`;
}
function cartLine(l) {
  const it = itemById(l.itemId);
  if (!it) return "";
  const unit = lineUnit(l);
  const listP = priceFor(it, U.mode);
  const custom = l.price != null && l.price !== "";
  const canEdit = isOwner() || posCfg().allowPriceEdit;
  const belowCost = isOwner() && it.buy != null && unit < it.buy;
  return `<div class="line">
    <div><div class="n">${esc(it.name)}</div>
      <div class="s">${canEdit
        ? `<input id="lp-${l.itemId}" class="field sm" inputmode="numeric" value="${custom ? esc(l.price) : unit}" onchange="setLinePrice('${l.itemId}',this.value)" onfocus="this.select()" title="Bonyeza kubadilisha bei">`
        : fmt(unit)}
        ${custom ? `<span class="chgd">✏️ bei ya kawaida ${num(listP)}</span> <button class="btn btn-g sm" style="padding:2px 6px" onclick="setLinePrice('${l.itemId}','')">↺</button>` : ""}
        ${belowCost ? `<span class="badge">chini ya bei ya kununua (${num(it.buy)})</span>` : ""}</div></div>
    <div class="tot" id="lt-${l.itemId}">${fmt(unit * l.qty)}</div>
    <div class="qty"><button onclick="changeQty('${l.itemId}',-1)">−</button>
      <input id="lq-${l.itemId}" class="field sm" inputmode="numeric" value="${l.qty}" onchange="setQty('${l.itemId}',this.value)" onfocus="this.select()">
      <button onclick="changeQty('${l.itemId}',1)">+</button></div>
    <div style="text-align:right"><button class="btn btn-g sm" onclick="removeLine('${l.itemId}')">🗑️</button></div>
  </div>`;
}
function setMode(m) { if (m === "jumla" && !ed().jumla) m = "rejareja"; U.mode = m; render(); }
function switchStore(s) {
  if (U.cart.length && !confirm("Kubadilisha store kutafuta kikapu. Endelea?")) return;
  U.store = s; U.cart = []; U.cat = "Zote"; render();
}
function addToCart(id) {
  const it = itemById(id); if (!it) return;
  const l = U.cart.find((x) => x.itemId === id);
  if ((l ? l.qty : 0) + 1 > it.qty) return toast("Stock haitoshi — zimebaki " + it.qty);
  if (l) l.qty++; else U.cart.push({ itemId: id, qty: 1, price: null });
  render();
}
function changeQty(id, d) {
  const l = U.cart.find((x) => x.itemId === id); const it = itemById(id);
  if (!l || !it) return;
  if (d > 0 && l.qty + 1 > it.qty) return toast("Stock haitoshi — zimebaki " + it.qty);
  l.qty += d; if (l.qty <= 0) U.cart = U.cart.filter((x) => x.itemId !== id);
  render();
}
function setQty(id, v) {
  const l = U.cart.find((x) => x.itemId === id); const it = itemById(id);
  let q = Math.floor(Number(v) || 0);
  if (!l || !it) return;
  if (q > it.qty) { toast("Stock haitoshi — zimebaki " + it.qty); q = it.qty; }
  if (q <= 0) U.cart = U.cart.filter((x) => x.itemId !== id); else l.qty = q;
  render();
}
function setLinePrice(id, v) {
  const l = U.cart.find((x) => x.itemId === id); const it = itemById(id);
  if (!l || !it) return;
  v = String(v).replace(/[^0-9]/g, "");
  l.price = v === "" || Number(v) === priceFor(it, U.mode) ? null : v;
  render();
}
function removeLine(id) { U.cart = U.cart.filter((x) => x.itemId !== id); render(); }
function changeText() {
  const paid = Number(U.paid) || 0, total = cartTotal();
  if (!paid) return "—";
  return paid < total ? "Pungufu " + fmt(total - paid) : fmt(paid - total);
}
function updateChange() {
  const el = document.getElementById("change"); if (!el) return;
  el.textContent = changeText();
  el.className = "change" + ((Number(U.paid) || 0) && Number(U.paid) < cartTotal() ? " neg" : "");
}
function customerSuggestions() {
  const map = {};
  D.sales.forEach((s) => { if (s.customer) map[normName(s.customer)] = { name: s.customer, phone: s.phone || (map[normName(s.customer)] || {}).phone || "" }; });
  D.entries.forEach((e) => { if (e.kind === "owed_to_me" && e.name) { const k = normName(e.name); map[k] = { name: (map[k] || {}).name || e.name, phone: (map[k] || {}).phone || e.phone || "" }; } });
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 400);
}
function fillPhone() {
  if (U.phone.trim()) return;
  const c = customerSuggestions().find((x) => normName(x.name) === normName(U.customer));
  if (c && c.phone) { U.phone = c.phone; render(); }
}

/* ---------- finish the sale ---------- */
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]); }
async function nextReceiptNo() {
  try {
    const n = await withTimeout(db.runTransaction(async (tx) => {
      const s = await tx.get(colRef.doc(POS_DOC));
      const c = ((s.exists && s.data().counter) || 0) + 1;
      tx.set(colRef.doc(POS_DOC), { counter: c }, { merge: true });
      return c;
    }), 5000);
    return "R" + String(n).padStart(5, "0");
  } catch (e) {
    const d = new Date(); // offline: still unique, still readable
    return "R" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
}
async function checkout() {
  if (U.busy || !U.cart.length) return;
  const total = cartTotal();
  for (const l of U.cart) {
    const it = itemById(l.itemId);
    if (!it) return toast("Bidhaa moja haipo tena kwenye stock — iondoe kwenye kikapu.");
    if (l.qty > it.qty) return toast(`${it.name}: zimebaki ${it.qty} tu.`);
    if (lineUnit(l) <= 0) return toast(`Weka bei ya ${it.name}.`);
  }
  if (U.pay === "Cash" && U.paid && Number(U.paid) < total) return toast("Pesa aliyotoa haitoshi.");
  if (U.pay === "Mkopo" && !U.customer.trim()) return toast("Andika jina la mteja anayechukua kwa mkopo.");
  U.busy = true; render();
  const id = uid(), now = Date.now();
  const no = await nextReceiptNo();
  const items = U.cart.map((l) => {
    const it = itemById(l.itemId);
    const price = lineUnit(l);
    return { itemId: it.id, name: it.name, category: it.category, qty: l.qty, price, listPrice: priceFor(it, U.mode), buy: it.buy, lineTotal: price * l.qty };
  });
  const sale = clean({
    id, no, createdAt: now, date: dayStr(now), store: curStore(), mode: U.mode, pay: U.pay,
    customer: U.customer.trim(), phone: U.phone.trim(),
    userId: U.user.id, userName: U.user.name,
    items, total, paid: U.pay === "Cash" ? (Number(U.paid) || total) : total,
    deleted: false,
  });
  colRef.doc(SALE_PREFIX + id).set(sale).catch(() => toast("⚠️ Mauzo hayajafika cloud bado — yatatumwa mtandao ukirudi."));
  if (sale.pay === "Mkopo") addToDebtors(sale);
  const changed = items.filter((i) => i.price !== i.listPrice);
  logActivity("Ameuza", `${no} · ${fmt(total)} · ${sale.pay}${sale.customer ? " · " + sale.customer : ""}${changed.length ? ` · bei imebadilishwa: ${changed.map((i) => i.name + " " + num(i.listPrice) + "→" + num(i.price)).join(", ")}` : ""}`);
  U.cart = []; U.paid = ""; U.customer = ""; U.phone = ""; U.pay = "Cash"; U.busy = false;
  U.receipt = sale;
  render();
}
// Credit sale → add a charge (with the items) to the customer's Debtors account in the first system.
function addToDebtors(sale) {
  const charge = {
    id: uid(), date: sale.date, amount: sale.total,
    description: `POS ${sale.no} (${sale.userName})`,
    items: sale.items.map((i) => ({ name: i.name, price: i.price, discountPrice: i.price, discountPercent: null, qty: i.qty, lineTotal: i.lineTotal })),
  };
  const key = normName(sale.customer);
  txUpdateShared("entries", (list) => {
    let e = list.find((x) => x.kind === "owed_to_me" && !x.archived && normName(x.name) === key)
         || list.find((x) => x.kind === "owed_to_me" && x.archived && normName(x.name) === key);
    if (e) {
      if (!e.charges) e.charges = [{ id: "legacy-" + e.id, date: e.dateCreated, description: e.note || "", amount: e.amount || 0, items: e.items }];
      e.charges.push(charge);
      if (!e.phone && sale.phone) e.phone = sale.phone;
      e.archived = false; e.archivedDate = null;
    } else {
      list.push({ id: uid(), kind: "owed_to_me", name: sale.customer, phone: sale.phone, dueDate: null, dateCreated: sale.date, payments: [], charges: [charge] });
    }
    return list;
  }).then(() => toast("📒 Deni la " + sale.customer + " limeongezwa kwenye Debtors."))
    .catch(() => toast("⚠️ Deni halijaongezwa Debtors — liongeze kwa mkono kwenye system ya kwanza."));
}

/* =====================================================================
   📦 BIDHAA — stock, shared live with the first system
   ===================================================================== */
function pageStock() {
  const store = U.stockStore || curStore();
  const all = storeItems(store);
  const words = normName(U.stockQ).split(" ").filter(Boolean);
  const list = all.filter((i) => (U.stockCat === "Zote" || i.category === U.stockCat) && words.every((w) => i.key.includes(w)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const low = all.filter((i) => i.qty > 0 && i.qty <= i.low).length;
  const zero = all.filter((i) => i.qty <= 0).length;
  const noPrice = all.filter((i) => !i.retail).length;
  const value = all.reduce((s, i) => s + (i.qty > 0 && i.buy != null ? i.qty * i.buy : 0), 0);
  return `<div class="stats">
    <div class="stat"><div class="l">Aina za spea</div><div class="v">${all.length}</div></div>
    <div class="stat"><div class="l">Zinakaribia kuisha</div><div class="v" style="color:var(--amber)">${low}</div></div>
    <div class="stat r"><div class="l">Zimeisha</div><div class="v">${zero}</div></div>
    ${isOwner() ? `<div class="stat g"><div class="l">Thamani ya stock (bei ya kununua)</div><div class="v">${fmt(value)}</div></div>` : ""}
  </div>
  <div class="panel">
    <div class="row" style="flex-wrap:wrap;margin-bottom:8px"><h2 style="margin:0">📦 Stock — ${storeLabel(store)}</h2>
      <div class="filters" style="margin:0">${(ed().stores ? ["dukani", "godown"] : ["dukani"]).map((s) => `<button class="chip ${store === s ? "on" : ""}" onclick="U.stockStore='${s}';U.stockCat='Zote';render()">${s === "godown" ? "🏭 Godown" : "🏪 Dukani"}</button>`).join("")}
      <button class="btn btn-g sm" onclick="printStock('${store}')">🖨️ Print</button></div></div>
    ${noPrice && isOwner() ? `<div class="note">💡 Spea ${noPrice} hazina bei ya kuuza. Bonyeza ✏️ kuweka bei, ili ziweze kuuzwa.</div>` : ""}
    ${!isOwner() ? `<div class="note">🔒 Kama muuzaji, huoni bei ya kununua.</div>` : ""}
    <input id="sq" class="field" type="search" autocomplete="off" placeholder="🔍 Tafuta spea..." value="${esc(U.stockQ)}" oninput="U.stockQ=this.value;soft()">
    <div class="chips">${categoriesOf(all).map((c) => `<button class="chip ${U.stockCat === c ? "on" : ""}" onclick="U.stockCat='${esc(c)}';render()">${esc(c)}</button>`).join("")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>Spea</th><th>Kundi</th>${isOwner() ? '<th class="r">Bei ya Kununua</th>' : ""}<th class="r">Rejareja</th><th class="r">Jumla</th><th class="r">Zipo</th>${isOwner() ? "<th></th>" : ""}</tr></thead><tbody>
    ${list.length ? list.map((i) => `<tr>
      <td><b>${esc(i.name)}</b></td><td style="color:var(--mute)">${esc(i.category)}</td>
      ${isOwner() ? `<td class="r">${i.buy != null ? num(i.buy) : "—"}</td>` : ""}
      <td class="r">${i.retail ? num(i.retail) : '<span class="badge am">hakuna</span>'}</td>
      <td class="r">${i.hasWhole ? num(i.whole) : `<span style="color:var(--mute)">${i.retail ? num(i.retail) : "—"}</span>`}</td>
      <td class="r"><span class="badge ${i.qty <= 0 ? "" : i.qty <= i.low ? "am" : "ok"}">${i.qty}</span></td>
      ${isOwner() ? `<td class="r"><button class="btn btn-g sm" onclick="U.editPrice={id:'${i.id}',retail:'${i.retail || ""}',whole:'${i.hasWhole ? i.whole : ""}'};render()">✏️</button></td>` : ""}
    </tr>`).join("") : `<tr><td colspan="7" class="empty">Hakuna spea inayolingana.</td></tr>`}
    </tbody></table></div>
    <p class="hint">Stock hii inatoka moja kwa moja kwenye system ya kwanza. Mzigo mpya unapokelewa kule (📥 Pokea Mzigo), na unaonekana hapa papo hapo.</p>
  </div>`;
}
function priceModal() {
  const p = U.editPrice, it = itemById(p.id);
  if (!it) { U.editPrice = null; return ""; }
  return `<div class="ov"><div class="modal">
    <h2>✏️ Bei za ${esc(it.name)}</h2>
    ${it.buy != null ? `<div class="note">Bei ya kununua: <b>${fmt(it.buy)}</b></div>` : ""}
    <label class="l">Bei ya rejareja (inaonekana pia kwenye system ya kwanza)</label>
    <input id="ep-r" class="field" inputmode="numeric" value="${esc(p.retail)}" oninput="this.value=this.value.replace(/[^0-9]/g,'');U.editPrice.retail=this.value">
    <label class="l">Bei ya jumla (acha wazi = sawa na rejareja)</label>
    <input id="ep-w" class="field" inputmode="numeric" value="${esc(p.whole)}" oninput="this.value=this.value.replace(/[^0-9]/g,'');U.editPrice.whole=this.value">
    <div class="ov-actions"><button class="btn btn-g" onclick="U.editPrice=null;render()">Ghairi</button><button class="btn btn-p" onclick="savePrices()">💾 Hifadhi</button></div>
  </div></div>`;
}
function savePrices() {
  const p = U.editPrice, it = itemById(p.id);
  if (!it) return;
  const retail = p.retail === "" ? 0 : Number(p.retail);
  const key = it.key, name = it.name;
  const jobs = [];
  if (retail !== it.retail) {
    jobs.push(txUpdateShared("products", (list) => {
      const prod = list.find((x) => !x.deleted && normName(x.name) === key);
      if (prod) prod.price = retail; else list.push({ id: uid(), name, price: retail });
      return list;
    }));
  }
  const wNew = p.whole === "" ? null : Number(p.whole);
  const wOld = it.hasWhole ? it.whole : null;
  if (wNew !== wOld) {
    jobs.push(savePos({ wholePrices: { [key]: wNew } })); // null = use the retail price
  }
  U.editPrice = null;
  render();
  Promise.all(jobs).then(() => {
    toast("✅ Bei zimehifadhiwa");
    logActivity("Amebadilisha bei", `${name}: rejareja ${num(retail)}${wNew != null ? ", jumla " + num(wNew) : ""}`);
  }).catch(() => toast("⚠️ Imeshindikana kuhifadhi bei. Angalia mtandao."));
}
function printStock(store) {
  const rows = storeItems(store).sort((a, b) => a.name.localeCompare(b.name));
  U.printList = {
    title: "Orodha ya Stock — " + storeLabel(store),
    sub: "Imechapishwa " + dateTimeStr(Date.now()) + " na " + U.user.name,
    head: ["#", "Spea", "Kundi", ...(isOwner() ? ["Bei ya Kununua"] : []), "Rejareja", "Jumla", "Zipo"],
    rows: rows.map((i, n) => [n + 1, i.name, i.category, ...(isOwner() ? [i.buy != null ? num(i.buy) : "—"] : []), num(i.retail), num(i.whole), i.qty]),
    foot: isOwner() ? "Thamani ya stock: " + fmt(rows.reduce((s, i) => s + (i.qty > 0 && i.buy != null ? i.qty * i.buy : 0), 0)) : "",
  };
  render();
}

/* =====================================================================
   🧾 MAUZO — sales history
   ===================================================================== */
function rangeBounds(range, from, to) {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const day = 864e5, t0 = d0.getTime();
  switch (range) {
    case "today": return [t0, t0 + day];
    case "yesterday": return [t0 - day, t0];
    case "week": return [t0 - 6 * day, t0 + day];
    case "month": { const m = new Date(d0); m.setDate(1); return [m.getTime(), t0 + day]; }
    case "custom": {
      const a = from ? new Date(from + "T00:00:00").getTime() : 0;
      const b = to ? new Date(to + "T00:00:00").getTime() + day : t0 + day;
      return [a, b];
    }
    default: return [0, Infinity];
  }
}
const RANGES = [["today", "Leo"], ["yesterday", "Jana"], ["week", "Siku 7"], ["month", "Mwezi huu"], ["all", "Zote"], ["custom", "📅 Chagua tarehe"]];
function rangePicker(prefix) {
  const r = U[prefix + "Range"];
  return `<div class="filters">${RANGES.map(([k, l]) => `<button class="chip ${r === k ? "on" : ""}" onclick="U.${prefix}Range='${k}';render()">${l}</button>`).join("")}
    ${r === "custom" ? `<input id="${prefix}-from" class="field sm" type="date" style="width:auto" value="${U[prefix + "From"]}" onchange="U.${prefix}From=this.value;render()"> hadi
      <input id="${prefix}-to" class="field sm" type="date" style="width:auto" value="${U[prefix + "To"]}" onchange="U.${prefix}To=this.value;render()">` : ""}</div>`;
}
function rangeLabel(prefix) {
  const r = U[prefix + "Range"];
  if (r === "custom") return (U[prefix + "From"] || "mwanzo") + " hadi " + (U[prefix + "To"] || "leo");
  return (RANGES.find((x) => x[0] === r) || ["", ""])[1];
}
function salesIn(prefix, includeDeleted) {
  const [a, b] = rangeBounds(U[prefix + "Range"], U[prefix + "From"], U[prefix + "To"]);
  return D.sales.filter((s) => s.createdAt >= a && s.createdAt < b && (includeDeleted || !s.deleted) && (isOwner() || s.userId === U.user.id))
    .sort((x, y) => y.createdAt - x.createdAt);
}
function pageSales() {
  const q = normName(U.salesQ);
  const list = salesIn("sales", U.showDeleted).filter((s) => !q || normName([s.no, s.customer, s.phone, s.userName, ...s.items.map((i) => i.name)].join(" ")).includes(q));
  const live = list.filter((s) => !s.deleted);
  const total = live.reduce((s, x) => s + x.total, 0);
  const by = (p) => live.filter((s) => s.pay === p).reduce((a, s) => a + s.total, 0);
  const groups = {};
  list.forEach((s) => { (groups[s.date] = groups[s.date] || []).push(s); });
  return `<div class="stats">
    <div class="stat g"><div class="l">${isOwner() ? "Mauzo" : "Mauzo yako"} · ${rangeLabel("sales")}</div><div class="v">${fmt(total)}</div></div>
    <div class="stat"><div class="l">Risiti</div><div class="v">${live.length}</div></div>
    <div class="stat"><div class="l">💵 Cash</div><div class="v">${fmt(by("Cash"))}</div></div>
    <div class="stat"><div class="l">📱 Simu/Benki</div><div class="v">${fmt(by("M-Pesa"))}</div></div>
    <div class="stat"><div class="l">📒 Mkopo</div><div class="v" style="color:var(--amber)">${fmt(by("Mkopo"))}</div></div>
  </div>
  <div class="panel">
    <div class="row" style="flex-wrap:wrap;margin-bottom:6px"><h2 style="margin:0">🧾 Mauzo</h2>
      <div class="filters" style="margin:0">
        ${isOwner() ? `<label class="switch"><input type="checkbox" ${U.showDeleted ? "checked" : ""} onchange="U.showDeleted=this.checked;render()"> Onyesha yaliyofutwa</label>` : ""}
        <button class="btn btn-g sm" onclick="printSales()">🖨️ Print orodha</button></div></div>
    ${rangePicker("sales")}
    <input id="salq" class="field" type="search" autocomplete="off" placeholder="🔍 Tafuta risiti, mteja, simu au spea..." value="${esc(U.salesQ)}" oninput="U.salesQ=this.value;soft()">
    ${list.length ? Object.keys(groups).sort().reverse().map((d) => `<div class="day">${dayLabel(d)} · ${fmt(groups[d].filter((s) => !s.deleted).reduce((a, s) => a + s.total, 0))}</div>${groups[d].map(saleCard).join("")}`).join("")
      : `<div class="empty">Hakuna mauzo kwenye kipindi hiki.</div>`}
  </div>`;
}
function saleCard(s) {
  const open = U.openSale === s.id;
  return `<div class="sale" style="${s.deleted ? "opacity:.55" : ""}">
    <div class="sale-h" onclick="U.openSale=U.openSale==='${s.id}'?null:'${s.id}';render()">
      <div><b>${esc(s.no)}</b> · ${timeStr(s.createdAt)} ${s.customer ? "· " + esc(s.customer) : ""} ${s.deleted ? '<span class="badge">IMEFUTWA</span>' : ""}
        <div class="m">${esc(s.userName)} · ${s.mode === "jumla" ? "Jumla" : "Rejareja"} · ${s.pay === "M-Pesa" ? "Simu/Benki" : s.pay} · ${storeLabel(s.store)} · spea ${s.items.reduce((a, i) => a + i.qty, 0)}</div></div>
      <b>${fmt(s.total)}</b></div>
    ${open ? `<div class="sale-b">
      <div class="tbl-wrap"><table><thead><tr><th>Spea</th><th class="r">Idadi</th><th class="r">Bei</th><th class="r">Jumla</th>${isOwner() ? '<th class="r">Faida</th>' : ""}</tr></thead><tbody>
      ${s.items.map((i) => `<tr><td>${esc(i.name)}${i.price !== i.listPrice ? ` <span class="badge am">bei ${num(i.listPrice)}→${num(i.price)}</span>` : ""}</td><td class="r">${i.qty}</td><td class="r">${num(i.price)}</td><td class="r">${num(i.lineTotal)}</td>
        ${isOwner() ? `<td class="r" style="color:${i.buy != null && i.price < i.buy ? "var(--red)" : "var(--teal)"}">${i.buy != null ? num((i.price - i.buy) * i.qty) : "—"}</td>` : ""}</tr>`).join("")}
      </tbody></table></div>
      ${s.phone ? `<div class="hint">📞 ${esc(s.phone)}</div>` : ""}
      ${s.deleted ? `<div class="hint" style="color:var(--red)">Imefutwa na ${esc(s.deletedBy || "")} · ${s.deletedAt ? dateTimeStr(s.deletedAt) : ""}</div>` : ""}
      <div class="filters" style="margin:10px 0 0">
        <button class="btn btn-g sm" onclick="U.receipt=D.sales.find(x=>x.id==='${s.id}');render()">🧾 Risiti / Print</button>
        ${isOwner() && !s.deleted ? `<button class="btn btn-g sm" style="color:var(--red)" onclick="deleteSale('${s.id}')">🗑️ Futa</button>` : ""}
      </div></div>` : ""}
  </div>`;
}
function deleteSale(id) {
  const s = D.sales.find((x) => x.id === id); if (!s) return;
  if (!confirm(`Futa mauzo ${s.no} (${fmt(s.total)})?\n\nStock HAITARUDI — spea zinabaki zimeuzwa.${s.pay === "Mkopo" ? "\n\n📒 Hii ilikuwa ya mkopo: deni la " + s.customer + " kwenye Debtors halibadiliki — lirekebishe kule kama inahitajika." : ""}`)) return;
  colRef.doc(SALE_PREFIX + id).set({ deleted: true, deletedAt: Date.now(), deletedBy: U.user.name }, { merge: true })
    .then(() => toast("Mauzo yamefutwa")).catch(() => toast("⚠️ Imeshindikana kufuta"));
  logActivity("Amefuta mauzo", `${s.no} · ${fmt(s.total)}${s.customer ? " · " + s.customer : ""}`);
  U.openSale = null;
}
function printSales() {
  const list = salesIn("sales", false);
  U.printList = {
    title: "Mauzo — " + rangeLabel("sales"),
    sub: "Imechapishwa " + dateTimeStr(Date.now()) + " na " + U.user.name + (isOwner() ? "" : " (mauzo yake tu)"),
    head: ["Tarehe", "Risiti", "Mteja", "Muuzaji", "Aina", "Malipo", "Spea", "Jumla"],
    rows: list.slice().reverse().map((s) => [dateTimeStr(s.createdAt), s.no, s.customer || "—", s.userName, s.mode === "jumla" ? "Jumla" : "Rejareja", s.pay === "M-Pesa" ? "Simu/Benki" : s.pay, s.items.map((i) => i.name + " ×" + i.qty).join(", "), num(s.total)]),
    foot: "JUMLA: " + fmt(list.reduce((a, s) => a + s.total, 0)) + " · Risiti " + list.length,
  };
  render();
}

/* =====================================================================
   📊 RIPOTI — owner only
   ===================================================================== */
function pageReport() {
  const list = salesIn("rep", false);
  const rev = list.reduce((a, s) => a + s.total, 0);
  let cost = 0, unknown = 0, units = 0;
  const byItem = {}, bySeller = {}, byPay = {}, byMode = { rejareja: 0, jumla: 0 }, byDay = {};
  list.forEach((s) => {
    bySeller[s.userName] = (bySeller[s.userName] || 0) + s.total;
    byPay[s.pay] = (byPay[s.pay] || 0) + s.total;
    byMode[s.mode] = (byMode[s.mode] || 0) + s.total;
    const dd = byDay[s.date] || (byDay[s.date] = { rev: 0, cost: 0, n: 0 }); dd.rev += s.total; dd.n++;
    s.items.forEach((i) => {
      units += i.qty;
      const b = i.buy != null ? i.buy : (itemById(i.itemId) || {}).buy;
      if (b != null) { cost += b * i.qty; dd.cost += b * i.qty; } else unknown++;
      const x = byItem[i.name] || (byItem[i.name] = { qty: 0, rev: 0, profit: 0 });
      x.qty += i.qty; x.rev += i.lineTotal; x.profit += b != null ? (i.price - b) * i.qty : 0;
    });
  });
  const profit = rev - cost;
  const [ra, rb] = rangeBounds(U.repRange, U.repFrom, U.repTo);
  const exps = D.expenses.filter((x) => !x.deleted && x.createdAt >= ra && x.createdAt < rb);
  const expTotal = exps.reduce((a, x) => a + x.amount, 0);
  const expByCat = {};
  exps.forEach((x) => { expByCat[x.category] = (expByCat[x.category] || 0) + x.amount; });
  const collected = D.payments.filter((x) => x.createdAt >= ra && x.createdAt < rb).reduce((a, x) => a + x.amount, 0);
  const net = profit - expTotal;
  const top = Object.entries(byItem).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  const lowItems = V.items.filter((i) => i.qty > 0 && i.qty <= i.low).slice(0, 12);
  const tblKV = (o, f) => Object.entries(o).filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(f ? f(k) : k)}</td><td class="r"><b>${fmt(v)}</b></td><td class="r" style="color:var(--mute)">${rev ? Math.round((v / rev) * 100) : 0}%</td></tr>`).join("") || `<tr><td class="empty">—</td></tr>`;
  return `<div class="panel" style="margin-bottom:14px"><div class="row" style="flex-wrap:wrap"><h2 style="margin:0">📊 Ripoti · ${rangeLabel("rep")}</h2>
    <button class="btn btn-g sm" onclick="printReport()">🖨️ Print ripoti</button></div>${rangePicker("rep")}</div>
  <div class="stats">
    <div class="stat"><div class="l">Mauzo</div><div class="v">${fmt(rev)}</div></div>
    <div class="stat"><div class="l">Gharama ya spea zilizouzwa</div><div class="v">${fmt(cost)}</div></div>
    <div class="stat ${profit >= 0 ? "g" : "r"}"><div class="l">${profit >= 0 ? "Faida" : "Hasara"}</div><div class="v">${fmt(Math.abs(profit))}</div></div>
    <div class="stat r"><div class="l">💸 Matumizi</div><div class="v">${fmt(expTotal)}</div></div>
    <div class="stat ${net >= 0 ? "g" : "r"}"><div class="l">${net >= 0 ? "✅ Faida halisi" : "❌ Hasara halisi"} (faida − matumizi)</div><div class="v">${fmt(Math.abs(net))}</div></div>
    <div class="stat"><div class="l">📒 Madeni yaliyolipwa</div><div class="v">${fmt(collected)}</div></div>
    <div class="stat"><div class="l">Asilimia ya faida</div><div class="v">${rev ? Math.round((profit / rev) * 100) : 0}%</div></div>
    <div class="stat"><div class="l">Risiti · Spea zilizouzwa</div><div class="v">${list.length} · ${units}</div></div>
  </div>
  ${unknown ? `<div class="note">⚠️ Spea ${unknown} zilizouzwa hazina bei ya kununua, kwa hiyo faida yake haijahesabiwa. Weka bei ya kununua kwenye system ya kwanza (Pokea Mzigo au Products).</div>` : ""}
  <div class="split">
    <div class="panel"><h3>🏆 Spea zinazouzika zaidi</h3><div class="tbl-wrap"><table><thead><tr><th>Spea</th><th class="r">Idadi</th><th class="r">Mauzo</th><th class="r">Faida</th></tr></thead><tbody>
      ${top.map(([n, x]) => `<tr><td>${esc(n)}</td><td class="r">${x.qty}</td><td class="r">${num(x.rev)}</td><td class="r" style="color:${x.profit >= 0 ? "var(--teal)" : "var(--red)"};font-weight:700">${num(x.profit)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Hakuna mauzo</td></tr>`}
    </tbody></table></div></div>
    <div class="panel"><h3>🧑‍💼 Kwa kila muuzaji</h3><table><tbody>${tblKV(bySeller)}</tbody></table>
      <h3 style="margin-top:14px">💳 Njia ya malipo</h3><table><tbody>${tblKV(byPay, (k) => (k === "M-Pesa" ? "Simu/Benki" : k))}</tbody></table>
      <h3 style="margin-top:14px">🏷️ Rejareja / Jumla</h3><table><tbody>${tblKV(byMode, (k) => (k === "jumla" ? "Jumla" : "Rejareja"))}</tbody></table>
      <h3 style="margin-top:14px">💸 Matumizi kwa aina</h3><table><tbody>${Object.entries(expByCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r"><b>${fmt(v)}</b></td></tr>`).join("") || `<tr><td class="empty">—</td></tr>`}</tbody></table></div>
  </div>
  <div class="split" style="margin-top:14px">
    <div class="panel"><h3>📅 Kila siku</h3><div class="tbl-wrap"><table><thead><tr><th>Tarehe</th><th class="r">Risiti</th><th class="r">Mauzo</th><th class="r">Faida</th></tr></thead><tbody>
      ${Object.keys(byDay).sort().reverse().map((d) => `<tr><td>${dayLabel(d)}</td><td class="r">${byDay[d].n}</td><td class="r">${num(byDay[d].rev)}</td><td class="r" style="color:var(--teal);font-weight:700">${num(byDay[d].rev - byDay[d].cost)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">—</td></tr>`}
    </tbody></table></div></div>
    <div class="panel"><h3>⚠️ Spea zinazokaribia kuisha</h3><table><tbody>
      ${lowItems.map((i) => `<tr><td>${esc(i.name)} <span style="color:var(--mute);font-size:11.5px">${storeLabel(i.store)}</span></td><td class="r"><span class="badge am">${i.qty}</span></td></tr>`).join("") || `<tr><td class="empty">Hakuna — stock iko vizuri 👍</td></tr>`}
    </tbody></table></div>
  </div>`;
}
function printReport() {
  const list = salesIn("rep", false);
  const rev = list.reduce((a, s) => a + s.total, 0);
  const cost = list.reduce((a, s) => a + s.items.reduce((c, i) => { const b = i.buy != null ? i.buy : (itemById(i.itemId) || {}).buy; return c + (b != null ? b * i.qty : 0); }, 0), 0);
  const byItem = {};
  list.forEach((s) => s.items.forEach((i) => { const x = byItem[i.name] || (byItem[i.name] = { qty: 0, rev: 0 }); x.qty += i.qty; x.rev += i.lineTotal; }));
  U.printList = {
    title: "Ripoti ya Mauzo — " + rangeLabel("rep"),
    sub: "Imechapishwa " + dateTimeStr(Date.now()) + " · Mauzo " + fmt(rev) + " · Gharama " + fmt(cost) + " · Faida " + fmt(rev - cost),
    head: ["Spea", "Idadi", "Mauzo"],
    rows: Object.entries(byItem).sort((a, b) => b[1].rev - a[1].rev).map(([n, x]) => [n, x.qty, num(x.rev)]),
    foot: "Risiti " + list.length + " · JUMLA " + fmt(rev),
  };
  render();
}

/* =====================================================================
   👥 WATUMIAJI + activity log — owner only
   ===================================================================== */
function pageUsers() {
  const cfg = posCfg();
  const act = cfg.activity.slice().sort((a, b) => b.t - a.t).slice(0, 250);
  return `<div class="panel">
    <div class="row"><h2 style="margin:0">👥 Watumiaji (${cfg.users.length})</h2>
      <button class="btn btn-p sm" onclick="U.userForm={id:null,name:'',role:'seller',pin:''};render()">➕ Ongeza muuzaji</button></div>
    <div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Jina</th><th>Nafasi</th><th>Hali</th><th>Mauzo yake (leo)</th><th></th></tr></thead><tbody>
    ${cfg.users.map((u) => {
      const today = D.sales.filter((s) => !s.deleted && s.userId === u.id && s.date === todayStr()).reduce((a, s) => a + s.total, 0);
      return `<tr><td>${u.role === "owner" ? "👑" : "🧑‍💼"} <b>${esc(u.name)}</b>${u.id === U.user.id ? ' <span class="badge ok">wewe</span>' : ""}</td>
        <td>${u.role === "owner" ? "Mmiliki" : "Muuzaji"}</td>
        <td>${u.active === false ? '<span class="badge">amezimwa</span>' : '<span class="badge ok">anatumia</span>'}</td>
        <td>${fmt(today)}</td>
        <td class="r" style="white-space:nowrap"><button class="btn btn-g sm" onclick="U.userForm={id:'${u.id}',name:${esc(JSON.stringify(u.name))},role:'${u.role}',pin:''};render()">✏️</button>
          ${u.id !== U.user.id ? `<button class="btn btn-g sm" onclick="toggleUser('${u.id}')">${u.active === false ? "✅ Washa" : "⛔ Zima"}</button>` : ""}</td></tr>`;
    }).join("")}
    </tbody></table></div>
    <p class="hint">👑 Mmiliki anaona kila kitu. 🧑‍💼 Muuzaji anauza, anaona stock na mauzo yake tu (haoni bei ya kununua, faida wala ripoti). Ukimzima muuzaji, hawezi kuingia tena, lakini mauzo yake yanabaki.</p>
  </div>
  <div class="panel"><h2>📜 Kumbukumbu za shughuli (Activity)</h2>
    ${act.length ? act.map((a) => `<div class="act"><span class="tm">${dateTimeStr(a.t)}</span><span><b>${esc(a.user)}</b> — ${esc(a.action)}${a.detail ? `: <span style="color:var(--mute)">${esc(a.detail)}</span>` : ""}</span></div>`).join("") : `<div class="empty">Bado hakuna shughuli.</div>`}
  </div>`;
}
function userFormModal() {
  const f = U.userForm;
  const editing = !!f.id;
  return `<div class="ov"><div class="modal">
    <h2>${editing ? "✏️ Badilisha mtumiaji" : "➕ Ongeza muuzaji"}</h2>
    <label class="l">Jina</label>
    <input id="uf-name" class="field" value="${esc(f.name)}" oninput="U.userForm.name=this.value">
    <label class="l">Nafasi</label>
    <div class="mode"><button class="${f.role === "seller" ? "on" : ""}" onclick="U.userForm.role='seller';render()">🧑‍💼 Muuzaji</button><button class="${f.role === "owner" ? "on" : ""}" onclick="U.userForm.role='owner';render()">👑 Mmiliki</button></div>
    <label class="l">${editing ? "PIN mpya (acha wazi usibadilishe)" : "PIN (namba 4–6)"}</label>
    <input id="uf-pin" class="field" type="password" inputmode="numeric" maxlength="6" value="${esc(f.pin)}" oninput="U.userForm.pin=this.value.replace(/\\D/g,'')">
    ${f.msg ? `<div class="err">${esc(f.msg)}</div>` : ""}
    <div class="ov-actions"><button class="btn btn-g" onclick="U.userForm=null;render()">Ghairi</button><button class="btn btn-p" onclick="saveUser()">💾 Hifadhi</button></div>
  </div></div>`;
}
async function saveUser() {
  const f = U.userForm;
  const users = posCfg().users.map((u) => ({ ...u }));
  if (!f.name.trim()) { f.msg = "Andika jina."; return render(); }
  if (users.some((u) => u.id !== f.id && normName(u.name) === normName(f.name))) { f.msg = "Jina hili tayari lipo."; return render(); }
  if ((!f.id || f.pin) && (f.pin.length < 4)) { f.msg = "PIN iwe na namba 4 hadi 6."; return render(); }
  if (f.id) {
    const u = users.find((x) => x.id === f.id);
    if (u.role === "owner" && f.role !== "owner" && users.filter((x) => x.role === "owner" && x.active !== false).length < 2) { f.msg = "Lazima abaki angalau mmiliki mmoja."; return render(); }
    u.name = f.name.trim(); u.role = f.role;
    if (f.pin) u.pinHash = await hashPin(u.id, f.pin);
    logActivity("Amebadilisha mtumiaji", u.name + (f.pin ? " (PIN mpya)" : ""));
  } else {
    const activeN = users.filter((u) => u.active !== false).length;
    if (activeN >= ed().users) { f.msg = ed().name + " inaruhusu watumiaji " + ed().users + " tu. Ili kuongeza zaidi, pandisha edition (wasiliana na E.E.Msango)."; return render(); }
    const id = uid();
    users.push({ id, name: f.name.trim(), role: f.role, pinHash: await hashPin(id, f.pin), active: true, createdAt: Date.now() });
    logActivity("Ameongeza mtumiaji", f.name.trim() + " (" + (f.role === "owner" ? "mmiliki" : "muuzaji") + ")");
  }
  savePos({ users }).then(() => toast("✅ Imehifadhiwa")).catch(() => toast("⚠️ Imeshindikana kuhifadhi"));
  U.userForm = null; render();
}
function toggleUser(id) {
  const users = posCfg().users.map((u) => ({ ...u }));
  const u = users.find((x) => x.id === id); if (!u) return;
  if (u.active !== false && u.role === "owner" && users.filter((x) => x.role === "owner" && x.active !== false).length < 2) return toast("Lazima abaki angalau mmiliki mmoja.");
  if (!confirm(u.active === false ? `Mwashe ${u.name} aweze kuingia tena?` : `Mzime ${u.name}? Hataweza kuingia tena (mauzo yake yanabaki).`)) return;
  u.active = u.active === false;
  savePos({ users });
  logActivity(u.active ? "Amemwasha mtumiaji" : "Amemzima mtumiaji", u.name);
}

/* =====================================================================
   ⚙️ MIPANGILIO — receipt details, default store, permissions
   ===================================================================== */
function pageSettings() {
  const cfg = posCfg(), sh = cfg.shop;
  const field = (k, label, ph) => `<label class="l">${label}</label><input id="sh-${k}" class="field" value="${esc(sh[k] || "")}" placeholder="${ph || ""}" onchange="saveShop('${k}',this.value)">`;
  return `<div class="split">
  <div class="panel"><h2>🧾 Maelezo ya risiti</h2>
    ${field("name", "Jina la biashara")}${field("line", "Maelezo (chini ya jina)")}${field("tin", "TIN Number")}
    ${field("phone", "Namba ya simu", "mf. 0754 000 000")}${field("address", "Mahali / Sanduku la posta", "mf. Mwanza")}${field("footer", "Ujumbe wa chini ya risiti")}
    <p class="hint">Logo inatoka kwenye system ya kwanza (Settings → Logo). Mabadiliko yanahifadhiwa yenyewe.</p>
  </div>
  <div>
    <div class="panel"><h2>🏪 Mauzo</h2>
      <label class="l">Store ya kuuzia (kwa wauzaji)</label>
      <div class="mode">${(ed().stores ? ["dukani", "godown"] : ["dukani"]).map((s) => `<button class="${cfg.defaultStore === s ? "on" : ""}" onclick="savePos({defaultStore:'${s}'});logActivity('Amebadilisha store ya kuuzia','${storeLabel(s)}')">${s === "godown" ? "🏭 Godown" : "🏪 Dukani"}</button>`).join("")}</div>
      <label class="switch" style="margin-top:10px"><input type="checkbox" ${cfg.allowPriceEdit ? "checked" : ""} onchange="savePos({allowPriceEdit:this.checked});logActivity('Ruhusa ya wauzaji kubadilisha bei', this.checked?'imewashwa':'imezimwa')"> Wauzaji wanaruhusiwa kubadilisha bei kwenye kikapu</label>
      <p class="hint">Kila bei inayobadilishwa inaandikwa kwenye risiti na kwenye 📜 Kumbukumbu, pamoja na jina la muuzaji.</p>
    </div>
    ${securityPanel()}
    <div class="panel"><h2>📱 Weka kama App</h2>
      <p style="font-size:13px;margin:0 0 6px"><b>iPhone (Safari):</b> bonyeza kitufe cha Share (□↑), kisha <b>Add to Home Screen</b>.</p>
      <p style="font-size:13px;margin:0 0 6px"><b>Android (Chrome):</b> bonyeza ⋮, kisha <b>Install app</b> au <b>Add to Home screen</b>.</p>
      <p style="font-size:13px;margin:0"><b>Computer (Chrome/Edge):</b> bonyeza alama ya ⊕ kwenye sehemu ya link juu kulia, kisha <b>Install</b>.</p>
    </div>
    <div class="panel"><h2>ℹ️ Mfumo</h2>
      <table><tbody>
        <tr><td>Version</td><td class="r"><b>${APP_VERSION}</b></td></tr>
        <tr><td>Database</td><td class="r">${esc(firebaseConfig.projectId)}</td></tr>
        <tr><td>Spea kwenye stock (zote)</td><td class="r">${V.items.length}</td></tr>
        <tr><td>Risiti zote</td><td class="r">${D.sales.length}</td></tr>
        <tr><td>Hali ya mtandao</td><td class="r">${D.sync && D.sync.fromCache ? "🔴 Offline" : "🟢 Live"}</td></tr>
      </tbody></table>
    </div>
  </div></div>`;
}
function saveShop(k, v) {
  savePos({ shop: { [k]: v.trim() } }).then(() => toast("✅ Imehifadhiwa"));
  logActivity("Amebadilisha maelezo ya risiti", k);
}

/* =====================================================================
   RECEIPT + PRINTABLE LISTS
   ===================================================================== */
function receiptModal(r) {
  const sh = posCfg().shop;
  const change = r.pay === "Cash" ? (r.paid || r.total) - r.total : 0;
  return `<div class="ov"><div style="width:100%;max-width:340px">
  <div class="rcpt print-area">
    <div class="lg">${logoHtml()}</div>
    <h3>${esc(sh.name)}</h3>
    <div class="c" style="font-weight:700">${esc(sh.line)}</div>
    ${sh.tin ? `<div class="c">TIN: ${esc(sh.tin)}</div>` : ""}
    ${sh.phone ? `<div class="c">Simu: ${esc(sh.phone)}</div>` : ""}
    ${sh.address ? `<div class="c">${esc(sh.address)}</div>` : ""}
    <div class="dl"></div>
    <div class="rr"><span>Risiti: <b>${esc(r.no)}</b></span><span>${dateTimeStr(r.createdAt)}</span></div>
    <div class="rr"><span>Muuzaji: ${esc(r.userName)}</span><span>${r.mode === "jumla" ? "JUMLA" : "REJAREJA"}</span></div>
    ${r.customer ? `<div class="rr"><span>Mteja: ${esc(r.customer)}</span><span>${esc(r.phone || "")}</span></div>` : ""}
    <div class="dl"></div>
    ${r.items.map((i) => `<div>${esc(i.name)}</div><div class="rr"><span>&nbsp;${i.qty} × ${num(i.price)}</span><span>${num(i.lineTotal)}</span></div>`).join("")}
    <div class="dl"></div>
    <div class="rr" style="font-weight:800;font-size:14px"><span>JUMLA</span><span>${fmt(r.total)}</span></div>
    <div class="rr"><span>Malipo</span><span>${r.pay === "M-Pesa" ? "Simu/Benki" : esc(r.pay)}</span></div>
    ${r.pay === "Cash" ? `<div class="rr"><span>Ametoa</span><span>${fmt(r.paid)}</span></div><div class="rr"><span>Chenji</span><span>${fmt(change)}</span></div>` : ""}
    ${r.pay === "Mkopo" ? `<div class="c" style="margin-top:4px">*** MKOPO — imeandikwa kwenye deni ***</div>` : ""}
    ${r.deleted ? `<div class="c" style="color:#c00;font-weight:800;margin-top:4px">*** IMEFUTWA ***</div>` : ""}
    <div class="dl"></div><div class="c">${esc(sh.footer)}</div>
  </div>
  <div class="ov-actions no-print"><button class="btn btn-g" onclick="U.receipt=null;render()">Funga</button>
    ${has("whatsapp") ? `<button class="btn btn-a" onclick="sendWhatsApp(U.receipt.phone, saleText(U.receipt))">📲 WhatsApp</button>` : ""}
    <button class="btn btn-p" onclick="window.print()">🖨️ Print</button></div></div></div>`;
}
function printListModal() {
  const p = U.printList, sh = posCfg().shop;
  return `<div class="ov"><div style="width:100%;max-width:780px">
  <div class="rcpt wide print-area">
    <div class="lg">${logoHtml()}</div>
    <h3>${esc(sh.name)}</h3><div class="c">${esc(sh.line)}${sh.tin ? " · TIN " + esc(sh.tin) : ""}</div>
    <div class="dl"></div>
    <h3 style="text-align:left">${esc(p.title)}</h3><div style="font-size:11.5px;color:#555;margin-bottom:8px">${esc(p.sub)}</div>
    <table><thead><tr>${p.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${p.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") || `<tr><td>Hakuna data</td></tr>`}</tbody></table>
    ${p.foot ? `<div style="font-weight:800;margin-top:10px">${esc(p.foot)}</div>` : ""}
  </div>
  <div class="ov-actions no-print"><button class="btn btn-g" onclick="U.printList=null;render()">Funga</button><button class="btn btn-p" onclick="window.print()">🖨️ Print</button></div></div></div>`;
}

/* =====================================================================
   START
   ===================================================================== */
let _started = false;
DUKA_HOOK.rerender = () => render();
DUKA_HOOK.titleSuffix = " — POS";
loadPreBrand();
DUKA_HOOK.pri = "btn btn-p"; DUKA_HOOK.ghost = "btn btn-g";
auth.onAuthStateChanged(async (u) => {
  if (!u) {
    D.loaded = true; D.needDeviceLogin = true; render(); return;
    auth.signInAnonymously().catch(() => { D.loaded = true; D.err = "Imeshindikana kuunganisha na cloud. Angalia mtandao wako."; render(); });
    return;
  }
  if (_started) return;
  _started = true;
  await resolveShop(u);                         // 🏪 which shop is this device for? (duka.js)
  if (shopBlocked()) { D.loaded = true; D.blocked = true; render(); return; }
  if (adminHome()) { D.loaded = true; D.adminHome = true; render(); return; }
  colRef = dataCollection();
  if (SHOP) POS_DEFAULTS.shop = { name: SHOP.name, line: (SHOP.brand && SHOP.brand.tagline) || "", tin: "", phone: SHOP.phone || "", address: SHOP.location || "", footer: "Asante kwa kununua! Karibu tena 🙏" };
  startListening();
});
// keep the session across a page refresh on this device (still needs PIN after closing the app)
const _restore = setInterval(() => {
  if (!D.loaded) return;
  clearInterval(_restore);
  try {
    const id = sessionStorage.getItem("pos_session");
    const u = id && posCfg().users.find((x) => x.id === id && x.active !== false);
    if (u && !U.user) { U.user = u; render(); }
  } catch (e) {}
}, 200);

/* =====================================================================
   v1.1 — Funga Siku · Madeni · Matumizi · WhatsApp · Dark mode · Ulinzi
   ===================================================================== */
Object.assign(U, {
  payFor: null, payReceipt: null, debtQ: "", payRange: "today", payFrom: "", payTo: "",
  expForm: { category: "Usafiri", amount: "", via: "Cash", note: "", date: "" }, expRange: "today", expFrom: "", expTo: "",
  closeForm: { date: "", scope: "", opening: "", counted: "", note: "" }, closeRange: "week", closeFrom: "", closeTo: "",
});
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("ee_theme", next); } catch (e) {}
  render();
}
function toggleFull() {
  const d = document, el = d.documentElement;
  const inFs = d.fullscreenElement || d.webkitFullscreenElement;
  if (inFs) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast("Skrini nzima haiwezekani kwenye kifaa hiki"));
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else toast("Kwenye iPhone: weka kama app (Add to Home Screen) ili ijae skrini");
}
async function nextNo(field, prefix) {
  try {
    const n = await withTimeout(db.runTransaction(async (tx) => {
      const s = await tx.get(colRef.doc(POS_DOC));
      const c = ((s.exists && s.data()[field]) || 0) + 1;
      tx.set(colRef.doc(POS_DOC), { [field]: c }, { merge: true });
      return c;
    }), 5000);
    return prefix + String(n).padStart(5, "0");
  } catch (e) {
    const d = new Date();
    return prefix + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
}

/* ---------- 📲 WhatsApp ---------- */
function waNumber(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = "255" + d.slice(1);
  else if (d.length === 9 && /^[67]/.test(d)) d = "255" + d;
  return d;
}
function sendWhatsApp(phone, text) {
  const n = waNumber(phone);
  window.open("https://wa.me/" + n + "?text=" + encodeURIComponent(text), "_blank");
  logActivity("Ametuma risiti WhatsApp", n || "(amechagua namba)");
}
function shopHeaderText() {
  const sh = posCfg().shop;
  return `*${sh.name}*\n${sh.line}${sh.tin ? "\nTIN: " + sh.tin : ""}${sh.phone ? "\nSimu: " + sh.phone : ""}`;
}
function saleText(r) {
  return `${shopHeaderText()}\n\n🧾 Risiti: *${r.no}*\n📅 ${dateTimeStr(r.createdAt)}\n${r.customer ? "👤 " + r.customer + "\n" : ""}\n` +
    r.items.map((i) => `• ${i.name}\n   ${i.qty} × ${num(i.price)} = ${num(i.lineTotal)}`).join("\n") +
    `\n\n*JUMLA: ${fmt(r.total)}*\nMalipo: ${r.pay === "M-Pesa" ? "Simu/Benki" : r.pay}${r.pay === "Mkopo" ? " (deni)" : ""}\n\n${posCfg().shop.footer}`;
}

/* =====================================================================
   📒 MADENI — customers pay their debt here (goes straight into Debtors)
   ===================================================================== */
const chargesOf = (e) => (e.charges ? e.charges : [{ amount: e.amount || 0 }]);
const debtBalance = (e) => chargesOf(e).reduce((a, c) => a + (Number(c.amount) || 0), 0) - (e.payments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
function pageDebts() {
  const q = normName(U.debtQ);
  const debtors = D.entries.filter((e) => e.kind === "owed_to_me" && !e.archived)
    .map((e) => ({ e, bal: debtBalance(e) })).filter((x) => x.bal > 0 && (!q || normName(x.e.name + " " + (x.e.phone || "")).includes(q)))
    .sort((a, b) => b.bal - a.bal);
  const totalOwed = debtors.reduce((a, x) => a + x.bal, 0);
  const [a, b] = rangeBounds(U.payRange, U.payFrom, U.payTo);
  const pays = D.payments.filter((p) => p.createdAt >= a && p.createdAt < b && (isOwner() || p.userId === U.user.id)).sort((x, y) => y.createdAt - x.createdAt);
  return `<div class="stats">
    <div class="stat"><div class="l">Wanaodaiwa</div><div class="v">${debtors.length}</div></div>
    <div class="stat" style=""><div class="l">Jumla ya madeni</div><div class="v" style="color:var(--amber)">${fmt(totalOwed)}</div></div>
    <div class="stat g"><div class="l">Yaliyolipwa · ${rangeLabel("pay")}</div><div class="v">${fmt(pays.reduce((s, p) => s + p.amount, 0))}</div></div>
  </div>
  <div class="split">
    <div class="panel"><h2>📒 Wateja wanaodaiwa</h2>
      <input id="debtq" class="field" type="search" autocomplete="off" placeholder="🔍 Tafuta mteja au simu..." value="${esc(U.debtQ)}" oninput="U.debtQ=this.value;soft()" style="margin-bottom:10px">
      ${debtors.length ? debtors.map(({ e, bal }) => `<button class="debtor" onclick="U.payFor={id:'${e.id}',amount:'',via:'Cash',note:''};render()">
        <span><b>${esc(e.name)}</b><br><span style="font-size:11.5px;color:var(--mute)">${esc(e.phone || "hakuna simu")} · tangu ${esc(e.dateCreated || "")}</span></span>
        <span style="text-align:right"><b style="color:var(--amber)">${fmt(bal)}</b><br><span style="font-size:11.5px;color:var(--teal);font-weight:700">Pokea malipo →</span></span></button>`).join("")
        : `<div class="empty">${q ? "Hakuna anayelingana." : "Hakuna anayedaiwa 👍"}</div>`}
      <p class="hint">Haya ni madeni yale yale ya <b>Debtors</b> kwenye system ya kwanza. Malipo unayopokea hapa yanaingia kule papo hapo.</p>
    </div>
    <div class="panel"><h2>💵 Malipo yaliyopokelewa</h2>${rangePicker("pay")}
      ${pays.length ? `<div class="tbl-wrap"><table><thead><tr><th>Tarehe</th><th>Mteja</th><th>Njia</th><th class="r">Kiasi</th><th></th></tr></thead><tbody>
      ${pays.map((p) => `<tr><td>${dateTimeStr(p.createdAt)}<div style="font-size:11px;color:var(--mute)">${esc(p.no)} · ${esc(p.userName)}</div></td><td>${esc(p.customer)}</td><td>${p.via === "Cash" ? "💵 Cash" : "📱 Simu/Benki"}</td>
        <td class="r"><b>${fmt(p.amount)}</b></td><td class="r"><button class="btn btn-g sm" onclick="U.payReceipt=D.payments.find(x=>x.id==='${p.id}');render()">🧾</button></td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty">Hakuna malipo kwenye kipindi hiki.</div>`}
    </div>
  </div>`;
}
function payModal() {
  const f = U.payFor, e = D.entries.find((x) => x.id === f.id);
  if (!e) { U.payFor = null; return ""; }
  const bal = debtBalance(e);
  const lastCharges = chargesOf(e).slice(-4).reverse();
  return `<div class="ov"><div class="modal">
    <h2>💵 Pokea malipo — ${esc(e.name)}</h2>
    <div class="note" style="justify-content:space-between"><span>Deni la sasa</span><b style="font-size:18px">${fmt(bal)}</b></div>
    ${lastCharges.length && lastCharges[0].date ? `<div style="font-size:12px;color:var(--mute);margin-bottom:6px">Madeni ya karibuni: ${lastCharges.map((c) => `${esc(c.date || "")} ${num(c.amount)}`).join(" · ")}</div>` : ""}
    <label class="l">Kiasi anacholipa</label>
    <input id="pf-amt" class="field" inputmode="numeric" value="${esc(f.amount)}" oninput="this.value=this.value.replace(/[^0-9]/g,'');U.payFor.amount=this.value;setText('pf-after',fmt(${bal}-(Number(this.value)||0)))">
    <div class="filters" style="margin-top:6px"><button class="chip" onclick="U.payFor.amount='${bal}';render()">Lipa deni lote (${num(bal)})</button></div>
    <div class="row" style="margin-top:4px"><span>Deni litakalobaki</span><b id="pf-after">${fmt(bal - (Number(f.amount) || 0))}</b></div>
    <label class="l">Njia ya malipo</label>
    <div class="pay">${["Cash", "Simu/Benki"].map((m) => `<button class="${f.via === m ? "on" : ""}" onclick="U.payFor.via='${m}';render()">${m === "Cash" ? "💵" : "📱"} ${m}</button>`).join("")}</div>
    <label class="l">Maelezo (hiari)</label>
    <input id="pf-note" class="field" value="${esc(f.note)}" oninput="U.payFor.note=this.value" placeholder="mf. M-Pesa ref QXY123">
    ${f.msg ? `<div class="err">${esc(f.msg)}</div>` : ""}
    <div class="ov-actions"><button class="btn btn-g" onclick="U.payFor=null;render()">Ghairi</button><button class="btn btn-p" onclick="receivePayment()" ${f.busy ? "disabled" : ""}>${f.busy ? "Inahifadhi..." : "✅ Pokea"}</button></div>
  </div></div>`;
}
async function receivePayment() {
  const f = U.payFor, e = D.entries.find((x) => x.id === f.id);
  if (!e || f.busy) return;
  const amt = Number(f.amount) || 0, bal = debtBalance(e);
  if (amt <= 0) { f.msg = "Andika kiasi."; return render(); }
  if (amt > bal && !confirm(`Kiasi (${fmt(amt)}) ni zaidi ya deni (${fmt(bal)}). Endelea?`)) return;
  f.busy = true; render();
  const now = Date.now(), date = dayStr(now);
  const no = await nextNo("payCounter", "M");
  const via = f.via === "Cash" ? "Cash" : "Simu/Benki";
  try {
    await txUpdateShared("entries", (list) => {
      const x = list.find((y) => y.id === e.id);
      if (!x) throw new Error("Mteja hayupo tena kwenye Debtors");
      x.payments = [...(x.payments || []), { amount: amt, date, via, note: f.note.trim(), by: U.user.name, ref: no }].sort((p, q) => (p.date < q.date ? -1 : 1));
      return list;
    });
  } catch (err) { f.busy = false; f.msg = "⚠️ Imeshindikana: " + (err.message || "angalia mtandao"); return render(); }
  const rec = clean({ id: uid(), no, createdAt: now, date, entryId: e.id, customer: e.name, phone: e.phone || "", amount: amt, via, note: f.note.trim(),
    balanceBefore: bal, balanceAfter: bal - amt, userId: U.user.id, userName: U.user.name });
  colRef.doc(PAY_PREFIX + rec.id).set(rec);
  logActivity("Amepokea malipo ya deni", `${no} · ${e.name} · ${fmt(amt)} (${via})`);
  U.payFor = null; U.payReceipt = rec; render();
}
function payReceiptModal(r) {
  const sh = posCfg().shop;
  return `<div class="ov"><div style="width:100%;max-width:340px">
  <div class="rcpt print-area">
    <div class="lg">${logoHtml()}</div>
    <h3>${esc(sh.name)}</h3><div class="c" style="font-weight:700">${esc(sh.line)}</div>
    ${sh.tin ? `<div class="c">TIN: ${esc(sh.tin)}</div>` : ""}${sh.phone ? `<div class="c">Simu: ${esc(sh.phone)}</div>` : ""}
    <div class="dl"></div>
    <div class="c" style="font-weight:800;color:#111">RISITI YA MALIPO YA DENI</div>
    <div class="dl"></div>
    <div class="rr"><span>Na: <b>${esc(r.no)}</b></span><span>${dateTimeStr(r.createdAt)}</span></div>
    <div class="rr"><span>Mteja</span><span>${esc(r.customer)}</span></div>
    <div class="rr"><span>Amepokea</span><span>${esc(r.userName)}</span></div>
    <div class="dl"></div>
    <div class="rr"><span>Deni kabla</span><span>${fmt(r.balanceBefore)}</span></div>
    <div class="rr" style="font-weight:800;font-size:14px"><span>AMELIPA</span><span>${fmt(r.amount)}</span></div>
    <div class="rr"><span>Njia</span><span>${esc(r.via)}</span></div>
    <div class="rr" style="font-weight:700"><span>Deni lililobaki</span><span>${fmt(Math.max(0, r.balanceAfter))}</span></div>
    ${r.note ? `<div class="rr"><span>Maelezo</span><span>${esc(r.note)}</span></div>` : ""}
    <div class="dl"></div><div class="c">${esc(sh.footer)}</div>
  </div>
  <div class="ov-actions no-print"><button class="btn btn-g" onclick="U.payReceipt=null;render()">Funga</button>
    ${has("whatsapp") ? `<button class="btn btn-a" onclick="sendWhatsApp(U.payReceipt.phone, payText(U.payReceipt))">📲 WhatsApp</button>` : ""}
    <button class="btn btn-p" onclick="window.print()">🖨️ Print</button></div></div></div>`;
}
function payText(r) {
  return `${shopHeaderText()}\n\n✅ *RISITI YA MALIPO YA DENI*\nNa: ${r.no}\n📅 ${dateTimeStr(r.createdAt)}\n👤 ${r.customer}\n\nDeni kabla: ${fmt(r.balanceBefore)}\n*Amelipa: ${fmt(r.amount)}* (${r.via})\nDeni lililobaki: *${fmt(Math.max(0, r.balanceAfter))}*\n\n${posCfg().shop.footer}`;
}

/* =====================================================================
   💸 MATUMIZI — shop expenses (reduce real profit and the cash drawer)
   ===================================================================== */
const EXP_CATS = ["Kodi", "Umeme", "Maji", "Usafiri", "Chakula", "Mshahara", "Matengenezo", "Mengineyo"];
function pageExpenses() {
  const f = U.expForm;
  const [a, b] = rangeBounds(U.expRange, U.expFrom, U.expTo);
  const list = D.expenses.filter((x) => !x.deleted && x.createdAt >= a && x.createdAt < b && (isOwner() || x.userId === U.user.id)).sort((x, y) => y.createdAt - x.createdAt);
  const total = list.reduce((s, x) => s + x.amount, 0);
  return `<div class="split">
  <div class="panel"><h2>➕ Andika matumizi</h2>
    <label class="l">Aina</label>
    <div class="chips" style="flex-wrap:wrap">${EXP_CATS.map((c) => `<button class="chip ${f.category === c ? "on" : ""}" onclick="U.expForm.category='${c}';render()">${c}</button>`).join("")}</div>
    <label class="l">Kiasi (TSh)</label>
    <input id="ex-amt" class="field" inputmode="numeric" value="${esc(f.amount)}" oninput="this.value=this.value.replace(/[^0-9]/g,'');U.expForm.amount=this.value">
    <label class="l">Pesa imetoka wapi?</label>
    <div class="pay">${["Cash", "Simu/Benki"].map((m) => `<button class="${f.via === m ? "on" : ""}" onclick="U.expForm.via='${m}';render()">${m === "Cash" ? "💵 Droo (Cash)" : "📱 Simu/Benki"}</button>`).join("")}</div>
    ${isOwner() ? `<label class="l">Tarehe (acha wazi = leo)</label><input id="ex-date" class="field" type="date" value="${esc(f.date)}" onchange="U.expForm.date=this.value">` : ""}
    <label class="l">Maelezo</label>
    <input id="ex-note" class="field" value="${esc(f.note)}" oninput="U.expForm.note=this.value" placeholder="mf. Bodaboda kuleta mzigo">
    <button class="btn btn-p" style="width:100%;margin-top:12px" onclick="saveExpense()">💾 Hifadhi matumizi</button>
    <p class="hint">Matumizi ya <b>Cash</b> yanapunguzwa kwenye hesabu ya droo (💰 Funga Siku). Yote yanapunguzwa kwenye <b>faida halisi</b> ya ripoti.</p>
  </div>
  <div class="panel"><div class="row"><h2 style="margin:0">💸 Matumizi · ${rangeLabel("exp")}</h2><b style="color:var(--red)">${fmt(total)}</b></div>
    ${rangePicker("exp")}
    ${list.length ? `<div class="tbl-wrap"><table><thead><tr><th>Tarehe</th><th>Aina</th><th>Maelezo</th><th class="r">Kiasi</th>${isOwner() ? "<th></th>" : ""}</tr></thead><tbody>
    ${list.map((x) => `<tr><td>${dateTimeStr(x.createdAt)}<div style="font-size:11px;color:var(--mute)">${esc(x.userName)} · ${x.via === "Cash" ? "💵" : "📱"}</div></td><td>${esc(x.category)}</td><td>${esc(x.note || "")}</td><td class="r"><b>${fmt(x.amount)}</b></td>
      ${isOwner() ? `<td class="r"><button class="btn btn-g sm" onclick="deleteExpense('${x.id}')">🗑️</button></td>` : ""}</tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">Hakuna matumizi kwenye kipindi hiki.</div>`}
  </div></div>`;
}
function saveExpense() {
  const f = U.expForm, amt = Number(f.amount) || 0;
  if (amt <= 0) return toast("Andika kiasi cha matumizi.");
  let created = Date.now();
  if (isOwner() && f.date && f.date !== todayStr()) created = new Date(f.date + "T12:00:00").getTime();
  const x = clean({ id: uid(), createdAt: created, date: dayStr(created), category: f.category, amount: amt, via: f.via === "Cash" ? "Cash" : "Simu/Benki",
    note: f.note.trim(), userId: U.user.id, userName: U.user.name, deleted: false });
  colRef.doc(EXP_PREFIX + x.id).set(x).catch(() => toast("⚠️ Haijafika cloud bado — itatumwa mtandao ukirudi."));
  logActivity("Ameandika matumizi", `${x.category} · ${fmt(amt)}${x.note ? " · " + x.note : ""}`);
  U.expForm = { category: f.category, amount: "", via: f.via, note: "", date: "" };
  toast("✅ Matumizi yamehifadhiwa");
}
function deleteExpense(id) {
  const x = D.expenses.find((y) => y.id === id); if (!x) return;
  if (!confirm(`Futa matumizi ya ${fmt(x.amount)} (${x.category})?`)) return;
  colRef.doc(EXP_PREFIX + id).set({ deleted: true, deletedAt: Date.now(), deletedBy: U.user.name }, { merge: true });
  logActivity("Amefuta matumizi", `${x.category} · ${fmt(x.amount)}`);
}

/* =====================================================================
   💰 FUNGA SIKU — count the drawer and compare with what the system expects
   ===================================================================== */
function closeNumbers(date, scopeUserId) {
  const mine = (x) => !scopeUserId || x.userId === scopeUserId;
  const day = (x) => x.date === date;
  const sales = D.sales.filter((s) => !s.deleted && day(s) && mine(s));
  const cashSales = sales.filter((s) => s.pay === "Cash").reduce((a, s) => a + s.total, 0);
  const digitalSales = sales.filter((s) => s.pay === "M-Pesa").reduce((a, s) => a + s.total, 0);
  const creditSales = sales.filter((s) => s.pay === "Mkopo").reduce((a, s) => a + s.total, 0);
  const pays = D.payments.filter((p) => day(p) && mine(p));
  const debtCash = pays.filter((p) => p.via === "Cash").reduce((a, p) => a + p.amount, 0);
  const debtDigital = pays.filter((p) => p.via !== "Cash").reduce((a, p) => a + p.amount, 0);
  const exps = D.expenses.filter((x) => !x.deleted && day(x) && mine(x));
  const expCash = exps.filter((x) => x.via === "Cash").reduce((a, x) => a + x.amount, 0);
  return { receipts: sales.length, cashSales, digitalSales, creditSales, debtCash, debtDigital, expCash, expTotal: exps.reduce((a, x) => a + x.amount, 0) };
}
function pageClose() {
  const f = U.closeForm;
  const date = f.date || todayStr();
  const users = posCfg().users;
  const scope = isOwner() ? f.scope : U.user.id;   // "" = everyone (owner only)
  const n = closeNumbers(date, scope);
  const opening = Number(f.opening) || 0;
  const expected = opening + n.cashSales + n.debtCash - n.expCash;
  const counted = f.counted === "" ? null : Number(f.counted) || 0;
  const diff = counted == null ? null : counted - expected;
  const scopeName = scope ? (users.find((u) => u.id === scope) || {}).name : "Wote";
  const [a, b] = rangeBounds(U.closeRange, U.closeFrom, U.closeTo);
  const hist = D.closings.filter((c) => c.createdAt >= a && c.createdAt < b && (isOwner() || c.userId === U.user.id)).sort((x, y) => y.createdAt - x.createdAt);
  const row = (l, v, sign, strong) => `<tr><td>${l}</td><td class="r" style="${strong ? "font-weight:800;font-size:15px" : ""}">${sign || ""}${fmt(v)}</td></tr>`;
  return `<div class="split">
  <div class="panel"><h2>💰 Funga Siku — hesabu ya droo</h2>
    <div class="two">
      <div><label class="l">Tarehe</label><input id="cl-date" class="field" type="date" value="${esc(date)}" ${isOwner() ? "" : "disabled"} onchange="U.closeForm.date=this.value;render()"></div>
      <div><label class="l">Muuzaji</label>${isOwner()
        ? `<select id="cl-scope" class="field" onchange="U.closeForm.scope=this.value;render()"><option value="">Wote</option>${users.map((u) => `<option value="${u.id}" ${scope === u.id ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select>`
        : `<input class="field" value="${esc(U.user.name)}" disabled>`}</div>
    </div>
    <table style="margin-top:12px"><tbody>
      <tr><td>Pesa ya kuanzia (float)</td><td class="r"><input id="cl-open" class="field sm" style="width:130px;text-align:right" inputmode="numeric" value="${esc(f.opening)}" placeholder="0" oninput="this.value=this.value.replace(/[^0-9]/g,'');U.closeForm.opening=this.value;soft(500)"></td></tr>
      ${row(`💵 Mauzo ya Cash (risiti ${n.receipts})`, n.cashSales, "+ ")}
      ${row("📒 Madeni yaliyolipwa kwa Cash", n.debtCash, "+ ")}
      ${row("💸 Matumizi yaliyotoka droo", n.expCash, "− ")}
      ${row("<b>Pesa INAYOTAKIWA kuwepo</b>", expected, "", true)}
    </tbody></table>
    <label class="l" style="margin-top:14px">Pesa uliyohesabu kwenye droo</label>
    <input id="cl-count" class="field" inputmode="numeric" style="font-size:20px;font-weight:800" value="${esc(f.counted)}" placeholder="Hesabu pesa, kisha andika hapa" oninput="this.value=this.value.replace(/[^0-9]/g,'');U.closeForm.counted=this.value;soft(500)">
    ${diff == null ? "" : `<div style="text-align:center;margin:14px 0 4px">
      <div class="diff ${diff < 0 ? "short" : diff > 0 ? "over" : "ok"}">${diff === 0 ? "✅ Iko sawa kabisa" : diff < 0 ? "❌ Upungufu " + fmt(-diff) : "⚠️ Ziada " + fmt(diff)}</div></div>`}
    <label class="l">Maelezo (hiari)</label>
    <input id="cl-note" class="field" value="${esc(f.note)}" oninput="U.closeForm.note=this.value" placeholder="mf. Upungufu umeelezwa: chenji ya mteja">
    <button class="btn btn-p" style="width:100%;margin-top:12px" onclick="saveClosing()" ${counted == null ? "disabled" : ""}>🔒 Funga siku na hifadhi</button>
    <div class="note" style="margin:12px 0 0;display:block">
      <b>Taarifa zisizo za droo (${esc(scopeName)}, ${esc(date)}):</b><br>
      📱 Mauzo ya Simu/Benki: <b>${fmt(n.digitalSales)}</b> · 📱 Madeni kwa Simu/Benki: <b>${fmt(n.debtDigital)}</b><br>
      📒 Mauzo ya Mkopo: <b>${fmt(n.creditSales)}</b> · 💸 Matumizi yote: <b>${fmt(n.expTotal)}</b>
    </div>
  </div>
  <div class="panel"><h2>📜 Siku zilizofungwa</h2>${rangePicker("close")}
    ${hist.length ? `<div class="tbl-wrap"><table><thead><tr><th>Siku</th><th>Muuzaji</th><th class="r">Inatakiwa</th><th class="r">Imehesabiwa</th><th class="r">Tofauti</th><th></th></tr></thead><tbody>
    ${hist.map((c) => `<tr><td>${esc(c.date)}<div style="font-size:11px;color:var(--mute)">${dateTimeStr(c.createdAt)} · ${esc(c.byName)}</div></td><td>${esc(c.scopeName)}</td>
      <td class="r">${num(c.expected)}</td><td class="r">${num(c.counted)}</td>
      <td class="r"><span class="badge ${c.diff < 0 ? "" : c.diff > 0 ? "am" : "ok"}">${c.diff === 0 ? "sawa" : (c.diff > 0 ? "+" : "") + num(c.diff)}</span></td>
      <td class="r"><button class="btn btn-g sm" onclick="printClosing('${c.id}')">🖨️</button></td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">Bado hakuna siku iliyofungwa kwenye kipindi hiki.</div>`}
  </div></div>`;
}
function saveClosing() {
  const f = U.closeForm, date = f.date || todayStr();
  const scope = isOwner() ? f.scope : U.user.id;
  const n = closeNumbers(date, scope);
  const opening = Number(f.opening) || 0, counted = Number(f.counted) || 0;
  const expected = opening + n.cashSales + n.debtCash - n.expCash;
  const scopeName = scope ? (posCfg().users.find((u) => u.id === scope) || {}).name : "Wote";
  const c = clean({ id: uid(), createdAt: Date.now(), date, userId: scope || "", scopeName, byId: U.user.id, byName: U.user.name,
    opening, ...n, expected, counted, diff: counted - expected, note: f.note.trim() });
  colRef.doc(CLOSE_PREFIX + c.id).set(c).catch(() => toast("⚠️ Haijafika cloud bado"));
  logActivity("Amefunga siku", `${date} · ${scopeName} · inatakiwa ${fmt(expected)}, imehesabiwa ${fmt(counted)} (${c.diff === 0 ? "sawa" : c.diff < 0 ? "upungufu " + fmt(-c.diff) : "ziada " + fmt(c.diff)})`);
  U.closeForm = { date: "", scope: f.scope, opening: "", counted: "", note: "" };
  toast(c.diff === 0 ? "✅ Siku imefungwa — hesabu iko sawa" : c.diff < 0 ? "❌ Imefungwa — upungufu " + fmt(-c.diff) : "⚠️ Imefungwa — ziada " + fmt(c.diff));
}
function printClosing(id) {
  const c = D.closings.find((x) => x.id === id); if (!c) return;
  U.printList = {
    title: "Kufunga Siku — " + c.date + " (" + c.scopeName + ")",
    sub: "Imefungwa na " + c.byName + " · " + dateTimeStr(c.createdAt) + (c.note ? " · " + c.note : ""),
    head: ["Kipengele", "Kiasi"],
    rows: [["Pesa ya kuanzia", num(c.opening)], ["Mauzo ya Cash (risiti " + c.receipts + ")", num(c.cashSales)], ["Madeni yaliyolipwa Cash", num(c.debtCash)],
      ["Matumizi kutoka droo", "−" + num(c.expCash)], ["INAYOTAKIWA", num(c.expected)], ["ILIYOHESABIWA", num(c.counted)],
      ["TOFAUTI", (c.diff > 0 ? "+" : "") + num(c.diff)], ["Mauzo Simu/Benki", num(c.digitalSales)], ["Madeni Simu/Benki", num(c.debtDigital)], ["Mauzo ya Mkopo", num(c.creditSales)]],
    foot: c.diff === 0 ? "Hesabu iko sawa ✅" : c.diff < 0 ? "UPUNGUFU: " + fmt(-c.diff) : "ZIADA: " + fmt(c.diff),
  };
  render();
}

/* =====================================================================
   🔐 ULINZI — activate this device with the business email
   ===================================================================== */
function deviceLoginView() {
  const f = U.devLogin || (U.devLogin = { email: "", pw: "", msg: "" });
  return `<div class="login"><div class="login-card">
    <div style="text-align:center;margin-bottom:8px">${dukaLoginHeader()}<div style="font-size:12px;opacity:.6">POS ya mauzo</div></div>
    <p style="font-size:13px;color:var(--mute)">Ingia kwa email na password ulizopewa na E.E.Msango. Kifaa hiki kitakumbukwa.</p>
    <input id="dv-email" class="field" type="email" autocomplete="username" placeholder="Email ya biashara" value="${esc(f.email)}" oninput="U.devLogin.email=this.value">
    <input id="dv-pw" class="field" type="password" autocomplete="current-password" placeholder="Password" style="margin-top:8px" oninput="U.devLogin.pw=this.value" onkeydown="if(event.key==='Enter')activateDevice()">
    ${f.msg ? `<div class="${f.ok ? "ok" : "err"}">${esc(f.msg)}</div>` : ""}
    <button class="btn btn-p" style="width:100%;margin-top:12px" onclick="activateDevice()">Washa kifaa</button>
    <button class="btn btn-g" style="width:100%;margin-top:8px" onclick="dukaForgot(U.devLogin.email)">Umesahau password?</button>
  </div></div>`;
}
function activateDevice() {
  const f = U.devLogin || (U.devLogin = { email: "", pw: "" });
  if (!f.email.trim() || !f.pw) { f.msg = "Andika email na password."; f.ok = false; return render(); }
  f.msg = "Inaingia…"; f.ok = true; render();
  auth.signInWithEmailAndPassword(f.email.trim(), f.pw).then(() => {
    f.msg = "✅ Kifaa kimewashwa. Inapakia upya…"; render(); setTimeout(() => location.reload(), 800);
  }).catch((e) => {
    const c = (e && e.code) || "";
    f.msg = c.includes("operation-not-allowed") ? "Email/Password haijawashwa kwenye Firebase (Authentication → Sign-in method)."
      : /wrong-password|invalid-credential|user-not-found|invalid-login/.test(c) ? "Email au password si sahihi."
      : c.includes("network") ? "Hakuna mtandao." : "Imeshindikana: " + ((e && e.message) || c);
    f.ok = false; render();
  });
}
function securityPanel() { return dukaSignOutButton(); }

/* ---------- 🔄 Auto-update check ----------
   Every 5 minutes (and when the app comes back to the screen) we download a
   fresh copy of index.html, bypassing every cache, and compare the script
   version in it with the one running now. If GitHub has a newer one, a button
   appears; tapping it reloads straight onto the new version. */
(function () {
  const mine = (() => { const s = [...document.scripts].map((x) => x.src).find((x) => /pos\.js\?v=/.test(x)); const m = s && s.match(/\?v=([\w.-]+)/); return m ? m[1] : null; })();
  if (!mine) return;
  let shown = false;
  function check() {
    if (shown) return;
    fetch(location.pathname + "?nocache=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.text() : "")).then((html) => {
      const m = html.match(/pos\.js\?v=([\w.-]+)/);
      if (m && m[1] !== mine) showBar();
    }).catch(() => {});
  }
  function showBar() {
    shown = true;
    const b = document.createElement("button");
    b.textContent = "🔄 Toleo jipya lipo — bonyeza kusasisha";
    b.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9999;background:#14a37f;color:#fff;border:0;border-radius:30px;padding:12px 20px;font:700 14px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);cursor:pointer";
    b.onclick = () => { location.replace(location.pathname + "?v=" + Date.now()); };
    document.body.appendChild(b);
  }
  setTimeout(check, 4000);
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
})();
