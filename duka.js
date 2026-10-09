/* =====================================================================
   MSANGO MADUKA — kiini cha pamoja (core)  · duka.js v5
   Kurasa 4 zinasoma faili hili:
     index.html  → Wadai na Stock ya mteja        (?duka=CODE)
     pos.html    → POS ya mteja                     (?duka=CODE)
     kiwanda.html→ Kiwanda: tengeneza/badilisha mifumo (msimamizi)
     ofisi.html  → Ofisi: kumbukumbu za wateja + malipo (msimamizi)
   Data (Firestore, project msango--maduka-a-town):
     shops/{code}            → mfumo wa mteja: vipengele, chapa, muda wa malipo
     shops/{code}/data/*     → data ya duka lenyewe (bidhaa, madeni, mauzo…)
     brands/{code}           → jina na rangi (inaonekana kabla ya kuingia)
     clients/{id}            → kumbukumbu za Ofisi (CRM)
     settings/public         → namba ya malipo, n.k. (wateja wanaisoma)
     settings/crm            → mipangilio ya Ofisi (msimamizi tu)
   ===================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDE4CyCyhI2dFUvkIJNXB0Fz5oBpGLRA4Y",
  authDomain: "msango--maduka-a-town.firebaseapp.com",
  projectId: "msango--maduka-a-town",
  storageBucket: "msango--maduka-a-town.firebasestorage.app",
  messagingSenderId: "357014773049",
  appId: "1:357014773049:web:7a2097fd707cca9aa19ce8",
};
const ADMIN_EMAIL = "ericemmanuelmsango2004@gmail.com";
const DAY = 864e5;

/* ---------- vipengele (features) ambavyo kila mfumo unaweza kuwa navyo ---------- */
const FEATURES = [
  // [key, jina, kundi]
  ["owed", "Wadaiwa — wateja wanaokudai", "Wadai"],
  ["owe", "Wadai — wasambazaji unaowadai", "Wadai"],
  ["products", "Bidhaa na bei", "Wadai"],
  ["mainstore", "Stock ya dukani", "Wadai"],
  ["godown", "Godown / stoo ya pili", "Wadai"],
  ["sales", "Mauzo (ndani ya Wadai)", "Wadai"],
  ["reports", "Ripoti", "Wadai"],
  ["alerts", "Tahadhari (madeni + stock ndogo)", "Wadai"],
  ["pos", "POS ya mauzo", "POS"],
  ["jumla", "Bei za jumla kwenye POS", "POS"],
  ["posMadeni", "Madeni kwenye POS", "POS"],
  ["matumizi", "Matumizi (expenses)", "POS"],
  ["funga", "Kufunga siku", "POS"],
  ["whatsapp", "Risiti kwa WhatsApp", "POS"],
  ["ripoti", "Ripoti za faida (POS)", "POS"],
];
const BASE_F = ["owed", "owe", "products", "mainstore", "reports", "alerts"];
const EDITIONS = {
  mali:  { name: "Mali Yangu", price: 15000, users: 1,   f: BASE_F },
  duka:  { name: "DukaSmart",  price: 30000, users: 3,   f: BASE_F.concat(["sales", "pos", "posMadeni", "matumizi", "funga", "whatsapp"]) },
  stoki: { name: "StokiPesa",  price: 45000, users: 6,   f: BASE_F.concat(["sales", "pos", "posMadeni", "matumizi", "funga", "whatsapp", "godown", "jumla"]) },
  pro:   { name: "Hesabu Pro", price: 60000, users: 999, f: FEATURES.map((x) => x[0]) },
};
function presetFeatures(edition) { const e = EDITIONS[edition] || EDITIONS.duka; const o = {}; FEATURES.forEach(([k]) => (o[k] = e.f.includes(k))); return o; }

