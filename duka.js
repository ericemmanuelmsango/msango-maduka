/* =====================================================================
   MSANGO MADUKA — mfumo wa maduka ya wateja  · duka.js v3
   Mradi huu ni TOFAUTI kabisa na mfumo wa E.E.MSANGO wa Eric:
   Firebase yake mwenyewe, link yake mwenyewe, data yake mwenyewe.

   ⚙️  Config ya Firebase: project msango--maduka-a-town (imewekwa).
       Wadai (index.html) na POS (pos/) zote zinasoma hapa.
   ===================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDE4CyCyhI2dFUvkIJNXB0Fz5oBpGLRA4Y",
  authDomain: "msango--maduka-a-town.firebaseapp.com",
  projectId: "msango--maduka-a-town",
  storageBucket: "msango--maduka-a-town.firebasestorage.app",
  messagingSenderId: "357014773049",
  appId: "1:357014773049:web:7a2097fd707cca9aa19ce8",
};
const ADMIN_EMAIL = "ericemmanuelmsango2004@gmail.com";   // email utakayoingia nayo kama msimamizi

const EDITIONS = {
  mali:  { name: "Mali Yangu", price: 15000, pos: false, users: 1,   jumla: false, stores: false, profit: false },
  duka:  { name: "DukaSmart",  price: 30000, pos: true,  users: 3,   jumla: false, stores: false, profit: false },
  stoki: { name: "StokiPesa",  price: 45000, pos: true,  users: 6,   jumla: true,  stores: true,  profit: false },
  pro:   { name: "Hesabu Pro", price: 60000, pos: true,  users: 999, jumla: true,  stores: true,  profit: true  },
  full:  { name: "E.E.MSANGO", price: 0,     pos: true,  users: 999, jumla: true,  stores: true,  profit: true  },
};
const HQ_NAME = "MSANGO MADUKA";
let SHOP = null;            // the client shop this device works on
let IS_ADMIN = false;       // signed in with ADMIN_EMAIL = Eric
let SHOP_VIA_ADMIN = false; // Eric opened a client's shop to help them
let SHOP_MISSING = false;   // client device signed in, but the email is not linked to a shop
const DUKA_HOOK = { rerender: null, pri: "btn btn-primary", ghost: "btn btn-ghost", panel: "panel",
  wadaiUrl: "", posUrl: "" };

const CLIENT_MODE = true;   // in this project nobody gets in without an email login
function ed() { return SHOP ? (EDITIONS[SHOP.edition] || EDITIONS.mali) : EDITIONS.full; }
function bizName() { return SHOP ? SHOP.name : HQ_NAME; }
function dukaEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function dukaRerender() { if (DUKA_HOOK.rerender) DUKA_HOOK.rerender(); }
function dukaSlug(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30); }

/* ---------- which shop does this device belong to? ---------- */
async function resolveShop(user) {
  SHOP = null; IS_ADMIN = false; SHOP_VIA_ADMIN = false; SHOP_MISSING = false;
  if (!user || user.isAnonymous) return null;
  const email = (user.email || "").toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) try {
    const q = await db.collection("shops").where("members", "array-contains", email).limit(1).get();
    if (!q.empty) { SHOP = { code: q.docs[0].id, ...q.docs[0].data() }; return SHOP; }
  } catch (e) { /* rules not updated yet, or offline — fall through */ }
  if (email !== ADMIN_EMAIL.toLowerCase()) { SHOP_MISSING = true; return null; }
  IS_ADMIN = true;
  let open = null; try { open = localStorage.getItem("ms_open_shop"); } catch (e) {}
  if (open) {
    try { const d = await db.collection("shops").doc(open).get(); if (d.exists) { SHOP = { code: open, ...d.data() }; SHOP_VIA_ADMIN = true; } } catch (e) {}
  }
  return SHOP;
}
function dataCollection() {
  return db.collection("shops").doc(SHOP.code).collection("data");
}
function shopBlocked() { return SHOP_MISSING || (SHOP && SHOP.active === false && !SHOP_VIA_ADMIN); }
function adminHome() { return IS_ADMIN && !SHOP; }   // Eric with no shop open → the shops console

