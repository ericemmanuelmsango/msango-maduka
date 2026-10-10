/* =====================================================================
   MSANGO PAKITI — injini ya pamoja ya pakiti za biashara  · pk.js v1
   pakiti.html?duka=CODE → inaingia, inatambua duka, inapakia pakiti ya
   biashara yake (hoteli.js, mgahawa.js, ...) na kuiendesha.
   Data:  shops/{code}/data/<aina>_<id>
     k:'cfg' → kumbukumbu hai (vyumba, menyu, bidhaa, oda zilizo wazi…)
     k:'tx'  → miamala iliyofungwa, ina `day` (YYYY-MM-DD) — siku 31 zinasomwa
   ===================================================================== */
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}

const PK = {
  pack: null, ready: false, blocked: false, needLogin: false, adminHome: false,
  cfg: {}, tx: {}, settings: {}, loaded: { cfg: false, tx: false },
  user: null, pickUser: null, page: null, modalHtml: "", msg: "", setup: { name: "", pin: "", pin2: "" }, login: { email: "", pw: "", msg: "" },
  TX_DAYS: 31, extraTx: null,
};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = (n) => String(n).padStart(2, "0");
const dayOf = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };
const today = () => dayOf(Date.now());
const addDays = (day, n) => { const d = new Date(day + "T12:00:00"); d.setDate(d.getDate() + n); return dayOf(d.getTime()); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const hm = (ms) => { const d = new Date(ms); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); };
const fdate = (day) => { if (!day) return "—"; const d = new Date((day.length > 10 ? day : day + "T12:00:00")); return d.toLocaleDateString("sw-TZ", { day: "numeric", month: "short", year: "numeric" }); };
const tzs = (n) => "TSh " + Math.round(Number(n) || 0).toLocaleString("en-US");
const n0 = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
const num = (v) => { const x = Number(String(v == null ? "" : v).replace(/[, ]/g, "")); return isFinite(x) ? x : 0; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const val = (id) => { const el = document.getElementById(id); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; };
const clean = (o) => JSON.parse(JSON.stringify(o));
const match = (s, q) => { q = (q || "").toLowerCase().trim(); if (!q) return true; s = String(s || "").toLowerCase(); return q.split(/\s+/).every((w) => s.includes(w)); };

/* ---------- data ---------- */
function col() { return dataCollection(); }
function list(t, pred) { return Object.values(PK.cfg).filter((d) => d.t === t && (!pred || pred(d))); }
function txList(t, pred) { const all = Object.values(PK.tx).concat(PK.extraTx ? Object.values(PK.extraTx) : []); const seen = {}; return all.filter((d) => d.t === t && !seen[d.id] && (seen[d.id] = 1) && (!pred || pred(d))); }
function get(id) { return PK.cfg[id] || PK.tx[id] || null; }
function S(key, def) { const v = PK.settings[key]; return v == null || v === "" ? def : v; }
async function save(doc) {
  if (!doc.id || !doc.t) throw new Error("doc needs id + t");
  doc = clean({ k: "cfg", ...doc, at: Date.now(), by: PK.user ? PK.user.name : "" });
  if (doc.k === "tx") { if (!doc.day) doc.day = today(); PK.tx[doc.id] = doc; delete PK.cfg[doc.id]; } else { PK.cfg[doc.id] = doc; delete PK.tx[doc.id]; }
  render();
  return col().doc(doc.id).set(doc).catch(saveErr);
}
async function patch(id, fields) {
  const d = get(id); if (!d) return;
  const nd = clean({ ...d, ...fields, at: Date.now() });
  if (nd.k === "tx") { if (!nd.day) nd.day = today(); PK.tx[id] = nd; delete PK.cfg[id]; } else { PK.cfg[id] = nd; delete PK.tx[id]; }
  render();
  return col().doc(id).set(nd).catch(saveErr);
}
async function remove(id) { delete PK.cfg[id]; delete PK.tx[id]; render(); return col().doc(id).delete().catch(saveErr); }
const delDoc = remove;
/* funga kumbukumbu hai → iwe muamala wa siku hii */
function archive(id, fields) { return patch(id, { ...(fields || {}), k: "tx", day: today(), closedAt: Date.now() }); }
function saveErr(e) { toast(e && e.code === "permission-denied" ? "⛔ Haikuhifadhika — muda wa mfumo umeisha au huna ruhusa." : "⚠️ Haikuhifadhika mtandaoni — itajaribu tena mtandao ukirudi."); }
function newId(prefix) { return prefix + "_" + uid(); }
async function saveSettings(p) { PK.settings = { ...PK.settings, ...p }; render(); return col().doc("pk_settings").set(clean({ k: "cfg", t: "settings", id: "pk_settings", ...PK.settings })).catch(saveErr); }
/* namba ya risiti/oda inayofuatana */
async function nextNo(key) {
  const ref = col().doc("pk_settings");
  try {
    return await db.runTransaction(async (tr) => {
      const s = await tr.get(ref); const d = (s.exists && s.data()) || {}; const n = (Number(d["no_" + key]) || 0) + 1;
      tr.set(ref, { ["no_" + key]: n, k: "cfg", t: "settings", id: "pk_settings" }, { merge: true }); return n;
    });
  } catch (e) { const n = (Number(PK.settings["no_" + key]) || 0) + 1; PK.settings["no_" + key] = n; return n; }
}
/* ripoti za zamani kuliko siku 31 */
async function loadRange(from, to) {
  const snap = await col().where("day", ">=", from).get();
  PK.extraTx = {}; snap.forEach((d) => { const v = d.data(); if (v.day <= to) PK.extraTx[d.id] = { ...v, id: d.id }; });
  render(); return PK.extraTx;
}
let _unsub = [];
function listen() {
  _unsub.forEach((u) => u()); _unsub = [];
  _unsub.push(col().where("k", "==", "cfg").onSnapshot((snap) => {
    const m = {}; snap.forEach((d) => { const v = d.data(); m[d.id] = { ...v, id: d.id }; });
    PK.settings = m.pk_settings || {}; delete m.pk_settings; PK.cfg = m; PK.loaded.cfg = true; afterData();
  }, onErr));
  _unsub.push(col().where("day", ">=", addDays(today(), -PK.TX_DAYS)).onSnapshot((snap) => {
    const m = {}; snap.forEach((d) => { const v = d.data(); if (v.k === "tx") m[d.id] = { ...v, id: d.id }; });
    PK.tx = m; PK.loaded.tx = true; afterData();
  }, onErr));
}
function onErr(e) { PK.msg = e && e.code === "permission-denied" ? "Mfumo umefungwa — muda wa malipo umeisha au huna ruhusa." : "Hitilafu ya mtandao."; PK.ready = true; render(); }
function afterData() {
  if (!PK.loaded.cfg || !PK.loaded.tx) return;
  PK.ready = true;
  if (PK.user && PK.user.id !== "admin") { const fresh = users().find((u) => u.id === PK.user.id); if (!fresh || fresh.active === false) PK.user = null; else PK.user = fresh; }
  if (PK.pack && PK.pack.onData) try { PK.pack.onData(); } catch (e) { console.error(e); }
  render();
}

/* ---------- watumiaji (PIN) ---------- */
function users() { return list("user").sort((a, b) => (a.role === "owner" ? -1 : 0) - (b.role === "owner" ? -1 : 0) || a.name.localeCompare(b.name)); }
async function pinHash(id, pin) {
  const data = new TextEncoder().encode("pk:" + id + ":" + pin);
  if (crypto && crypto.subtle) { const b = await crypto.subtle.digest("SHA-256", data); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""); }
  return "plain:" + pin;
}
function roleOk(roles) { if (!PK.user) return false; if (PK.user.role === "owner" || !roles) return true; return roles.includes(PK.user.role); }
function roleName(r) { if (r === "owner") return "Mmiliki"; const x = (PK.pack.roles || []).find((y) => y[0] === r); return x ? x[1] : r; }
async function doSetup() {
  const s = PK.setup; if (!s.name.trim()) return say("Andika jina lako."); if (!/^\d{4,6}$/.test(s.pin)) return say("PIN iwe namba 4 hadi 6."); if (s.pin !== s.pin2) return say("PIN mbili hazifanani.");
  const id = newId("user"); const u = { id, t: "user", name: s.name.trim(), role: "owner", pinHash: await pinHash(id, s.pin), active: true };
  await save(u); PK.user = u; remember(u.id); PK.setup = { name: "", pin: "", pin2: "" }; PK.msg = ""; go(PK.pack.home);
}
async function doPin() {
  const u = users().find((x) => x.id === PK.pickUser); const pin = val("pk-pin");
  if (!u) return say("Chagua jina lako.");
  if (u.pinHash === (await pinHash(u.id, pin))) { PK.user = u; PK.msg = ""; remember(u.id); go(firstPage()); } else say("PIN si sahihi.");
}
function lock() { PK.user = null; try { sessionStorage.removeItem("pk_sess"); } catch (e) {} render(); }
function remember(id) { try { sessionStorage.setItem("pk_sess", id); localStorage.setItem("pk_last", id); } catch (e) {} }
function say(m) { PK.msg = m; render(); }