/* ---------- hali ya ukurasa huu ---------- */
let SHOP = null;            // mfumo unaofanyiwa kazi
let IS_ADMIN = false;
let SHOP_VIA_ADMIN = false; // msimamizi anaangalia mfumo wa mteja (tab yake)
let SHOP_MISSING = false;
let PUBLIC = {};            // settings/public (namba ya malipo…)
const DUKA_HOOK = { rerender: null, pri: "btn btn-primary", ghost: "btn btn-ghost", panel: "panel" };
const URL_SHOP = (() => { const m = location.search.match(/[?&]duka=([a-z0-9-]+)/i); return m ? m[1].toLowerCase() : ""; })();
const CLIENT_MODE = true;

function ed() {
  if (!SHOP) { const all = {}; FEATURES.forEach(([k]) => (all[k] = true)); return { name: "E.E.MSANGO", users: 999, f: all, pos: true, jumla: true, stores: true, profit: true, price: 0 }; }
  const base = EDITIONS[SHOP.edition] || EDITIONS.duka;
  const f = { ...presetFeatures(SHOP.edition), ...(SHOP.features || {}) };
  return { name: base.name, price: SHOP.monthly || base.price, users: SHOP.users || base.users, f,
    pos: !!f.pos, jumla: !!f.jumla, stores: !!f.godown, profit: !!f.ripoti };
}
function has(k) { return !!ed().f[k]; }
function bizName() { return SHOP ? (SHOP.name || "") : "MSANGO MADUKA"; }
function dukaEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function dukaRerender() { if (DUKA_HOOK.rerender) DUKA_HOOK.rerender(); }
function dukaSlug(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30); }
function fmtDate(ms) { if (!ms) return "—"; const d = new Date(ms); return d.toLocaleDateString("sw-TZ", { day: "numeric", month: "short", year: "numeric" }); }
function daysLeft(s) { s = s || SHOP; if (!s || !s.paidUntil) return null; return Math.ceil((s.paidUntil - Date.now()) / DAY); }
function isExpired(s) { s = s || SHOP; return !!s && !(s.paidUntil > Date.now()); }
function baseUrl() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
function shopLink(code, page) { return baseUrl() + (page || "") + "?duka=" + code; }
/* keep ?duka=CODE when moving between Wadai and POS */
function dukaHref(page) { const code = (SHOP && SHOP.code) || URL_SHOP; return (page || "./") + (code ? "?duka=" + code : ""); }

/* ---------- chapa (brand): jina + rangi ---------- */
let PRE_BRAND = null;  // brands/{URL_SHOP} — before login
function loadPreBrand() {
  if (!URL_SHOP) return Promise.resolve(null);
  return db.collection("brands").doc(URL_SHOP).get().then((d) => { PRE_BRAND = d.exists ? d.data() : null; applyBrand(PRE_BRAND); dukaRerender(); return PRE_BRAND; }).catch(() => null);
}
function applyBrand(b) {
  b = b || (SHOP && SHOP.brand) || null;
  const color = b && b.color;
  if (color && /^#[0-9a-f]{6}$/i.test(color)) {
    document.documentElement.style.setProperty("--navy", color);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", color);
  }
  const name = (b && b.name) || (SHOP && SHOP.name);
  if (name && DUKA_HOOK.titleSuffix != null) document.title = name + DUKA_HOOK.titleSuffix;
}
function brandName() { return (SHOP && SHOP.name) || (PRE_BRAND && PRE_BRAND.name) || "Msango Maduka"; }