/* ---------- screens for client devices ---------- */
function dukaBlockedView() {
  if (SHOP_MISSING) {
    const em = auth.currentUser && auth.currentUser.email;
    return `<div style="min-height:80vh;display:grid;place-items:center;padding:20px"><div style="max-width:380px;text-align:center;display:grid;gap:12px">
      <div style="font-size:40px">🏪</div><h2 style="margin:0">Email hii haijaunganishwa na duka</h2>
      <p style="margin:0;opacity:.75;font-size:14px">${dukaEsc(em)} haipo kwenye duka lolote. Wasiliana na E.E.Msango wakuunganishe, au ingia kwa email nyingine.</p>
      <button class="${DUKA_HOOK.pri}" onclick="auth.signOut().then(()=>location.reload())">Ingia kwa email nyingine</button>
    </div></div>`;
  }
  return `<div style="min-height:80vh;display:grid;place-items:center;padding:20px"><div style="max-width:380px;text-align:center;display:grid;gap:12px">
    <div style="font-size:40px">⏸️</div><h2 style="margin:0">Huduma imesimamishwa kwa muda</h2>
    <p style="margin:0;opacity:.75;font-size:14px">Mfumo wa ${dukaEsc(SHOP.name)} umesimamishwa. Data yako iko salama na haijafutwa. Wasiliana na E.E.Msango ili huduma irudi.</p>
  </div></div>`;
}
function dukaAdminBanner() {
  if (!SHOP_VIA_ADMIN) return "";
  return `<div style="position:sticky;top:0;z-index:50;background:#7c2d12;color:#fff;padding:8px 12px;font-size:13px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <b>Uko ndani ya ${dukaEsc(SHOP.name)}</b> (${dukaEsc(ed().name)}) kama msimamizi — unachobadilisha kinaingia kwenye data yake.
    <button style="margin-left:auto;background:#fff;color:#7c2d12;border:0;border-radius:6px;padding:5px 10px;font-weight:700;cursor:pointer" onclick="dukaCloseShop()">← Orodha ya maduka</button></div>`;
}
function dukaOpenShop(code) { try { localStorage.setItem("ms_open_shop", code); } catch (e) {} location.reload(); }
function dukaCloseShop() { try { localStorage.removeItem("ms_open_shop"); } catch (e) {} location.reload(); }

/* ---------- 🏢 Admin: Maduka ya wateja (only Eric) ---------- */
const DUKA_UI = { started: false, list: undefined, msg: "", ok: true, busy: false, created: null,
  form: { name: "", code: "", edition: "duka", email: "", pw: "", phone: "" } };