/* ---------- urambazaji ---------- */
const COMMON = [
  { id: "watu", label: "Watumiaji", icon: "👥", roles: ["meneja"], render: pageUsers },
  { id: "mipangilio", label: "Mipangilio", icon: "⚙️", roles: [], render: pageSettings },
];
function pages() { return (PK.pack.pages || []).concat(COMMON); }
function navPages() { return pages().filter((p) => roleOk(p.roles)); }
function firstPage() { const n = navPages(); return (n.find((p) => p.id === PK.pack.home) || n[0] || {}).id; }
function go(id) { PK.page = id; PK.q = ""; PK._noKeep = true; window.scrollTo(0, 0); render(); }

/* ---------- UI ---------- */
function toast(m) { let t = $("#pk-toast"); if (!t) { t = document.createElement("div"); t.id = "pk-toast"; t.className = "toast"; document.body.appendChild(t); } t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600); }
function modal(html, wide, after) { PK._noKeep = true; PK.modalAfter = after || null; PK.modalHtml = `<div class="pk-ov" onclick="if(event.target===this)closeModal()"><div class="pk-md ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div></div>`; render(); setTimeout(() => { const a = document.activeElement; if (a && a.closest && a.closest(".pk-md") && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return; const f = document.querySelector(".pk-md input:not([type=checkbox]),.pk-md select"); f && f.focus(); }, 30); }
function closeModal() { if (PK.modalFn) try { PK.modalFn(); } catch (e) {} PK.modalHtml = ""; PK.modalFn = null; PK.modalAfter = null; render(); }
function mhead(title) { return `<div class="hd"><h3>${esc(title)}</h3><button class="btn g" onclick="closeModal()" aria-label="Funga">✕</button></div>`; }
function confirmBox(text, onYes, yesLabel) { PK._yes = onYes; modal(`${mhead("Thibitisha")}<p style="margin:0">${esc(text)}</p><div class="row" style="justify-content:flex-end"><button class="btn" onclick="closeModal()">Hapana</button><button class="btn p" onclick="const f=PK._yes;closeModal();f&&f()">${esc(yesLabel || "Ndiyo")}</button></div>`); }
function empty(text, btn) { return `<div class="empty">${text}${btn || ""}</div>`; }
function kpi(label, value, ac) { return `<div class="kpi ${ac ? "ac" : ""}"><span>${esc(label)}</span><b>${value}</b></div>`; }
function opt(arr, cur) { return arr.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(l)}</option>`; }).join(""); }
/* chati ya nguzo: rows=[{label, value}] */
function bars(rows, fmt) {
  fmt = fmt || n0; const W = 640, H = 200, pl = 8, pb = 26, max = Math.max(1, ...rows.map((r) => r.value)); const bw = (W - pl * 2) / Math.max(rows.length, 1);
  return `<div class="bars"><svg viewBox="0 0 ${W} ${H + 20}" role="img" aria-label="Chati" style="width:100%;height:auto">${rows.map((r, i) => { const h = (r.value / max) * (H - pb - 18); const x = pl + i * bw + bw * 0.15, w = bw * 0.7, y = H - pb - h; return `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(h, 1)}" rx="4" fill="var(--ac)" opacity="${i === rows.length - 1 ? 1 : 0.55}"><title>${esc(r.label)}: ${esc(fmt(r.value))}</title></rect>${rows.length <= 16 || i % Math.ceil(rows.length / 16) === 0 ? `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${esc(r.label)}</text>` : ""}`; }).join("")}<line x1="${pl}" x2="${W - pl}" y1="${H - pb}" y2="${H - pb}" stroke="var(--ln)"/></svg></div>`;
}
/* jumla ya kila siku kwa siku n zilizopita */
function dailySeries(items, n, valueOf) {
  const out = []; for (let i = n - 1; i >= 0; i--) { const d = addDays(today(), -i); out.push({ day: d, label: d.slice(8), value: items.filter((x) => x.day === d).reduce((s, x) => s + valueOf(x), 0) }); }
  return out;
}

/* ---------- vifaa vya pamoja kwa pakiti ---------- */
const METHODS = [["cash", "Taslimu"], ["mpesa", "M-Pesa"], ["tigo", "Mixx by Yas"], ["airtel", "Airtel Money"], ["halo", "HaloPesa"], ["bank", "Benki / Kadi"], ["credit", "Mkopo (deni)"]];
function methodName(k) { const m = METHODS.find((x) => x[0] === k); return m ? m[1] : k || "—"; }
/* ongeza/punguza namba (stock n.k.) bila kupoteza mabadiliko ya vifaa vingine */
function bump(id, field, delta) {
  const d = get(id); if (!d) return Promise.resolve();
  const ks = field.split("."); let o = d; ks.slice(0, -1).forEach((k) => { o[k] = o[k] && typeof o[k] === "object" ? o[k] : {}; o = o[k]; });
  const last = ks[ks.length - 1]; o[last] = (Number(o[last]) || 0) + delta; d.at = Date.now();
  return col().doc(id).update({ [field]: firebase.firestore.FieldValue.increment(delta), at: Date.now() }).catch(saveErr);
}
/* badilisha sehemu moja tu ya hati (mf. hali ya mstari mmoja wa oda) — salama vifaa vingi vikiandika */
function setField(id, path, value) {
  const d = get(id); if (!d) return Promise.resolve();
  const ks = path.split("."); let o = d; ks.slice(0, -1).forEach((k) => { o[k] = o[k] && typeof o[k] === "object" ? o[k] : {}; o = o[k]; }); o[ks[ks.length - 1]] = value; d.at = Date.now();
  render(); return col().doc(id).update({ [path]: value, at: Date.now() }).catch(saveErr);
}
function pushTo(id, field, vals) {
  const d = get(id); if (!d) return Promise.resolve(); vals = clean(vals);
  d[field] = (d[field] || []).concat(vals); d.at = Date.now();
  render(); return col().doc(id).update({ [field]: firebase.firestore.FieldValue.arrayUnion(...vals), at: Date.now() }).catch(saveErr);
}
/* malipo: checkout({total, title, credit:true, customer, phone, onPay(p)}) */
function checkout(o) {
  PK._co = { method: "cash", ...o };
  const draw = () => {
    const c = PK._co, cash = c.method === "cash", cr = c.method === "credit";
    modal(`${mhead(o.title || "Malipo")}
      <div class="total"><span class="sm mu" style="font-family:var(--fb)">Jumla ya kulipa</span><span>${tzs(o.total)}</span></div>
      <div class="chips">${METHODS.filter((m) => m[0] !== "credit" || o.credit).map((m) => `<button class="chip ${c.method === m[0] ? "on" : ""}" onclick="PK._co.method='${m[0]}';PK._co.redraw()">${m[1]}</button>`).join("")}</div>
      ${cash ? `<label class="l">Pesa aliyotoa<input id="co-got" class="f" inputmode="numeric" placeholder="${n0(o.total)}" oninput="const g=num(this.value);document.getElementById('co-ch').textContent=g>=${o.total}?'Chenji: '+tzs(g-${o.total}):'Pungufu: '+tzs(${o.total}-g)"></label><div id="co-ch" class="okm">&nbsp;</div>` : ""}
      ${!cash && !cr ? `<label class="l">Namba ya muamala (si lazima)<input id="co-ref" class="f" placeholder="mf. QK7ABC123"></label>` : ""}
      ${cr || o.askCustomer ? `<div class="form"><label class="l">Jina la mteja${cr ? " *" : ""}<input id="co-cust" class="f" value="${esc(c.customer || "")}"></label><label class="l">Simu<input id="co-phone" class="f" inputmode="tel" value="${esc(c.phone || "")}"></label>${cr ? `<label class="l">Kiasi anacholipa sasa<input id="co-part" class="f" inputmode="numeric" placeholder="0"></label>` : ""}</div>` : ""}
      <button class="btn p big" onclick="checkoutDone()">✅ Thibitisha ${tzs(o.total)}</button>`);
  };
  PK._co.redraw = draw; draw();
}
function checkoutDone() {
  const c = PK._co, total = c.total; let paid = total, change = 0, balance = 0;
  if (c.method === "cash") { const g = num(val("co-got")); if (g && g < total) return toast("Pesa haitoshi — chagua Mkopo kama analipa sehemu"); change = g ? g - total : 0; }
  const customer = val("co-cust") || c.customer || "", phone = val("co-phone") || c.phone || "";
  if (c.method === "credit") { if (!customer) return toast("Andika jina la mteja wa deni"); paid = Math.min(num(val("co-part")), total); balance = total - paid; }
  const p = { method: c.method, paid, change, balance, customer, phone, ref: val("co-ref") || "" };
  closeModal(); c.onPay && c.onPay(p);
}
/* kipindi cha ripoti */
PK.range = "leo";
function rangeFrom() { return PK.range === "leo" ? today() : PK.range === "jana" ? addDays(today(), -1) : addDays(today(), -(Number(PK.range) - 1)); }
function inRange(day) { const f = rangeFrom(); return day >= f && (PK.range === "jana" ? day === f : day <= today()); }
function rangeChips() { return `<div class="chips">${[["leo", "Leo"], ["jana", "Jana"], ["7", "Siku 7"], ["30", "Siku 30"]].map(([k, l]) => `<button class="chip ${PK.range === k ? "on" : ""}" onclick="PK.range='${k}';render()">${l}</button>`).join("")}</div>`; }
function rangeDays() { return PK.range === "leo" || PK.range === "jana" ? 1 : Number(PK.range); }
function searchBox(ph) { return `<input id="pk-q" class="f" type="search" placeholder="${esc(ph || "Tafuta…")}" value="${esc(PK.q || "")}" oninput="PK.q=this.value;soft()" style="max-width:340px">`; }
function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map((x) => { x = String(x == null ? "" : x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = name + ".csv"; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 500);
}
/* jumla kwa kundi: groupSum(items, keyFn, valFn) → [{key,value,count}] */
function groupSum(items, kf, vf) { const m = {}; items.forEach((x) => { const k = kf(x) || "—"; m[k] = m[k] || { key: k, value: 0, count: 0 }; m[k].value += vf(x); m[k].count++; }); return Object.values(m).sort((a, b) => b.value - a.value); }
function methodRows(sales) { return groupSum(sales, (s) => methodName(s.method), (s) => Number(s.paid) || 0); }
/* barcode: scanner ya USB/Bluetooth huandika haraka kisha Enter */
(function () {
  let buf = "", last = 0;
  document.addEventListener("keydown", (e) => {
    if (!PK.pack || !PK.pack.onScan || !PK.user) return;
    const t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
    const now = Date.now(); if (now - last > 60) buf = ""; last = now;
    if (e.key === "Enter") { if (buf.length >= 6 && !typing) { e.preventDefault(); PK.pack.onScan(buf); } buf = ""; return; }
    if (e.key.length === 1) buf += e.key;
  }, true);
})();
async function cameraScan(cb) {
  if (!("BarcodeDetector" in window)) return toast("Kifaa hiki hakina kamera-skana. Tumia scanner au andika namba.");
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); } catch (e) { return toast("Kamera haijaruhusiwa"); }
  const ov = document.createElement("div"); ov.className = "pk-ov"; ov.style.zIndex = 80;
  ov.innerHTML = `<div class="pk-md"><div class="hd"><h3>Skani barcode</h3><button class="btn g" aria-label="Funga">✕</button></div><video playsinline style="width:100%;border-radius:10px;background:#000"></video><p class="mu sm" style="margin:0">Elekeza kamera kwenye barcode.</p></div>`;
  document.body.appendChild(ov);
  const v = ov.querySelector("video"); v.srcObject = stream; await v.play().catch(() => {});
  const det = new BarcodeDetector(); let done = false;
  const stop = () => { if (done) return; done = true; stream.getTracks().forEach((t) => t.stop()); ov.remove(); };
  ov.querySelector("button").onclick = stop;
  const tick = async () => { if (done) return; try { const r = await det.detect(v); if (r[0]) { stop(); cb(r[0].rawValue); return; } } catch (e) {} setTimeout(tick, 250); };
  tick();
}

/* ---------- risiti ---------- */
function biz() { return { name: (SHOP && SHOP.name) || "", phone: S("phone", (SHOP && SHOP.phone) || ""), address: S("address", (SHOP && SHOP.location) || ""), tin: S("tin", ""), footer: S("footer", "Asante kwa kuja! Karibu tena.") }; }
function receiptText(r) {
  const b = biz(); const L = [];
  L.push("*" + b.name + "*"); if (b.phone) L.push("Simu: " + b.phone);
  L.push((r.title || "RISITI") + (r.no ? " #" + r.no : "")); L.push(fdate(today()) + " " + hm(Date.now()));
  if (r.customer) L.push("Mteja: " + r.customer);
  L.push("------------------------");
  (r.items || []).forEach((i) => L.push(`${i.name} x${i.qty} = ${n0(i.qty * i.price)}`));
  L.push("------------------------");
  if (r.discount) L.push("Punguzo: -" + n0(r.discount));
  L.push("JUMLA: TSh " + n0(r.total));
  if (r.paid != null) L.push("Amelipa: TSh " + n0(r.paid) + (r.method ? " (" + r.method + ")" : ""));
  if (r.balance) L.push("Deni: TSh " + n0(r.balance));
  (r.notes || []).forEach((x) => L.push(x));
  L.push(b.footer); return L.join("\n");
}
function receipt(r) {
  const b = biz();
  const html = `${mhead(r.title || "Risiti")}<div class="rc">
    <div class="c b">${esc(b.name)}</div>${b.address ? `<div class="c">${esc(b.address)}</div>` : ""}${b.phone ? `<div class="c">Simu: ${esc(b.phone)}</div>` : ""}${b.tin ? `<div class="c">TIN: ${esc(b.tin)}</div>` : ""}
    <hr><div class="ln"><span>${esc(r.title || "RISITI")}${r.no ? " #" + esc(r.no) : ""}</span><span>${fdate(today())} ${hm(Date.now())}</span></div>
    ${r.customer ? `<div>Mteja: ${esc(r.customer)}</div>` : ""}${r.by !== false && PK.user ? `<div>Mhudumu: ${esc(PK.user.name)}</div>` : ""}<hr>
    ${(r.items || []).map((i) => `<div class="ln"><span>${esc(i.name)} ×${i.qty}</span><span>${n0(i.qty * i.price)}</span></div>`).join("")}<hr>
    ${r.discount ? `<div class="ln"><span>Punguzo</span><span>-${n0(r.discount)}</span></div>` : ""}
    <div class="ln b"><span>JUMLA</span><span>TSh ${n0(r.total)}</span></div>
    ${r.paid != null ? `<div class="ln"><span>Amelipa${r.method ? " (" + esc(r.method) + ")" : ""}</span><span>${n0(r.paid)}</span></div>` : ""}
    ${r.change ? `<div class="ln"><span>Chenji</span><span>${n0(r.change)}</span></div>` : ""}
    ${r.balance ? `<div class="ln b"><span>Deni</span><span>${n0(r.balance)}</span></div>` : ""}
    ${(r.notes || []).map((x) => `<div>${esc(x)}</div>`).join("")}<hr><div class="c">${esc(b.footer)}</div></div>
    <div class="row"><input id="rc-phone" class="f" style="flex:1;min-width:150px" inputmode="tel" placeholder="Simu ya mteja (WhatsApp)" value="${esc(r.phone || "")}">
      <button class="btn p" onclick="sendWA(val('rc-phone'))">📲 WhatsApp</button><button class="btn" onclick="window.print()">🖨️ Chapisha</button></div>`;
  PK._rc = r; modal(html);
}
function sendWA(phone) {
  let p = String(phone || "").replace(/\D/g, ""); if (p.startsWith("0")) p = "255" + p.slice(1); if (p && p.length === 9) p = "255" + p;
  const url = (p ? "https://wa.me/" + p : "https://wa.me/") + "?text=" + encodeURIComponent(receiptText(PK._rc || {}));
  window.open(url, "_blank");
}

/* ---------- kurasa za pamoja ---------- */
function pageUsers() {
  const U = users(), max = ed().users || 999, roles = [["owner", "Mmiliki"]].concat(PK.pack.roles || []);
  return `<div class="row between"><p class="mu sm" style="margin:0">Kila mfanyakazi ana jina na PIN yake. Ruhusa zinategemea kazi yake. Mpango wako unaruhusu watumiaji ${max >= 999 ? "bila kikomo" : max}.</p>
    <button class="btn p" onclick="userForm()" ${U.filter((u) => u.active !== false).length >= max ? "disabled" : ""}>＋ Mtumiaji</button></div>
    <div class="tw"><table class="t"><thead><tr><th>Jina</th><th>Kazi</th><th>Hali</th><th></th></tr></thead><tbody>
    ${U.map((u) => `<tr><td><b>${esc(u.name)}</b>${PK.user && u.id === PK.user.id ? ' <span class="pill ac">wewe</span>' : ""}</td><td>${esc(roleName(u.role))}</td><td>${u.active === false ? '<span class="pill bd">amezimwa</span>' : '<span class="pill ok">hai</span>'}</td>
      <td class="r"><button class="btn s" onclick="userForm('${u.id}')">Badilisha</button></td></tr>`).join("")}</tbody></table></div>
    <p class="mu xs" style="margin:0">Roles: ${roles.map((r) => esc(r[1])).join(" · ")}</p>`;
}
function userForm(id) {
  const u = id ? get(id) : { name: "", role: (PK.pack.roles && PK.pack.roles[0] && PK.pack.roles[0][0]) || "meneja", active: true };
  const roles = [["owner", "Mmiliki"]].concat(PK.pack.roles || []);
  modal(`${mhead(id ? "Badilisha mtumiaji" : "Mtumiaji mpya")}
    <label class="l">Jina<input id="uf-name" class="f" value="${esc(u.name)}"></label>
    <label class="l">Kazi<select id="uf-role" class="f">${opt(roles, u.role)}</select></label>
    <label class="l">${id ? "PIN mpya (acha wazi usibadilishe)" : "PIN (namba 4–6)"}<input id="uf-pin" class="f" type="password" inputmode="numeric" maxlength="6"></label>
    ${id ? `<label class="row sm"><input id="uf-active" type="checkbox" ${u.active !== false ? "checked" : ""}> Yuko hai (anaweza kuingia)</label>` : ""}
    <div class="row" style="justify-content:flex-end"><button class="btn p" onclick="userSave('${id || ""}')">Hifadhi</button></div>`);
}
async function userSave(id) {
  const name = val("uf-name"), role = val("uf-role"), pin = val("uf-pin");
  if (!name) return toast("Andika jina");
  if ((!id || pin) && !/^\d{4,6}$/.test(pin)) return toast("PIN iwe namba 4 hadi 6");
  if (id) {
    const u = get(id); const active = val("uf-active");
    if (u.role === "owner" && (role !== "owner" || !active) && users().filter((x) => x.role === "owner" && x.active !== false).length < 2) return toast("Lazima abaki angalau mmiliki mmoja");
    const p = { name, role, active }; if (pin) p.pinHash = await pinHash(id, pin); await patch(id, p);
  } else { const nid = newId("user"); await save({ id: nid, t: "user", name, role, active: true, pinHash: await pinHash(nid, pin) }); }
  closeModal(); toast("✅ Imehifadhiwa");
}
function pageSettings() {
  const b = biz(), extra = PK.pack.settings || [];
  const fld = (s) => { const v = S(s.key, s.def); return s.type === "select" ? `<label class="l">${esc(s.label)}<select id="st-${s.key}" class="f">${opt(s.options, v)}</select></label>`
    : s.type === "check" ? `<label class="row sm"><input id="st-${s.key}" type="checkbox" ${v ? "checked" : ""}> ${esc(s.label)}</label>`
    : `<label class="l">${esc(s.label)}<input id="st-${s.key}" class="f" type="${s.type || "text"}" value="${esc(v)}"></label>`; };
  return `<div class="card"><h3>Biashara (inaonekana kwenye risiti)</h3><div class="form">
      <label class="l">Simu<input id="st-phone" class="f" value="${esc(b.phone)}"></label>
      <label class="l">Anwani<input id="st-address" class="f" value="${esc(b.address)}"></label>
      <label class="l">TIN<input id="st-tin" class="f" value="${esc(b.tin)}"></label>
      <label class="l">Ujumbe wa chini ya risiti<input id="st-footer" class="f" value="${esc(b.footer)}"></label></div></div>
    ${extra.length ? `<div class="card"><h3>${esc(PK.pack.name)}</h3><div class="form">${extra.map(fld).join("")}</div></div>` : ""}
    <div class="row"><button class="btn p" onclick="settingsSave()">💾 Hifadhi mipangilio</button></div>
    ${dukaSignOutButton().replace(/class="btn btn-ghost"/g, 'class="btn"').replace(/class="panel"/, 'class="card"')}`;
}
function settingsSave() {
  const p = { phone: val("st-phone"), address: val("st-address"), tin: val("st-tin"), footer: val("st-footer") };
  (PK.pack.settings || []).forEach((s) => { const v = val("st-" + s.key); p[s.key] = s.type === "number" ? num(v) : v; });
  saveSettings(p).then(() => toast("✅ Mipangilio imehifadhiwa"));
}

/* ---------- skrini za kuingia ---------- */
function vDevice() {
  const f = PK.login;
  return `<div class="pk-login"><div class="pk-lc">${dukaLoginHeader()}
    <p class="mu sm" style="margin:0">Ingia kwa email na password ulizopewa na E.E.Msango. Kifaa hiki kitakumbukwa.</p>
    <input id="lg-email" class="f" type="email" autocomplete="username" placeholder="Email" value="${esc(f.email)}" oninput="PK.login.email=this.value">
    <input id="lg-pw" class="f" type="password" autocomplete="current-password" placeholder="Password" oninput="PK.login.pw=this.value" onkeydown="if(event.key==='Enter')devLogin()">
    ${f.msg ? `<div class="err">${esc(f.msg)}</div>` : ""}
    <button class="btn p big" onclick="devLogin()">Ingia</button><button class="btn g" onclick="dukaForgot(PK.login.email)">Umesahau password?</button></div></div>`;
}
function devLogin() {
  const f = PK.login; if (!f.email.trim() || !f.pw) { f.msg = "Andika email na password."; return render(); }
  f.msg = "Inaingia…"; render();
  auth.signInWithEmailAndPassword(f.email.trim(), f.pw).then(() => location.reload()).catch((e) => { const c = (e && e.code) || ""; f.msg = /wrong|invalid|not-found/.test(c) ? "Email au password si sahihi." : c.includes("network") ? "Hakuna mtandao." : (e.message || c); render(); });
}
function vSetup() {
  const s = PK.setup;
  return `<div class="pk-login"><div class="pk-lc"><div class="xs mu" style="letter-spacing:.14em;text-transform:uppercase">${esc(PK.pack.name)}</div><h2>${esc(SHOP.name)}</h2>
    <p class="mu sm" style="margin:0">Karibu! Mara ya kwanza: tengeneza akaunti ya mmiliki.</p>
    <input id="su-name" class="f" placeholder="Jina lako" value="${esc(s.name)}" oninput="PK.setup.name=this.value">
    <input id="su-pin" class="f" type="password" inputmode="numeric" maxlength="6" placeholder="PIN (namba 4–6)" oninput="PK.setup.pin=this.value">
    <input id="su-pin2" class="f" type="password" inputmode="numeric" maxlength="6" placeholder="Rudia PIN" oninput="PK.setup.pin2=this.value" onkeydown="if(event.key==='Enter')doSetup()">
    ${PK.msg ? `<div class="err">${esc(PK.msg)}</div>` : ""}<button class="btn p big" onclick="doSetup()">Anza</button></div></div>`;
}
function vPin() {
  const U = users().filter((u) => u.active !== false);
  if (!PK.pickUser) try { PK.pickUser = localStorage.getItem("pk_last"); } catch (e) {}
  return `<div class="pk-login"><div class="pk-lc"><div class="xs mu" style="letter-spacing:.14em;text-transform:uppercase">${esc(PK.pack.name)}</div><h2>${esc(SHOP.name)}</h2>
    <p class="mu sm" style="margin:0">Chagua jina lako, kisha weka PIN.</p>
    <div class="users">${U.map((u) => `<button class="u ${PK.pickUser === u.id ? "on" : ""}" onclick="PK.pickUser='${u.id}';PK.msg='';render();setTimeout(()=>{const p=document.getElementById('pk-pin');p&&p.focus()},30)"><span>${esc(u.name)}</span><small class="mu">${esc(roleName(u.role))}</small></button>`).join("")}</div>
    <input id="pk-pin" class="f" type="password" inputmode="numeric" maxlength="6" placeholder="PIN" onkeydown="if(event.key==='Enter')doPin()">
    ${PK.msg ? `<div class="err">${esc(PK.msg)}</div>` : ""}<button class="btn p big" onclick="doPin()">Ingia</button>
    <p class="mu xs" style="margin:0">Umesahau PIN? Mmiliki anaweza kukubadilishia. Mmiliki akisahau, wasiliana na E.E.Msango.</p></div></div>`;
}
function vLoading(t) { return `<div class="pk-login"><div class="pk-lc"><p class="mu" style="margin:0">${esc(t || "Inafungua mfumo…")}</p>${PK.msg ? `<div class="err">${esc(PK.msg)}</div>` : ""}</div></div>`; }

/* ---------- ganda (shell) ---------- */
function vShell() {
  const N = navPages(); if (!N.find((p) => p.id === PK.page)) PK.page = firstPage();
  const P = pages().find((p) => p.id === PK.page);
  const bot = N.slice(0, 4), more = N.slice(4);
  let body = ""; try { body = P.render(); } catch (e) { console.error(e); body = `<div class="card err">Hitilafu kwenye ukurasa huu: ${esc(e.message)}</div>`; }
  return `${dukaAdminBanner()}${dukaExpiryBanner()}<div class="pk">
    <aside class="pk-side"><div class="pk-brand"><small>${esc(PK.pack.name)}</small><b>${esc(SHOP.name)}</b></div>
      ${N.map((p) => `<button class="pk-nav ${p.id === PK.page ? "on" : ""}" onclick="go('${p.id}')"><i>${p.icon || "•"}</i>${esc(p.label)}${(() => { const x = p.badge && p.badge(); return x ? ` <span class="pill bd" style="margin-left:auto">${x}</span>` : ""; })()}</button>`).join("")}
      <div class="sp"></div><div class="xs" style="opacity:.6;padding:8px">Msango Maduka</div></aside>
    <main class="pk-main"><header class="pk-top"><h2>${esc(P.label)}</h2>${P.actions ? P.actions() : ""}
      <div class="pk-who"><span class="mu">${esc(PK.user.name)}</span><button class="btn s" onclick="lock()" title="Funga">🔒</button></div></header>
      <div class="pk-page">${body}</div></main>
    <nav class="pk-bot">${bot.map((p) => `<button class="${p.id === PK.page ? "on" : ""}" onclick="go('${p.id}')"><i>${p.icon || "•"}</i>${esc(p.label)}</button>`).join("")}${more.length ? `<button class="${more.some((p) => p.id === PK.page) ? "on" : ""}" onclick="moreMenu()"><i>☰</i>Zaidi</button>` : ""}</nav>
  </div>`;
}
function moreMenu() { const N = navPages().slice(4); modal(`${mhead("Zaidi")}<div style="display:grid;gap:6px">${N.map((p) => `<button class="btn" style="justify-content:flex-start" onclick="closeModal();go('${p.id}')">${p.icon || "•"} ${esc(p.label)}</button>`).join("")}</div>`); }

function render() {
  const app = $("#app"); if (!app) return;
  const a = document.activeElement, fid = a && a.id, sel = a && "selectionStart" in a ? [a.selectionStart, a.selectionEnd] : null;
  const pg = document.querySelector(".pk-md"), mscroll = pg ? pg.scrollTop : 0;
  /* hifadhi ulichoandika kwenye fomu ili data mpya ikifika kisifutike */
  const keep = {}; app.querySelectorAll("input[id],select[id],textarea[id]").forEach((el) => {
    if (el.type === "checkbox" || el.type === "radio") { if (el.checked !== el.defaultChecked) keep[el.id] = { c: el.checked }; }
    else if (el.tagName === "SELECT") { const d = [...el.options].find((o) => o.defaultSelected); if (!d || d.value !== el.value) keep[el.id] = { v: el.value }; }
    else if (el.value !== el.defaultValue) keep[el.id] = { v: el.value };
  });
  let html;
  /* msimamizi (E.E.Msango) akiangalia mfumo wa mteja haingii kwa PIN */
  if (typeof SHOP_VIA_ADMIN !== "undefined" && SHOP_VIA_ADMIN && PK.pack && PK.ready && !PK.user) PK.user = { id: "admin", name: "Msimamizi (E.E.Msango)", role: "owner" };
  if (PK.needLogin) html = vDevice();
  else if (PK.adminHome) html = dukaAdminRedirect();
  else if (PK.blocked) html = dukaBlockedView();
  else if (!PK.pack || !PK.ready) html = vLoading();
  else if (!users().length && !PK.user) html = vSetup();
  else if (!PK.user) html = vPin();
  else html = vShell();
  app.innerHTML = html + (PK.user && PK.modalHtml ? PK.modalHtml : "");
  if (PK._noKeep) PK._noKeep = false; else Object.entries(keep).forEach(([id, k]) => { const el = document.getElementById(id); if (!el || el.dataset.fresh) return; if ("c" in k) el.checked = k.c; else el.value = k.v; });
  if (PK.modalHtml && PK.modalAfter && document.querySelector(".pk-md")) try { PK.modalAfter(); } catch (e) { console.error(e); }
  const md = document.querySelector(".pk-md"); if (md) md.scrollTop = mscroll;
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
}
let _soft; function soft() { clearTimeout(_soft); _soft = setTimeout(render, 180); }

/* ---------- kuwasha ---------- */
function setTheme() {
  const key = (SHOP && SHOP.brand && SHOP.brand.theme) || (PRE_BRAND && PRE_BRAND.theme) || (PK.pack && PK.pack.theme) || "asili";
  const t = THEMES[key] || THEMES.asili;
  const side = key === "asili" && SHOP && SHOP.brand && /^#[0-9a-f]{6}$/i.test(SHOP.brand.color || "") ? SHOP.brand.color : t.side;
  const r = document.documentElement.style;
  const v = { "--bg": t.bg, "--sf": t.surface, "--sf2": shade(t.dark ? t.surface : t.bg, t.dark ? 10 : -5), "--ink": t.ink, "--mu": t.muted, "--ln": t.line, "--sd": side, "--ac": t.accent, "--ac2": t.accent2,
    "--aci": t.dark || key === "theluji" ? (t.dark ? "#111" : "#fff") : "#fff", "--fd": `'${t.fd}',Georgia,serif`, "--fb": `'${t.fb}',system-ui,-apple-system,'Segoe UI',sans-serif` };
  Object.entries(v).forEach(([k, x]) => r.setProperty(k, x));
  r.colorScheme = t.dark ? "dark" : "light";
  let link = document.getElementById("pk-fonts"); if (!link) { link = document.createElement("link"); link.id = "pk-fonts"; link.rel = "stylesheet"; document.head.appendChild(link); }
  link.href = fontHref(themeFonts(t));
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", side);
  if (SHOP) document.title = SHOP.name + " — " + ((INDUSTRIES[SHOP.industry] || {}).name || "Msango");
}
function loadPack(industry) {
  return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = industry + ".js?v=1"; s.onload = ok; s.onerror = () => bad(new Error("Pakiti " + industry + " haikupatikana")); document.head.appendChild(s); });
}
function registerPack(p) { PK.pack = p; }
DUKA_HOOK.rerender = () => render();
DUKA_HOOK.pri = "btn p"; DUKA_HOOK.ghost = "btn"; DUKA_HOOK.panel = "card";
(function boot() {
  loadPreBrand().then(() => setTheme());
  setTheme(); render();
  auth.onAuthStateChanged(async (u) => {
    if (!u) { PK.needLogin = true; render(); return; }
    PK.needLogin = false;
    await resolveShop(u);
    if (PK.started) return; PK.started = true;
    if (shopBlocked()) { PK.blocked = true; render(); return; }
    if (adminHome()) { PK.adminHome = true; render(); return; }
    const ind = SHOP.industry || "spea";
    if (ind === "spea") { location.replace(dukaHref("./")); return; }
    setTheme();
    try { await loadPack(ind); } catch (e) { PK.msg = e.message; render(); return; }
    try { const sid = sessionStorage.getItem("pk_sess"); if (sid) PK._restore = sid; } catch (e) {}
    listen();
    const iv = setInterval(() => { if (!PK.ready) return; clearInterval(iv); if (PK._restore && !PK.user) { const u2 = users().find((x) => x.id === PK._restore && x.active !== false); if (u2) { PK.user = u2; PK.page = firstPage(); render(); } } }, 150);
  });
})();