/* ---------- mfumo huu ni wa duka gani? ---------- */
async function resolveShop(user) {
  SHOP = null; IS_ADMIN = false; SHOP_VIA_ADMIN = false; SHOP_MISSING = false;
  if (!user || user.isAnonymous) return null;
  const email = (user.email || "").toLowerCase();
  db.collection("settings").doc("public").get().then((d) => { PUBLIC = (d.exists && d.data()) || {}; }).catch(() => {});
  if (email === ADMIN_EMAIL.toLowerCase()) {
    IS_ADMIN = true;
    if (URL_SHOP) {
      try { const d = await db.collection("shops").doc(URL_SHOP).get(); if (d.exists) { SHOP = { code: URL_SHOP, ...d.data() }; SHOP_VIA_ADMIN = true; } } catch (e) {}
    }
    if (SHOP) applyBrand();
    return SHOP;
  }
  try {
    const q = await db.collection("shops").where("members", "array-contains", email).get();
    if (!q.empty) {
      const docs = q.docs.map((d) => ({ code: d.id, ...d.data() }));
      SHOP = docs.find((s) => s.code === URL_SHOP) || docs[0];
      try { await db.collection("settings").doc("public").get().then((d) => { PUBLIC = (d.exists && d.data()) || {}; }); } catch (e) {}
      applyBrand();
      return SHOP;
    }
  } catch (e) {}
  SHOP_MISSING = true;
  return null;
}
function dataCollection() { return db.collection("shops").doc(SHOP.code).collection("data"); }
function adminHome() { return IS_ADMIN && !SHOP; }
function shopBlocked() { return SHOP_MISSING || (SHOP && !SHOP_VIA_ADMIN && (SHOP.active === false || isExpired())); }