function dukaApp(name) { return firebase.apps.find((a) => a.name === name) || firebase.initializeApp(firebaseConfig, name); }
function dukaRules(adminEmail) {
  return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null && request.auth.token.email != null; }
    function isAdmin() { return signedIn() && request.auth.token.email == "${adminEmail}"; }
    function shop(code) { return get(/databases/$(database)/documents/shops/$(code)).data; }
    match /shops/{code} {
      allow list: if isAdmin() || (signedIn() && request.auth.token.email in resource.data.members);
      allow get: if isAdmin() || (signedIn() && request.auth.token.email in resource.data.members);
      allow write: if isAdmin();
      match /data/{docId} {
        allow read, write: if isAdmin()
          || (signedIn() && request.auth.token.email in shop(code).members && shop(code).active == true);
      }
    }
  }
}`;
}
function dukaLoad() {
  db.collection("shops").get().then((s) => {
    DUKA_UI.list = s.docs.map((d) => ({ code: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    DUKA_UI.denied = false; dukaRerender();
  }).catch((e) => { DUKA_UI.list = []; DUKA_UI.denied = e && e.code === "permission-denied"; dukaRerender(); });
}
function dukaField(k, v) { DUKA_UI.form[k] = v; if (k === "name" && !DUKA_UI.form._codeTouched) DUKA_UI.form.code = dukaSlug(v); if (k === "code") DUKA_UI.form._codeTouched = true; }
async function dukaCreate() {
  const f = DUKA_UI.form, name = f.name.trim(), code = dukaSlug(f.code || f.name), email = f.email.trim().toLowerCase(), pw = f.pw;
  const fail = (m) => { DUKA_UI.msg = m; DUKA_UI.ok = false; DUKA_UI.busy = false; dukaRerender(); };
  if (!name) return fail("Andika jina la duka.");
  if (code.length < 3) return fail("Code ya duka iwe na herufi 3 au zaidi (mf. kirumba-spare).");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Andika email sahihi ya mteja.");
  if (email === ADMIN_EMAIL.toLowerCase()) return fail("Hii ni email yako ya msimamizi. Mteja anahitaji email yake mwenyewe.");
  if (pw.length < 6) return fail("Password iwe na herufi 6 au zaidi.");
  DUKA_UI.busy = true; DUKA_UI.msg = "Inatengeneza duka…"; DUKA_UI.ok = true; dukaRerender();
  try {
    const ref = db.collection("shops").doc(code);
    const ex = await ref.get();
    if (ex.exists) return fail("Code \"" + code + "\" tayari ina duka. Chagua nyingine.");
    // Create the shop's login on a second, separate connection so YOU stay signed in here.
    const sec = dukaApp("ee-create");
    let existed = false, exposed = false;
    try { await sec.auth().createUserWithEmailAndPassword(email, pw); }
    catch (e) { if (e && e.code === "auth/email-already-in-use") existed = true; else throw e; }
    await ref.set({ name, edition: f.edition, members: [email], ownerEmail: email, phone: f.phone.trim(), active: true,
      createdAt: Date.now(), createdBy: (auth.currentUser && auth.currentUser.email) || "",
      loginPw: existed ? "" : pw });   // kumbukumbu ya password ya mwanzo (inaonekana kwako na kwa mwenye duka tu)
    await ref.collection("data").doc("pos_settings").set({ shop: { name, line: "", tin: "", phone: f.phone.trim(), address: "", footer: "Asante kwa kununua! Karibu tena 🙏" } }, { merge: true });
    if (!existed) {
      // Safety check: a brand-new client login must NOT be able to list every shop. If it can, rules are missing.
      try { const all = await sec.firestore().collection("shops").get({ source: "server" }); exposed = all.size > 0; } catch (e) {}
      await sec.auth().signOut().catch(() => {});
    }
    DUKA_UI.created = { code, name, email, pw: existed ? null : pw, existed, exposed, edition: f.edition };
    DUKA_UI.form = { name: "", code: "", edition: "duka", email: "", pw: "", phone: "" };
    DUKA_UI.msg = "✅ Duka limetengenezwa."; DUKA_UI.ok = true; DUKA_UI.busy = false;
    dukaLoad();
  } catch (e) {
    const c = (e && e.code) || "";
    fail(c === "permission-denied" ? "Firebase imekataa. Weka kwanza rules mpya (hatua ya 1 hapo juu) kisha jaribu tena."
      : c.includes("operation-not-allowed") ? "Washa Email/Password: Firebase Console → Authentication → Sign-in method."
      : c.includes("weak-password") ? "Password ni dhaifu — tumia herufi na namba, angalau 6."
      : c.includes("invalid-email") ? "Email si sahihi."
      : c.includes("network") ? "Hakuna mtandao." : "Imeshindikana: " + ((e && e.message) || c));
  }
}
function dukaUpdate(code, patch, okMsg) {
  db.collection("shops").doc(code).update(patch).then(() => { DUKA_UI.msg = okMsg; DUKA_UI.ok = true; dukaLoad(); })
    .catch((e) => { DUKA_UI.msg = "Haikubadilika: " + ((e && e.message) || ""); DUKA_UI.ok = false; dukaRerender(); });
}
function dukaToggle(code, active) {
  if (!active && !confirm("Simamisha duka hili? Hawataweza kufungua mfumo hadi uwashe tena. Data yao haifutwi.")) return;
  dukaUpdate(code, { active }, active ? "✅ Duka limewashwa." : "⏸️ Duka limesimamishwa.");
}
function dukaEdition(code, edition) { dukaUpdate(code, { edition }, "✅ Edition imebadilishwa kuwa " + EDITIONS[edition].name + "."); }
function dukaAddMember(code) {
  const em = (prompt("Email ya kuongeza kwenye duka hili (lazima iwe imesajiliwa kwenye Firebase Authentication):") || "").trim().toLowerCase();
  if (!em) return;
  dukaUpdate(code, { members: firebase.firestore.FieldValue.arrayUnion(em) }, "✅ " + em + " ameongezwa.");
}
async function dukaDelete(code, name) {
  if (!confirm("FUTA duka \"" + name + "\" pamoja na data yake YOTE? Haiwezi kurudishwa.")) return;
  try {
    const ref = db.collection("shops").doc(code);
    const docs = await ref.collection("data").get();
    for (const d of docs.docs) await d.ref.delete();
    await ref.delete();
    try { if (localStorage.getItem("ms_open_shop") === code) localStorage.removeItem("ms_open_shop"); } catch (e) {}
    if (DUKA_UI.created && DUKA_UI.created.code === code) DUKA_UI.created = null;
    DUKA_UI.msg = "🗑️ Duka \"" + name + "\" limefutwa."; DUKA_UI.ok = true; dukaLoad();
  } catch (e) { DUKA_UI.msg = "Halikufutika: " + ((e && e.message) || ""); DUKA_UI.ok = false; dukaRerender(); }
}
/* ---------- 🔑 Taarifa za kuingia za duka (msimamizi) ---------- */
DUKA_UI.creds = {};   // code -> { loading, appPw, users:[], err }
async function dukaCredsToggle(code) {
  if (DUKA_UI.creds[code]) { delete DUKA_UI.creds[code]; return dukaRerender(); }
  DUKA_UI.creds[code] = { loading: true }; dukaRerender();
  try {
    const col = db.collection("shops").doc(code).collection("data");
    const [main, pos] = await Promise.all([col.doc("data").get(), col.doc("pos_settings").get()]);
    const st = (main.exists && main.data().settings) || {};
    DUKA_UI.creds[code] = { appPw: st.appPassword || "", users: ((pos.exists && pos.data().users) || []).filter((u) => u.active !== false) };
  } catch (e) { DUKA_UI.creds[code] = { err: "Imeshindikana kusoma: " + ((e && e.message) || "") }; }
  dukaRerender();
}
async function dukaSetAppPw(code) {
  const pw = (prompt("Password mpya ya mfumo (Wadai) kwa duka hili — angalau herufi 4:") || "").trim();
  if (!pw) return;
  if (pw.length < 4) return alert("Password iwe na herufi 4 au zaidi.");
  try {
    await db.collection("shops").doc(code).collection("data").doc("data").set({ settings: { appPassword: pw } }, { merge: true });
    DUKA_UI.msg = "✅ Password ya mfumo imebadilishwa kuwa: " + pw; DUKA_UI.ok = true;
    delete DUKA_UI.creds[code]; await dukaCredsToggle(code);
  } catch (e) { DUKA_UI.msg = "Haikubadilika: " + ((e && e.message) || ""); DUKA_UI.ok = false; dukaRerender(); }
}
async function dukaPinHash(userId, pin) {
  const data = new TextEncoder().encode("eepos:" + userId + ":" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function dukaSetPin(code, userId, name) {
  const pin = (prompt("PIN mpya ya POS kwa " + name + " (namba 4 hadi 6):") || "").trim();
  if (!pin) return;
  if (!/^\d{4,6}$/.test(pin)) return alert("PIN iwe namba 4 hadi 6 tu.");
  try {
    const ref = db.collection("shops").doc(code).collection("data").doc("pos_settings");
    const snap = await ref.get();
    const users = ((snap.exists && snap.data().users) || []).map((u) => ({ ...u }));
    const u = users.find((x) => x.id === userId); if (!u) throw new Error("Mtumiaji hakupatikana");
    u.pinHash = await dukaPinHash(userId, pin);
    await ref.set({ users }, { merge: true });
    DUKA_UI.msg = "✅ PIN ya " + name + " sasa ni " + pin; DUKA_UI.ok = true;
    delete DUKA_UI.creds[code]; await dukaCredsToggle(code);
  } catch (e) { DUKA_UI.msg = "Haikubadilika: " + ((e && e.message) || ""); DUKA_UI.ok = false; dukaRerender(); }
}
function dukaNoteLoginPw(code) {
  const pw = (prompt("Andika password ya kuingia uliyokubaliana na mteja (kwa kumbukumbu yako tu):") || "").trim();
  if (!pw) return;
  dukaUpdate(code, { loginPw: pw }, "✅ Kumbukumbu ya password imehifadhiwa.");
}
function dukaCredsView(s) {
  const c = DUKA_UI.creds[s.code]; if (!c) return "";
  const box = "margin-top:8px;padding:10px;border-radius:8px;border:1px dashed rgba(127,127,127,.5);font-size:13px;display:grid;gap:6px";
  if (c.loading) return `<div style="${box}">Inapakia…</div>`;
  if (c.err) return `<div style="${box};color:#b91c1c">${dukaEsc(c.err)}</div>`;
  const row = (label, val, btn) => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="min-width:150px;opacity:.75">${label}</span><b style="font-family:ui-monospace,monospace">${val}</b>${btn || ""}</div>`;
  const b = (fn, t) => `<button class="${DUKA_HOOK.ghost}" style="padding:3px 8px;font-size:12px" onclick="${fn}">${t}</button>`;
  const em = s.ownerEmail || (s.members || [])[0] || "";
  return `<div style="${box}">
    <b>🔑 Taarifa za kuingia</b>
    ${row("1. Email ya kuingia", dukaEsc(em))}
    ${row("2. Password ya kuingia", s.loginPw ? dukaEsc(s.loginPw) : "<i style='opacity:.6'>haijulikani</i>",
      b("dukaReset('" + dukaEsc(em) + "')", "Tuma link ya kubadilisha") + b("dukaNoteLoginPw('" + s.code + "')", "Andika kumbukumbu"))}
    ${row("3. Password ya mfumo (Wadai)", c.appPw ? dukaEsc(c.appPw) : "<i style='opacity:.6'>bado haijawekwa</i>", b("dukaSetAppPw('" + s.code + "')", "Badilisha"))}
    <div style="opacity:.75">4. PIN za POS</div>
    ${c.users.length ? c.users.map((u) => row("&nbsp;&nbsp;" + (u.role === "owner" ? "👑 " : "🧑‍💼 ") + dukaEsc(u.name), "••••", b("dukaSetPin('" + s.code + "','" + u.id + "'," + dukaEsc(JSON.stringify(u.name)) + ")", "Weka PIN mpya"))).join("")
      : `<div style="opacity:.6">&nbsp;&nbsp;Bado hakuna mtumiaji wa POS.</div>`}
    <div style="opacity:.6;font-size:12px">PIN hazionekani (zimefichwa kwa usalama) — ukisahau, weka mpya hapa. Password ya kuingia ikibadilishwa na mteja kwa link, hutaiona tena hapa.</div>
  </div>`;
}
/* "Umesahau password?" on login screens */
function dukaForgot(email) {
  email = (email || "").trim();
  if (!email) return alert("Andika email yako kwanza kwenye kisanduku cha email, kisha bonyeza tena.");
  auth.sendPasswordResetEmail(email).then(() => alert("📧 Tumekutumia link ya kubadilisha password kwenye " + email + ". Angalia Inbox (na Spam)."))
    .catch((e) => alert((e && e.code || "").includes("user-not-found") ? "Email hii haijasajiliwa." : "Haikutumwa: " + ((e && e.message) || "")));
}
function dukaReset(email) {
  auth.sendPasswordResetEmail(email).then(() => { DUKA_UI.msg = "📧 Link ya kubadilisha password imetumwa kwa " + email; DUKA_UI.ok = true; dukaRerender(); })
    .catch((e) => { DUKA_UI.msg = "Haikutumwa: " + ((e && e.message) || ""); DUKA_UI.ok = false; dukaRerender(); });
}
function dukaCopy(id) {
  const el = document.getElementById(id); if (!el) return;
  const t = el.value != null ? el.value : el.textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { DUKA_UI.msg = "📋 Imenakiliwa."; DUKA_UI.ok = true; dukaRerender(); })
    .catch(() => { if (el.select) el.select(); });
}
function dukaWelcome(c) {
  const E = EDITIONS[c.edition] || EDITIONS.mali, w = (DUKA_HOOK.wadaiUrl || ""), p = DUKA_HOOK.posUrl;
  return `Habari! Mfumo wa ${c.name} uko tayari (${E.name}).

Fungua link ${E.pos ? "hizi" : "hii"} kwenye simu yako kwa Chrome, kisha ⋮ → "Add to Home screen":
• Madeni na stock: ${w}${E.pos ? "\n• POS ya mauzo: " + p : ""}

Ingia kwa:
Email: ${c.email}
${c.pw ? "Password: " + c.pw : "Password: ile uliyonayo tayari"}

Mara ya kwanza utaweka password ya mfumo${E.pos ? " na PIN ya POS" : ""}.
— E.E.MSANGO COMPANY LIMITED${c.phone ? "" : ""}`;
}
function dukaAdminPanel() {
  if (!IS_ADMIN) return "";
  if (!DUKA_UI.started) { DUKA_UI.started = true; setTimeout(dukaLoad, 0); }
  const me = (auth.currentUser && auth.currentUser.email) || "EMAIL-YAKO@gmail.com";
  const f = DUKA_UI.form, L = DUKA_UI.list || [];
  const ins = (k, ph, type) => `<input id="dk-${k}" class="field" type="${type || "text"}" placeholder="${ph}" value="${dukaEsc(f[k])}" oninput="dukaField('${k}',this.value)" style="margin-top:6px">`;
  const c = DUKA_UI.created;
  return `<div class="${DUKA_HOOK.panel}" style="margin-top:16px">
    <h3 style="margin-top:0">🏢 Maduka ya wateja</h3>
    <p style="font-size:13px;margin:0 0 8px;opacity:.8">Tengeneza mfumo wa mteja hapa. Kila duka linapata data yake peke yake, na linaingia kwa email yake.</p>
    <details style="margin:10px 0" ${DUKA_UI.denied ? "open" : ""}><summary style="cursor:pointer;font-weight:700">1. Rules za Firebase (weka mara moja)</summary>
      <p style="font-size:12.5px">Firebase Console (project MPYA) → Firestore Database → <b>Rules</b> → futa zilizopo, bandika hizi → <b>Publish</b>.</p>
      <textarea id="dk-rules" class="field" readonly style="width:100%;min-height:200px;font:11px/1.4 ui-monospace,monospace">${dukaEsc(dukaRules(me))}</textarea>
      <button class="${DUKA_HOOK.ghost}" style="margin-top:6px" onclick="dukaCopy('dk-rules')">📋 Nakili rules</button>
    </details>
    <h4 style="margin:12px 0 4px">2. Duka jipya</h4>
    ${ins("name", "Jina la duka (mf. Kirumba Spare Centre)")}
    ${ins("code", "Code ya duka (mf. kirumba-spare)")}
    <select id="dk-edition" class="field" style="margin-top:6px" onchange="dukaField('edition',this.value)">${["mali", "duka", "stoki", "pro"].map((k) => `<option value="${k}" ${f.edition === k ? "selected" : ""}>${EDITIONS[k].name} — TZS ${EDITIONS[k].price.toLocaleString("en-US")}/mwezi</option>`).join("")}</select>
    ${ins("email", "Email ya mteja (ataingia nayo)", "email")}
    ${ins("pw", "Password ya kuanzia (herufi 6+)", "text")}
    ${ins("phone", "Simu ya duka (inaonekana kwenye risiti)", "tel")}
    <button class="${DUKA_HOOK.pri}" style="margin-top:8px;width:100%" ${DUKA_UI.busy ? "disabled" : ""} onclick="dukaCreate()">${DUKA_UI.busy ? "Inatengeneza…" : "Tengeneza mfumo wa mteja"}</button>
    ${DUKA_UI.msg ? `<p style="font-size:13px;margin:8px 0 0;color:${DUKA_UI.ok ? "#15803d" : "#b91c1c"}">${dukaEsc(DUKA_UI.msg)}</p>` : ""}
    ${c ? `<div style="margin-top:10px;border:1px solid #86efac;border-radius:8px;padding:10px">
      ${c.exposed ? `<p style="color:#b91c1c;font-size:13px;margin:0 0 6px"><b>⚠️ Usimpe bado!</b> Email hii mpya iliweza kuona maduka mengine — rules hazijawekwa. Weka rules (hatua ya 1) kwanza.</p>` : ""}
      ${c.existed ? `<p style="font-size:13px;margin:0 0 6px">Email hii ilikuwa tayari imesajiliwa, kwa hiyo password yake ya zamani inabaki.</p>` : ""}
      <b style="font-size:13px">Ujumbe wa kumtumia mteja (WhatsApp):</b>
      <textarea id="dk-welcome" class="field" readonly style="width:100%;min-height:170px;font-size:12.5px;margin-top:6px">${dukaEsc(dukaWelcome(c))}</textarea>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="${DUKA_HOOK.ghost}" onclick="dukaCopy('dk-welcome')">📋 Nakili ujumbe</button>
      <button class="${DUKA_HOOK.pri}" onclick="dukaOpenShop('${c.code}')">Fungua duka hili uingize bidhaa →</button></div></div>` : ""}
    <h4 style="margin:16px 0 4px">3. Maduka yako (${L.length})</h4>
    ${DUKA_UI.list === undefined ? `<p style="font-size:13px;opacity:.7">Inapakia…</p>`
      : DUKA_UI.denied ? `<p style="font-size:13px;color:#b91c1c">Firebase imekataa kusoma orodha — weka rules za hatua ya 1.</p>`
      : !L.length ? `<p style="font-size:13px;opacity:.7">Bado hakuna duka la mteja.</p>`
      : `<div style="overflow-x:auto"><table style="width:100%;font-size:13px;border-collapse:collapse">
        ${L.map((s) => `<tr style="border-top:1px solid rgba(127,127,127,.25)"><td style="padding:8px 4px">
          <b>${dukaEsc(s.name)}</b> ${s.active === false ? `<span style="color:#b91c1c;font-weight:700">· IMESIMAMISHWA</span>` : ""}<br>
          <small style="opacity:.75">${dukaEsc(s.code)} · ${dukaEsc((s.members || []).join(", "))}</small><br>
          <select class="field" style="margin-top:4px;max-width:200px;padding:4px" onchange="dukaEdition('${s.code}',this.value)">${["mali", "duka", "stoki", "pro"].map((k) => `<option value="${k}" ${s.edition === k ? "selected" : ""}>${EDITIONS[k].name}</option>`).join("")}</select>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">
            <button class="${DUKA_HOOK.ghost}" onclick="dukaOpenShop('${s.code}')">Fungua</button>
            <button class="${DUKA_HOOK.ghost}" onclick="dukaCredsToggle('${s.code}')">🔑 Passwords</button>
            <button class="${DUKA_HOOK.ghost}" onclick="dukaToggle('${s.code}',${s.active === false})">${s.active === false ? "Washa" : "Simamisha"}</button>
            <button class="${DUKA_HOOK.ghost}" onclick="dukaAddMember('${s.code}')">+ Email</button>
            <button class="${DUKA_HOOK.ghost}" onclick="dukaReset('${dukaEsc(s.ownerEmail || (s.members || [])[0] || "")}')">Reset password</button>
            <button class="${DUKA_HOOK.ghost}" style="color:#b91c1c" onclick="dukaDelete('${s.code}', ${dukaEsc(JSON.stringify(s.name))})">Futa</button>
          </div>${dukaCredsView(s)}</td></tr>`).join("")}</table></div>`}
  </div>`;
}

/* ---------- the console Eric sees when no shop is open ---------- */
function dukaConsoleView() {
  const em = (auth.currentUser && auth.currentUser.email) || "";
  return `<div style="max-width:760px;margin:0 auto;padding:16px">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
      <div><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">E.E.MSANGO</div>
      <h2 style="margin:0">Msango Maduka — Msimamizi</h2></div>
      <button class="${DUKA_HOOK.ghost}" style="margin-left:auto" onclick="if(confirm('Toka kwenye kifaa hiki?'))auth.signOut().then(()=>location.reload())">Toka (${dukaEsc(em)})</button>
    </div>
    ${dukaAdminPanel()}
  </div>`;
}
function dukaSignOutButton() {
  const u = auth.currentUser; if (!u || IS_ADMIN) return "";
  return `<div class="${DUKA_HOOK.panel}" style="margin-top:16px"><h3 style="margin-top:0">🔐 Kifaa hiki</h3>
    <p style="font-size:13px">Kimeingia kwa <b>${dukaEsc(u.email)}</b> — ${dukaEsc(bizName())} (${dukaEsc(ed().name)}).</p>
    <button class="${DUKA_HOOK.ghost}" onclick="if(confirm('Toa kifaa hiki? Utahitaji email na password kuingia tena.'))auth.signOut().then(()=>location.reload())">Toa kifaa hiki</button></div>`;
}