/* ---------- skrini za mteja ---------- */
function dukaCenter(inner) { return `<div style="min-height:80vh;display:grid;place-items:center;padding:20px"><div style="max-width:400px;text-align:center;display:grid;gap:12px">${inner}</div></div>`; }
function dukaPayBox() {
  const p = PUBLIC || {};
  return `<div style="text-align:left;background:rgba(127,127,127,.08);border-radius:10px;padding:12px;font-size:14px;display:grid;gap:4px">
    <b>Jinsi ya kulipa</b>
    ${p.lipaNumber ? `<div>📱 ${dukaEsc(p.lipaMethod || "Lipa namba")}: <b>${dukaEsc(p.lipaNumber)}</b>${p.lipaName ? " (" + dukaEsc(p.lipaName) + ")" : ""}</div>` : ""}
    <div>💰 Kiasi: <b>TZS ${Number(ed().price || 0).toLocaleString("en-US")}</b> kwa mwezi</div>
    <div>🧾 Kumbukumbu (reference): <b>${dukaEsc(SHOP ? SHOP.code : "")}</b></div>
    ${p.phone ? `<div>📞 Ukishalipa, tuma ujumbe: <b>${dukaEsc(p.phone)}</b></div>` : ""}
    <div style="opacity:.7;font-size:12.5px">Malipo yakithibitishwa, mfumo unajifungua wenyewe — fungua ukurasa upya.</div></div>`;
}
function dukaBlockedView() {
  if (SHOP_MISSING) {
    const em = auth.currentUser && auth.currentUser.email;
    return dukaCenter(`<div style="font-size:40px">🏪</div><h2 style="margin:0">Email hii haijaunganishwa na mfumo</h2>
      <p style="margin:0;opacity:.75;font-size:14px">${dukaEsc(em)} haina mfumo wowote. Wasiliana na E.E.Msango, au ingia kwa email nyingine.</p>
      <button class="${DUKA_HOOK.pri}" onclick="auth.signOut().then(()=>location.reload())">Ingia kwa email nyingine</button>`);
  }
  if (SHOP.active === false) {
    return dukaCenter(`<div style="font-size:40px">⏸️</div><h2 style="margin:0">Mfumo umesimamishwa</h2>
      <p style="margin:0;opacity:.75;font-size:14px">Mfumo wa ${dukaEsc(SHOP.name)} umesimamishwa na E.E.Msango. Data yako iko salama. Wasiliana nasi.</p>${PUBLIC.phone ? `<b>📞 ${dukaEsc(PUBLIC.phone)}</b>` : ""}`);
  }
  return dukaCenter(`<div style="font-size:40px">⏳</div><h2 style="margin:0">Muda wa malipo umeisha</h2>
    <p style="margin:0;opacity:.75;font-size:14px">Mfumo wa <b>${dukaEsc(SHOP.name)}</b> ulilipiwa hadi <b>${fmtDate(SHOP.paidUntil)}</b>. Data yako yote iko salama — lipia kuendelea.</p>
    ${dukaPayBox()}
    <button class="${DUKA_HOOK.pri}" onclick="location.reload()">Nimeshalipa — fungua tena</button>`);
}
function dukaAdminBanner() {
  if (!SHOP_VIA_ADMIN) return "";
  const dl = daysLeft();
  const st = SHOP.active === false ? "IMESIMAMISHWA" : isExpired() ? "MUDA UMEISHA" : dl != null ? "siku " + dl + " zimebaki" : "";
  return `<div style="position:sticky;top:0;z-index:50;background:#7c2d12;color:#fff;padding:8px 12px;font-size:13px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <b>👁️ Msimamizi ndani ya ${dukaEsc(SHOP.name)}</b> <span style="opacity:.85">${dukaEsc(ed().name)} · ${st}</span>
    <a href="kiwanda.html#${SHOP.code}" style="margin-left:auto;background:#fff;color:#7c2d12;border-radius:6px;padding:5px 10px;font-weight:700;text-decoration:none">🏭 Kiwanda</a></div>`;
}
function dukaExpiryBanner() {
  if (!SHOP || SHOP_VIA_ADMIN) return "";
  const dl = daysLeft(); if (dl == null || dl > 5) return "";
  return `<div style="background:#fef3c7;color:#78350f;padding:8px 12px;font-size:13px;text-align:center">⏳ Malipo ya mfumo yanaisha <b>${fmtDate(SHOP.paidUntil)}</b> (siku ${dl}). Lipa mapema ili usikatizwe${PUBLIC.lipaNumber ? " — " + dukaEsc(PUBLIC.lipaMethod || "Lipa namba") + " <b>" + dukaEsc(PUBLIC.lipaNumber) + "</b>, kumbukumbu <b>" + dukaEsc(SHOP.code) + "</b>" : ""}.</div>`;
}
function dukaAdminRedirect() {
  return dukaCenter(`<div style="font-size:40px">🏭</div><h2 style="margin:0">Wewe ni msimamizi</h2>
    <p style="margin:0;opacity:.75;font-size:14px">Ukurasa huu ni wa wateja. Nenda Kiwanda kuona na kufungua mifumo yote.</p>
    <a class="${DUKA_HOOK.pri}" href="kiwanda.html" style="text-decoration:none">🏭 Fungua Kiwanda</a>
    <a class="${DUKA_HOOK.ghost}" href="ofisi.html" style="text-decoration:none">📋 Fungua Ofisi</a>`);
}
function dukaSignOutButton() {
  const u = auth.currentUser; if (!u) return "";
  const dl = daysLeft();
  return `<div class="${DUKA_HOOK.panel}" style="margin-top:16px"><h3 style="margin-top:0">🔐 Mfumo wako</h3>
    ${SHOP ? `<p style="font-size:13px;margin:4px 0">📦 Mpango: <b>${dukaEsc(ed().name)}</b> · TZS ${Number(ed().price || 0).toLocaleString("en-US")}/mwezi</p>
    <p style="font-size:13px;margin:4px 0">⏳ Umelipiwa hadi: <b>${fmtDate(SHOP.paidUntil)}</b>${dl != null ? " (siku " + Math.max(dl, 0) + ")" : ""}</p>` : ""}
    <p style="font-size:13px;margin:4px 0">Kifaa hiki kimeingia kwa <b>${dukaEsc(u.email)}</b>.</p>
    ${IS_ADMIN ? "" : `<button class="${DUKA_HOOK.ghost}" onclick="if(confirm('Toa kifaa hiki? Utahitaji email na password kuingia tena.'))auth.signOut().then(()=>location.reload())">Toa kifaa hiki</button>`}</div>`;
}
function dukaForgot(email) {
  email = (email || "").trim();
  if (!email) return alert("Andika email yako kwanza kwenye kisanduku cha email, kisha bonyeza tena.");
  auth.sendPasswordResetEmail(email).then(() => alert("📧 Tumekutumia link ya kubadilisha password kwenye " + email + ". Angalia Inbox (na Spam)."))
    .catch((e) => alert(((e && e.code) || "").includes("user-not-found") ? "Email hii haijasajiliwa." : "Haikutumwa: " + ((e && e.message) || "")));
}

/* =====================================================================
   ADMIN API — inatumiwa na Kiwanda na Ofisi (msimamizi tu; rules zinalinda)
   ===================================================================== */
function dukaApp(name) { return firebase.apps.find((a) => a.name === name) || firebase.initializeApp(firebaseConfig, name); }
function shopPublic(s) { return { name: s.name, color: (s.brand && s.brand.color) || "", tagline: (s.brand && s.brand.tagline) || "" }; }
/* Tengeneza mfumo mpya. opts: {name, code, edition, features, users, monthly, brand:{color,tagline}, email, pw, phone, location, trialDays, notes, clientId} */
async function adminCreateShop(o) {
  const name = (o.name || "").trim(), code = dukaSlug(o.code || o.name), email = (o.email || "").trim().toLowerCase(), pw = o.pw || "";
  if (!name) throw new Error("Andika jina la duka.");
  if (code.length < 3) throw new Error("Code ya duka iwe na herufi 3 au zaidi.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Andika email sahihi ya mteja.");
  if (email === ADMIN_EMAIL.toLowerCase()) throw new Error("Hii ni email yako ya msimamizi — mteja anahitaji email yake.");
  if (pw.length < 6) throw new Error("Password iwe na herufi 6 au zaidi.");
  const ref = db.collection("shops").doc(code);
  if ((await ref.get()).exists) throw new Error("Code \"" + code + "\" tayari inatumika. Chagua nyingine.");
  const sec = dukaApp("ee-create");
  let existed = false, exposed = false;
  try { await sec.auth().createUserWithEmailAndPassword(email, pw); }
  catch (e) { if (e && e.code === "auth/email-already-in-use") existed = true; else throw e; }
  const now = Date.now(), trial = Math.max(0, Number(o.trialDays == null ? 14 : o.trialDays));
  const shop = {
    name, edition: o.edition || "duka", features: o.features || presetFeatures(o.edition || "duka"),
    users: Number(o.users) || (EDITIONS[o.edition] || EDITIONS.duka).users,
    monthly: Number(o.monthly) || (EDITIONS[o.edition] || EDITIONS.duka).price,
    brand: { color: (o.brand && o.brand.color) || "", tagline: (o.brand && o.brand.tagline) || "" },
    members: [email], ownerEmail: email, phone: (o.phone || "").trim(), location: (o.location || "").trim(),
    active: true, paidUntil: now + trial * DAY, trialEnds: now + trial * DAY, createdAt: now,
    loginPw: existed ? "" : pw, notes: o.notes || "", clientId: o.clientId || "",
  };
  // Ofisi: rekodi ya mteja inajitengeneza (au inaunganishwa kama imetoka Ofisi)
  let clientId = o.clientId;
  if (!clientId) clientId = "c" + now.toString(36);
  shop.clientId = clientId;
  await ref.set(shop);
  await db.collection("brands").doc(code).set(shopPublic(shop));
  await ref.collection("data").doc("pos_settings").set({ shop: { name, line: shop.brand.tagline || "", tin: "", phone: shop.phone, address: shop.location, footer: "Asante kwa kununua! Karibu tena 🙏" } }, { merge: true });
  const cref = db.collection("clients").doc(clientId);
  const cdoc = await cref.get();
  const crmPatch = { shopCode: code, edition: shop.edition, updatedAt: now };
  if (cdoc.exists) {
    const c = cdoc.data();
    if (!c.stage || c.stage === "lead" || c.stage === "demo") { crmPatch.stage = "trial"; crmPatch.trialAt = c.trialAt || new Date().toISOString().slice(0, 10); crmPatch.demoAt = c.demoAt || crmPatch.trialAt; }
    await cref.set(crmPatch, { merge: true });
  } else {
    const t = new Date().toISOString().slice(0, 10);
    await cref.set({ id: clientId, name, owner: o.owner || "", phone: shop.phone, location: shop.location, type: o.type || "Duka", helper: o.helper || "",
      stage: "trial", createdAt: t, demoAt: t, trialAt: t, needs: {}, addons: [], payments: [], onboard: {},
      setupFee: null, discount: 0, notes: o.notes || "", ...crmPatch });
  }
  if (!existed) {
    try { const all = await sec.firestore().collection("shops").get({ source: "server" }); exposed = all.size > 0; } catch (e) {}
    await sec.auth().signOut().catch(() => {});
  }
  return { code, name, email, pw: existed ? null : pw, existed, exposed, edition: shop.edition, clientId };
}
async function adminUpdateShop(code, patch) {
  const ref = db.collection("shops").doc(code);
  await ref.update(patch);
  if ("name" in patch || "brand" in patch) {
    const s = (await ref.get()).data();
    await db.collection("brands").doc(code).set(shopPublic(s));
  }
}
/* Malipo → mfumo unajiwasha: ongeza siku kuanzia leo au mwisho wa muda uliopo */
async function adminExtend(code, days) {
  const ref = db.collection("shops").doc(code);
  const s = (await ref.get()).data() || {};
  const from = Math.max(Date.now(), s.paidUntil || 0);
  const paidUntil = from + Math.round(days) * DAY;
  await ref.update({ paidUntil, active: true });
  return paidUntil;
}
async function adminDeleteShop(code) {
  const ref = db.collection("shops").doc(code);
  const s = (await ref.get()).data() || {};
  const docs = await ref.collection("data").get();
  for (const d of docs.docs) await d.ref.delete();
  await ref.delete();
  await db.collection("brands").doc(code).delete().catch(() => {});
  if (s.clientId) await db.collection("clients").doc(s.clientId).set({ shopCode: "" }, { merge: true }).catch(() => {});
}
async function dukaPinHash(userId, pin) {
  const data = new TextEncoder().encode("eepos:" + userId + ":" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function dukaRules(adminEmail) {
  return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null && request.auth.token.email != null; }
    function isAdmin() { return signedIn() && request.auth.token.email == "${adminEmail || ADMIN_EMAIL}"; }
    function shop(code) { return get(/databases/$(database)/documents/shops/$(code)).data; }
    function member(code) { return signedIn() && request.auth.token.email in shop(code).members; }
    // mfumo unafunguka tu ukiwa hai NA umelipiwa (muda unakaguliwa na seva, si simu)
    function paid(code) { return shop(code).active == true && shop(code).paidUntil > request.time.toMillis(); }

    match /shops/{code} {
      allow list, get: if isAdmin() || (signedIn() && request.auth.token.email in resource.data.members);
      allow write: if isAdmin();
      match /data/{docId} {
        allow read, write: if isAdmin() || (member(code) && paid(code));
      }
    }
    match /brands/{code} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /settings/public {
      allow read: if signedIn();
    }
    match /settings/{doc} {
      allow read, write: if isAdmin();
    }
    match /clients/{id} {
      allow read, write: if isAdmin();
    }
  }
}`;
}
/* Kitufe cha "Umesahau password?" + skrini ya kuingia yenye chapa ya mteja */
function dukaLoginHeader() {
  const b = PRE_BRAND;
  return b ? `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">Mfumo wa</div><h2 style="margin:0">${dukaEsc(b.name)}</h2>${b.tagline ? `<div style="opacity:.7;font-size:13px">${dukaEsc(b.tagline)}</div>` : ""}`
    : `<h2 style="margin:0">Msango Maduka</h2>`;
}
