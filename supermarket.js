/* =====================================================================
   PAKITI: SUPERMARKET & MINI MARKET  · supermarket.js v1
   Kaunta ya haraka (barcode/scanner), bidhaa & stock, zamu na droo ya pesa,
   wasambazaji & manunuzi, madeni ya wateja, ripoti.
   ===================================================================== */
(function () {
  const SM = { cart: [], disc: 0, cat: "", q: "", filter: "zote" };
  PK.sm = SM;
  const prods = () => list("prod").sort((a, b) => a.name.localeCompare(b.name));
  const cats = () => [...new Set(prods().map((p) => p.cat).filter(Boolean))].sort();
  const low = (p) => (Number(p.qty) || 0) <= (Number(p.min) || 0);
  const myShift = () => list("shift", (s) => s.uid === PK.user.id)[0];
  const needShift = () => S("useShifts", true) !== false;
  const cartTotal = () => SM.cart.reduce((s, i) => s + i.qty * i.price, 0);
  const sales = (pred) => txList("sale", pred);

  /* ---------- KAUNTA ---------- */
  function addToCart(p, qty) {
    if (!p) return;
    const line = SM.cart.find((i) => i.id === p.id);
    if (line) line.qty += qty || 1; else SM.cart.unshift({ id: p.id, name: p.name, price: Number(p.price) || 0, cost: Number(p.cost) || 0, qty: qty || 1 });
    if ((Number(p.qty) || 0) - (line ? line.qty : qty || 1) < 0) toast("⚠️ " + p.name + ": stock inaonyesha imeisha — angalia stoo");
    SM.q = ""; PK._noKeep = true; render();
    setTimeout(() => { const i = document.getElementById("sm-q"); i && i.focus(); }, 20);
  }
  function findCode(code) { code = String(code).trim(); return prods().find((p) => p.code && String(p.code) === code); }
  function qEnter() {
    const q = val("sm-q"); if (!q) { if (SM.cart.length) pay(); return; }
    const m = /^(\d+)\*(.+)$/.exec(q); const qty = m ? Number(m[1]) : 1, term = m ? m[2] : q;
    const p = findCode(term) || prods().filter((x) => match(x.name + " " + (x.code || ""), term))[0];
    if (p) addToCart(p, qty); else toast("Haikupatikana: " + term);
  }
  function setQty(id, d) { const l = SM.cart.find((i) => i.id === id); if (!l) return; l.qty = Math.max(0, +(l.qty + d).toFixed(3)); if (!l.qty) SM.cart = SM.cart.filter((i) => i !== l); render(); }
  function editLine(id) {
    const l = SM.cart.find((i) => i.id === id); if (!l) return;
    modal(`${mhead(l.name)}<div class="form"><label class="l">Idadi<input id="ln-q" class="f" inputmode="decimal" value="${l.qty}"></label>
      <label class="l">Bei moja${roleOk(["meneja"]) ? "" : " (meneja tu)"}<input id="ln-p" class="f" inputmode="numeric" value="${l.price}" ${roleOk(["meneja"]) ? "" : "disabled"}></label></div>
      <div class="row between"><button class="btn d" onclick="PK.sm.cart=PK.sm.cart.filter(i=>i.id!=='${id}');closeModal()">Ondoa</button><button class="btn p" onclick="smLineSave('${id}')">Sawa</button></div>`);
  }
  window.smLineSave = (id) => { const l = SM.cart.find((i) => i.id === id); l.qty = Math.max(0, num(val("ln-q"))); if (roleOk(["meneja"])) l.price = num(val("ln-p")); if (!l.qty) SM.cart = SM.cart.filter((i) => i !== l); closeModal(); };
  function pay() {
    if (!SM.cart.length) return toast("Kikapu kiko tupu");
    if (needShift() && !myShift()) return toast("Fungua zamu kwanza");
    const total = Math.max(0, cartTotal() - SM.disc);
    checkout({ total, title: "Lipa — vitu " + SM.cart.length, credit: true, onPay: (p) => finishSale(total, p) });
  }
  async function finishSale(total, p) {
    const items = SM.cart.map((i) => ({ ...i })), disc = SM.disc, sh = myShift();
    SM.cart = []; SM.disc = 0;
    const no = await nextNo("sale");
    const sale = { id: newId("sale"), t: "sale", k: "tx", no, items, total, discount: disc, ...p, shift: sh ? sh.id : "", uid: PK.user.id, cashier: PK.user.name, time: Date.now() };
    save(sale);
    items.forEach((i) => bump(i.id, "qty", -i.qty));
    if (p.balance > 0) addDebt(p.customer, p.phone, p.balance, no);
    receipt({ title: "RISITI", no, items, total, discount: disc, paid: p.paid, method: methodName(p.method), change: p.change, balance: p.balance, customer: p.customer, phone: p.phone });
  }
  function addDebt(name, phone, amt, no) {
    const d = list("debt", (x) => x.name.toLowerCase() === name.toLowerCase())[0];
    if (d) patch(d.id, { amount: (Number(d.amount) || 0) + amt, phone: phone || d.phone, sales: (d.sales || []).concat(no) });
    else save({ id: newId("debt"), t: "debt", name, phone, amount: amt, paidSum: 0, sales: [no], since: today() });
  }
  function openShift() {
    const f = num(val("sh-float"));
    save({ id: newId("shift"), t: "shift", uid: PK.user.id, name: PK.user.name, openAt: Date.now(), float: f, day: today() });
    toast("✅ Zamu imefunguliwa"); setTimeout(() => { const i = document.getElementById("sm-q"); i && i.focus(); }, 50);
  }
  function pageKaunta() {
    if (needShift() && !myShift()) return `<div class="card" style="max-width:460px"><h3>Fungua zamu</h3>
      <p class="mu sm" style="margin:0">Kabla ya kuuza, hesabu pesa iliyopo kwenye droo (float). Mwisho wa zamu mfumo utakuonyesha pesa inayotakiwa kuwepo.</p>
      <label class="l">Pesa ya kuanzia kwenye droo<input id="sh-float" class="f" inputmode="numeric" placeholder="mf. 50,000"></label>
      <button class="btn p big" onclick="PK.pack.openShift()">Fungua zamu</button></div>`;
    const P = prods(), q = SM.q, C = cats();
    const shown = (q ? P.filter((x) => match(x.name + " " + (x.code || "") + " " + (x.cat || ""), q)) : P.filter((x) => !SM.cat || x.cat === SM.cat)).slice(0, 60);
    const tot = cartTotal();
    return `<div class="split"><div style="display:grid;gap:12px;min-width:0">
      <div class="row"><input id="sm-q" class="f" style="flex:1;font-size:18px;padding:12px 14px" autocomplete="off" placeholder="Skani barcode au andika jina…  (3*sukari = 3)" value="${esc(q)}" oninput="PK.sm.q=this.value;soft()" onkeydown="if(event.key==='Enter'){event.preventDefault();PK.pack.qEnter()}">
        <button class="btn" onclick="cameraScan(c=>PK.pack.scan(c))" title="Skani kwa kamera">📷</button></div>
      ${C.length && !q ? `<div class="chips"><button class="chip ${!SM.cat ? "on" : ""}" onclick="PK.sm.cat='';render()">Zote</button>${C.map((c) => `<button class="chip ${SM.cat === c ? "on" : ""}" onclick="PK.sm.cat='${esc(c)}';render()">${esc(c)}</button>`).join("")}</div>` : ""}
      ${P.length ? `<div class="prods">${shown.map((p) => `<button class="prod ${(Number(p.qty) || 0) <= 0 ? "out" : ""}" onclick="PK.pack.add('${p.id}')"><b>${esc(p.name)}</b><span>${n0(p.price)}</span><small>${n0(p.qty)} ${esc(p.unit || "")}${low(p) ? " · ⚠️" : ""}</small></button>`).join("")}</div>`
        : empty("Bado hakuna bidhaa.", roleOk(["meneja", "stoka"]) ? `<button class="btn p" onclick="go('bidhaa')">＋ Ongeza bidhaa</button>` : "")}
    </div>
    <div class="card sticky"><div class="row between"><h3>Kikapu</h3>${SM.cart.length ? `<button class="btn g s" onclick="PK.sm.cart=[];PK.sm.disc=0;render()">Futa</button>` : ""}</div>
      ${SM.cart.length ? `<div class="cart">${SM.cart.map((i) => `<div class="cline"><button class="btn g" style="justify-content:flex-start;padding:0;text-align:left;white-space:normal;color:var(--ink);font-weight:400" onclick="PK.pack.editLine('${i.id}')"><span><b>${esc(i.name)}</b><br><small class="mu">${n0(i.price)} × ${i.qty}</small></span></button>
        <div style="text-align:right"><b class="num">${n0(i.qty * i.price)}</b><div class="q"><button onclick="PK.pack.setQty('${i.id}',-1)" aria-label="Punguza">−</button><button onclick="PK.pack.setQty('${i.id}',1)" aria-label="Ongeza">＋</button></div></div></div>`).join("")}</div>` : `<p class="mu sm" style="margin:0">Skani au bonyeza bidhaa kuiongeza.</p>`}
      ${SM.cart.length && roleOk(["meneja"]) ? `<label class="l">Punguzo<input id="sm-disc" class="f" inputmode="numeric" value="${SM.disc || ""}" placeholder="0" oninput="PK.sm.disc=num(this.value);soft()"></label>` : ""}
      <div class="total"><span>Jumla</span><span class="num">${n0(Math.max(0, tot - SM.disc))}</span></div>
      <button class="btn p big" onclick="PK.pack.pay()" ${SM.cart.length ? "" : "disabled"}>💳 Lipa  <small style="opacity:.7">(Enter tupu / F2)</small></button>
      ${SM.cart.length ? `<div class="mbar"><span>${SM.cart.length} bidhaa · <span class="num">${n0(Math.max(0, tot - SM.disc))}</span></span><button class="btn p" onclick="PK.pack.pay()">💳 Lipa</button></div>` : ""}
    </div></div>`;
  }

  /* ---------- BIDHAA ---------- */
  function prodForm(id) {
    const p = id ? get(id) : { name: "", code: "", cat: "", unit: "pc", price: "", cost: "", qty: "", min: 5 };
    const S2 = list("sup");
    modal(`${mhead(id ? "Badilisha bidhaa" : "Bidhaa mpya")}<div class="form">
      <label class="l" style="grid-column:1/-1">Jina<input id="pf-name" class="f" value="${esc(p.name)}"></label>
      <label class="l">Barcode<span class="row" style="flex-wrap:nowrap"><input id="pf-code" class="f" value="${esc(p.code || "")}" placeholder="skani hapa"><button class="btn" onclick="cameraScan(c=>{document.getElementById('pf-code').value=c})">📷</button></span></label>
      <label class="l">Kundi<input id="pf-cat" class="f" list="pf-cats" value="${esc(p.cat || "")}" placeholder="mf. Vinywaji"><datalist id="pf-cats">${cats().map((c) => `<option value="${esc(c)}">`).join("")}</datalist></label>
      <label class="l">Kipimo<select id="pf-unit" class="f">${opt([["pc", "Kipande"], ["kg", "Kilo"], ["l", "Lita"], ["ctn", "Katoni"], ["pkt", "Pakiti"]], p.unit)}</select></label>
      <label class="l">Bei ya kuuza<input id="pf-price" class="f" inputmode="numeric" value="${esc(p.price)}"></label>
      <label class="l">Bei ya kununua<input id="pf-cost" class="f" inputmode="numeric" value="${esc(p.cost)}"></label>
      ${id ? "" : `<label class="l">Stock ya mwanzo<input id="pf-qty" class="f" inputmode="decimal" value="${esc(p.qty)}"></label>`}
      <label class="l">Tahadhari stock ikifika<input id="pf-min" class="f" inputmode="numeric" value="${esc(p.min)}"></label>
      <label class="l">Msambazaji<select id="pf-sup" class="f"><option value="">—</option>${opt(S2.map((s) => [s.id, s.name]), p.sup)}</select></label></div>
      <div class="row between">${id ? `<button class="btn d" onclick="confirmBox('Futa ${esc(p.name).replace(/'/g, "")}?',()=>{delDoc('${id}');toast('Imefutwa')},'Futa')">Futa</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.prodSave('${id || ""}')">Hifadhi</button></div>`);
  }
  function prodSave(id) {
    const d = { name: val("pf-name"), code: val("pf-code"), cat: val("pf-cat"), unit: val("pf-unit"), price: num(val("pf-price")), cost: num(val("pf-cost")), min: num(val("pf-min")), sup: val("pf-sup") };
    if (!d.name) return toast("Andika jina");
    if (d.code) { const dup = prods().find((x) => x.code === d.code && x.id !== id); if (dup) return toast("Barcode hii ni ya " + dup.name); }
    if (id) patch(id, d); else save({ id: newId("prod"), t: "prod", ...d, qty: num(val("pf-qty")) });
    closeModal(); toast("✅ Imehifadhiwa");
  }
  function adjForm(id) {
    const p = get(id);
    modal(`${mhead("Stock: " + p.name)}<p class="mu sm" style="margin:0">Iliyopo kwenye mfumo: <b>${n0(p.qty)} ${esc(p.unit || "")}</b></p>
      <div class="chips"><button class="chip on" id="aj-m-in" onclick="this.classList.add('on');document.getElementById('aj-m-set').classList.delDoc('on')">＋ Ongeza</button><button class="chip" id="aj-m-set" onclick="this.classList.add('on');document.getElementById('aj-m-in').classList.delDoc('on')">= Hesabu halisi</button></div>
      <label class="l">Idadi<input id="aj-q" class="f" inputmode="decimal"></label><label class="l">Sababu<input id="aj-why" class="f" placeholder="mf. mzigo mpya, imeharibika, hesabu ya mwezi"></label>
      <button class="btn p" onclick="PK.pack.adjSave('${id}')">Hifadhi</button>`);
  }
  function adjSave(id) {
    const p = get(id), q = num(val("aj-q")), set = document.getElementById("aj-m-set").classList.contains("on");
    const delta = set ? q - (Number(p.qty) || 0) : q; if (!delta) return closeModal();
    bump(id, "qty", delta); save({ id: newId("adj"), t: "adj", k: "tx", prod: id, name: p.name, delta, why: val("aj-why"), cost: Number(p.cost) || 0 });
    closeModal(); toast("✅ Stock: " + (delta > 0 ? "+" : "") + delta);
  }
  function pageBidhaa() {
    let P = prods().filter((p) => match(p.name + " " + (p.code || "") + " " + (p.cat || ""), PK.q));
    const nLow = prods().filter((p) => low(p) && p.qty > 0).length, nOut = prods().filter((p) => (Number(p.qty) || 0) <= 0).length;
    if (SM.filter === "chini") P = P.filter((p) => low(p) && p.qty > 0); if (SM.filter === "zimeisha") P = P.filter((p) => (Number(p.qty) || 0) <= 0);
    const value = prods().reduce((s, p) => s + Math.max(0, Number(p.qty) || 0) * (Number(p.cost) || 0), 0);
    return `<div class="kpis">${kpi("Bidhaa", n0(prods().length))}${kpi("Thamani ya stock (bei ya kununua)", tzs(value))}${kpi("Zinazoisha", n0(nLow))}${kpi("Zimeisha", n0(nOut), nOut > 0)}</div>
      <div class="row between">${searchBox("Tafuta bidhaa, barcode, kundi…")}<div class="chips">${[["zote", "Zote"], ["chini", "Zinazoisha"], ["zimeisha", "Zimeisha"]].map(([k, l]) => `<button class="chip ${SM.filter === k ? "on" : ""}" onclick="PK.sm.filter='${k}';render()">${l}</button>`).join("")}</div></div>
      ${P.length ? `<div class="tw"><table class="t"><thead><tr><th>Bidhaa</th><th>Kundi</th><th class="r">Bei</th><th class="r">Faida</th><th class="r">Stock</th><th></th></tr></thead><tbody>
      ${P.map((p) => `<tr><td><b>${esc(p.name)}</b>${p.code ? `<br><small class="mu num">${esc(p.code)}</small>` : ""}</td><td>${esc(p.cat || "—")}</td><td class="r num">${n0(p.price)}</td><td class="r num">${p.cost ? n0(p.price - p.cost) : "—"}</td>
        <td class="r"><span class="pill ${(Number(p.qty) || 0) <= 0 ? "bd" : low(p) ? "wn" : "ok"}">${n0(p.qty)} ${esc(p.unit || "")}</span></td>
        <td class="r" style="white-space:nowrap"><button class="btn s" onclick="PK.pack.adjForm('${p.id}')">± Stock</button> <button class="btn s" onclick="PK.pack.prodForm('${p.id}')">✎</button></td></tr>`).join("")}</tbody></table></div>`
        : empty(prods().length ? "Hakuna inayolingana." : "Ongeza bidhaa ya kwanza. Ukiwa na scanner, skani barcode kwenye fomu.")}`;
  }

  /* ---------- ZAMU ---------- */
  function shiftCash(sh) {
    const cs = sales((s) => s.shift === sh.id), cash = cs.filter((s) => s.method === "cash").reduce((a, s) => a + (Number(s.paid) || 0), 0);
    const dp = txList("dpay", (d) => d.shift === sh.id && d.method === "cash").reduce((a, d) => a + d.amount, 0);
    const out = txList("cashout", (d) => d.shift === sh.id).reduce((a, d) => a + d.amount, 0);
    return { n: cs.length, total: cs.reduce((a, s) => a + s.total, 0), cash, dp, out, expect: (Number(sh.float) || 0) + cash + dp - out, methods: methodRows(cs) };
  }
  function closeForm(id) {
    const sh = get(id), c = shiftCash(sh);
    modal(`${mhead("Funga zamu — " + sh.name)}<div class="kpis">${kpi("Risiti", n0(c.n))}${kpi("Mauzo yote", tzs(c.total))}${kpi("Pesa inayotakiwa droo", tzs(c.expect), true)}</div>
      <p class="mu sm" style="margin:0">Float ${tzs(sh.float)} + taslimu ${tzs(c.cash)} + madeni yaliyolipwa ${tzs(c.dp)} − matumizi ${tzs(c.out)}.</p>
      <label class="l">Pesa uliyohesabu kwenye droo<input id="cl-count" class="f" inputmode="numeric" oninput="const d=num(this.value)-${c.expect};document.getElementById('cl-d').innerHTML=d===0?'✅ Sawa kabisa':d>0?'Ziada '+tzs(d):'<span class=err>Upungufu '+tzs(-d)+'</span>'"></label><div id="cl-d" class="sm">&nbsp;</div>
      <label class="l">Maelezo<input id="cl-note" class="f"></label><button class="btn p" onclick="PK.pack.closeShift('${id}')">Funga zamu</button>`);
  }
  function closeShift(id) {
    const sh = get(id), c = shiftCash(sh), counted = num(val("cl-count"));
    archive(id, { t: "shiftlog", closeAt: Date.now(), expect: c.expect, counted, diff: counted - c.expect, sales: c.total, n: c.n, note: val("cl-note"), closedBy: PK.user.name });
    closeModal(); toast("✅ Zamu imefungwa");
  }
  function cashOut() {
    const sh = myShift(); if (!sh) return toast("Huna zamu iliyo wazi");
    modal(`${mhead("Toa pesa kwenye droo")}<label class="l">Kiasi<input id="co-a" class="f" inputmode="numeric"></label><label class="l">Kwa ajili ya<input id="co-w" class="f" placeholder="mf. kununua mifuko, kupeleka benki"></label>
      <button class="btn p" onclick="const a=num(val('co-a'));if(!a)return toast('Andika kiasi');save({id:newId('cashout'),t:'cashout',k:'tx',shift:'${sh.id}',amount:a,why:val('co-w')});closeModal();toast('✅ Imeandikwa')">Hifadhi</button>`);
  }
  function pageZamu() {
    const open = list("shift"), mine = myShift(), isM = roleOk(["meneja"]);
    const logs = txList("shiftlog").sort((a, b) => b.closeAt - a.closeAt).filter((l) => isM || l.uid === PK.user.id).slice(0, 40);
    return `<div class="row between"><p class="mu sm" style="margin:0">Kila keshia anafungua zamu na float yake, na kuifunga kwa kuhesabu pesa ya droo.</p>${mine ? `<button class="btn" onclick="PK.pack.cashOut()">➖ Toa pesa droo</button>` : ""}</div>
      <div class="tiles">${open.length ? open.filter((s) => isM || s.uid === PK.user.id).map((s) => { const c = shiftCash(s); return `<div class="tile ok" style="cursor:default"><small>${esc(s.name)} · tangu ${hm(s.openAt)}</small><b class="num">${n0(c.total)}</b><small>Risiti ${c.n} · droo ${n0(c.expect)}</small><button class="btn s" onclick="PK.pack.closeForm('${s.id}')">Funga zamu</button></div>`; }).join("") : `<p class="mu">Hakuna zamu iliyo wazi.</p>`}</div>
      <h3>Zamu zilizofungwa</h3>${logs.length ? `<div class="tw"><table class="t"><thead><tr><th>Tarehe</th><th>Keshia</th><th class="r">Mauzo</th><th class="r">Inatakiwa</th><th class="r">Imehesabiwa</th><th class="r">Tofauti</th></tr></thead><tbody>
      ${logs.map((l) => `<tr><td>${fdate(l.day)} ${hm(l.openAt)}–${hm(l.closeAt)}</td><td>${esc(l.name)}</td><td class="r num">${n0(l.sales)}</td><td class="r num">${n0(l.expect)}</td><td class="r num">${n0(l.counted)}</td><td class="r"><span class="pill ${l.diff === 0 ? "ok" : l.diff > 0 ? "in" : "bd"}">${l.diff > 0 ? "+" : ""}${n0(l.diff)}</span></td></tr>`).join("")}</tbody></table></div>` : `<p class="mu sm">Bado.</p>`}`;
  }

  /* ---------- WASAMBAZAJI ---------- */
  function supForm(id) {
    const s = id ? get(id) : { name: "", phone: "", note: "" };
    modal(`${mhead(id ? "Msambazaji" : "Msambazaji mpya")}<div class="form"><label class="l">Jina<input id="sf-n" class="f" value="${esc(s.name)}"></label><label class="l">Simu<input id="sf-p" class="f" value="${esc(s.phone || "")}"></label><label class="l" style="grid-column:1/-1">Maelezo<input id="sf-o" class="f" value="${esc(s.note || "")}"></label></div>
      <button class="btn p" onclick="const n=val('sf-n');if(!n)return toast('Andika jina');${id ? `patch('${id}',{name:n,phone:val('sf-p'),note:val('sf-o')})` : `save({id:newId('sup'),t:'sup',name:n,phone:val('sf-p'),note:val('sf-o'),owed:0})`};closeModal()">Hifadhi</button>`);
  }
  function receiveForm(supId) {
    PK._rcv = { sup: supId || "", lines: [] };
    drawReceive();
  }
  function drawReceive() {
    const R = PK._rcv, tot = R.lines.reduce((s, l) => s + l.qty * l.cost, 0);
    modal(`${mhead("Pokea mzigo")}<label class="l">Msambazaji<select id="rv-sup" class="f" onchange="PK._rcv.sup=this.value">${opt([["", "— chagua —"]].concat(list("sup").map((s) => [s.id, s.name])), R.sup)}</select></label>
      <div class="row" style="flex-wrap:nowrap"><input id="rv-p" class="f" list="rv-list" placeholder="Bidhaa (jina au barcode)"><datalist id="rv-list">${prods().map((p) => `<option value="${esc(p.name)}">`).join("")}</datalist>
        <input id="rv-q" class="f" style="max-width:90px" inputmode="decimal" placeholder="Idadi"><input id="rv-c" class="f" style="max-width:120px" inputmode="numeric" placeholder="Bei/moja"><button class="btn" onclick="PK.pack.rcvAdd()">＋</button></div>
      ${R.lines.length ? `<div class="tw"><table class="t"><tbody>${R.lines.map((l, i) => `<tr><td>${esc(l.name)}</td><td class="r num">${l.qty} × ${n0(l.cost)}</td><td class="r num">${n0(l.qty * l.cost)}</td><td class="r"><button class="btn g s" onclick="PK._rcv.lines.splice(${i},1);PK.pack.drawReceive()">✕</button></td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="total"><span>Jumla</span><span class="num">${n0(tot)}</span></div>
      <div class="form"><label class="l">Umelipa sasa<input id="rv-paid" class="f" inputmode="numeric" placeholder="0 = deni lote"></label><label class="l">Namba ya ankara<input id="rv-inv" class="f"></label></div>
      <button class="btn p" onclick="PK.pack.rcvSave()" ${R.lines.length ? "" : "disabled"}>✅ Ingiza stock</button>`, true);
  }
  function rcvAdd() {
    const t = val("rv-p"), p = findCode(t) || prods().find((x) => x.name.toLowerCase() === t.toLowerCase()) || prods().filter((x) => match(x.name, t))[0];
    if (!p) return toast("Bidhaa haipo — iongeze kwanza kwenye Bidhaa");
    const q = num(val("rv-q")); if (!q) return toast("Andika idadi");
    PK._rcv.sup = val("rv-sup"); PK._rcv.lines.push({ id: p.id, name: p.name, qty: q, cost: num(val("rv-c")) || Number(p.cost) || 0 }); drawReceive();
  }
  function rcvSave() {
    const R = PK._rcv; R.sup = val("rv-sup"); if (!R.sup) return toast("Chagua msambazaji");
    const total = R.lines.reduce((s, l) => s + l.qty * l.cost, 0), paid = Math.min(num(val("rv-paid")), total), sup = get(R.sup);
    R.lines.forEach((l) => { bump(l.id, "qty", l.qty); if (l.cost) patch(l.id, { cost: l.cost }); });
    save({ id: newId("buy"), t: "buy", k: "tx", sup: R.sup, supName: sup.name, items: R.lines, total, paid, inv: val("rv-inv") });
    if (total - paid) bump(R.sup, "owed", total - paid);
    closeModal(); toast("✅ Stock imeingizwa · " + tzs(total));
  }
  function supPay(id) {
    const s = get(id);
    modal(`${mhead("Lipa " + s.name)}<p class="sm" style="margin:0">Deni lake: <b>${tzs(s.owed)}</b></p><label class="l">Kiasi<input id="sp-a" class="f" inputmode="numeric" value="${Number(s.owed) || ""}"></label>
      <label class="l">Njia<select id="sp-m" class="f">${opt(METHODS.filter((m) => m[0] !== "credit"), "cash")}</select></label>
      <button class="btn p" onclick="PK.pack.supPaySave('${id}')">Lipa</button>`);
  }
  function supPaySave(id) {
    const s = get(id), a = num(val("sp-a")); if (!a) return toast("Andika kiasi");
    bump(id, "owed", -a); save({ id: newId("suppay"), t: "suppay", k: "tx", sup: id, supName: s.name, amount: a, method: val("sp-m") });
    closeModal(); toast("✅ Malipo yameandikwa");
  }
  function pageSup() {
    const L = list("sup").sort((a, b) => (b.owed || 0) - (a.owed || 0)), owed = L.reduce((s, x) => s + (Number(x.owed) || 0), 0);
    const buys = txList("buy").sort((a, b) => b.at - a.at).slice(0, 15);
    return `<div class="kpis">${kpi("Wasambazaji", n0(L.length))}${kpi("Tunadaiwa", tzs(owed), owed > 0)}${kpi("Manunuzi siku 30", tzs(txList("buy").reduce((s, b) => s + b.total, 0)))}</div>
      ${L.length ? `<div class="tw"><table class="t"><thead><tr><th>Msambazaji</th><th>Simu</th><th class="r">Tunadaiwa</th><th></th></tr></thead><tbody>${L.map((s) => `<tr><td><b>${esc(s.name)}</b>${s.note ? `<br><small class="mu">${esc(s.note)}</small>` : ""}</td><td>${esc(s.phone || "—")}</td><td class="r num">${n0(s.owed)}</td>
        <td class="r" style="white-space:nowrap"><button class="btn s" onclick="PK.pack.receiveForm('${s.id}')">📦 Pokea</button> ${s.owed > 0 ? `<button class="btn s" onclick="PK.pack.supPay('${s.id}')">Lipa</button>` : ""} <button class="btn s" onclick="PK.pack.supForm('${s.id}')">✎</button></td></tr>`).join("")}</tbody></table></div>` : empty("Ongeza msambazaji wa kwanza.")}
      <h3>Mizigo ya karibuni</h3>${buys.length ? `<div class="tw"><table class="t"><tbody>${buys.map((b) => `<tr><td>${fdate(b.day)}</td><td>${esc(b.supName)}${b.inv ? ` · <small class="mu">#${esc(b.inv)}</small>` : ""}</td><td>${b.items.length} bidhaa</td><td class="r num">${n0(b.total)}</td><td class="r">${b.paid < b.total ? `<span class="pill wn">deni ${n0(b.total - b.paid)}</span>` : `<span class="pill ok">imelipwa</span>`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="mu sm">Bado.</p>`}`;
  }

  /* ---------- MADENI ---------- */
  function debtPay(id) {
    const d = get(id), bal = (Number(d.amount) || 0) - (Number(d.paidSum) || 0);
    modal(`${mhead("Pokea malipo — " + d.name)}<p class="sm" style="margin:0">Deni: <b>${tzs(bal)}</b></p><label class="l">Kiasi<input id="dp-a" class="f" inputmode="numeric" value="${bal}"></label>
      <label class="l">Njia<select id="dp-m" class="f">${opt(METHODS.filter((m) => m[0] !== "credit"), "cash")}</select></label><button class="btn p" onclick="PK.pack.debtPaySave('${id}')">Pokea</button>`);
  }
  function debtPaySave(id) {
    const d = get(id), a = num(val("dp-a")), m = val("dp-m"); if (!a) return; const sh = myShift();
    const bal = (Number(d.amount) || 0) - (Number(d.paidSum) || 0) - a;
    save({ id: newId("dpay"), t: "dpay", k: "tx", debt: id, name: d.name, amount: a, method: m, shift: sh ? sh.id : "" });
    if (bal <= 0) archive(id, { paidSum: (Number(d.paidSum) || 0) + a, clearedAt: Date.now() }); else patch(id, { paidSum: (Number(d.paidSum) || 0) + a });
    closeModal(); receipt({ title: "MALIPO YA DENI", items: [], total: a, paid: a, balance: Math.max(0, bal), customer: d.name, method: methodName(m), phone: d.phone });
  }
  function pageMadeni() {
    const D = list("debt").filter((d) => match(d.name + " " + (d.phone || ""), PK.q)).sort((a, b) => (b.amount - b.paidSum) - (a.amount - a.paidSum));
    const tot = list("debt").reduce((s, d) => s + (d.amount || 0) - (d.paidSum || 0), 0);
    return `<div class="kpis">${kpi("Wadaiwa", n0(list("debt").length))}${kpi("Jumla ya madeni", tzs(tot), tot > 0)}</div>${searchBox("Tafuta mteja…")}
      ${D.length ? `<div class="tw"><table class="t"><thead><tr><th>Mteja</th><th>Tangu</th><th class="r">Deni</th><th></th></tr></thead><tbody>${D.map((d) => `<tr><td><b>${esc(d.name)}</b><br><small class="mu">${esc(d.phone || "")} · risiti ${(d.sales || []).map((n) => "#" + n).join(", ")}</small></td><td>${fdate(d.since)}</td><td class="r num">${n0(d.amount - (d.paidSum || 0))}</td>
        <td class="r" style="white-space:nowrap"><button class="btn s p" onclick="PK.pack.debtPay('${d.id}')">Pokea</button> ${d.phone ? `<a class="btn s" target="_blank" href="https://wa.me/${String(d.phone).replace(/\D/g, "").replace(/^0/, "255")}?text=${encodeURIComponent("Habari " + d.name + ", unakumbushwa deni lako la TSh " + n0(d.amount - (d.paidSum || 0)) + " kwa " + SHOP.name + ". Asante.")}">📲</a>` : ""}</td></tr>`).join("")}</tbody></table></div>` : empty("Hakuna madeni. 👏")}`;
  }

  /* ---------- RIPOTI ---------- */
  function pageRipoti() {
    const R = sales((s) => inRange(s.day)), total = R.reduce((a, s) => a + s.total, 0);
    const profit = R.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty * (i.price - (i.cost || 0)), 0) - (s.discount || 0), 0);
    const top = groupSum(R.flatMap((s) => s.items), (i) => i.name, (i) => i.qty * i.price).slice(0, 10);
    const cash = groupSum(R, (s) => s.cashier, (s) => s.total);
    const L = prods().filter(low).slice(0, 12);
    return `<div class="row between">${rangeChips()}<button class="btn s" onclick="PK.pack.csv()">⬇️ CSV</button></div>
      <div class="kpis">${kpi("Mauzo", tzs(total), true)}${kpi("Faida ghafi", tzs(profit))}${kpi("Risiti", n0(R.length))}${kpi("Wastani wa risiti", tzs(R.length ? total / R.length : 0))}</div>
      <div class="card"><h3>Mauzo kwa siku (siku 14)</h3>${bars(dailySeries(sales(), 14, (s) => s.total))}</div>
      <div class="grid2"><div class="card"><h3>Bidhaa zinazouzika zaidi</h3>${top.length ? `<table class="t"><tbody>${top.map((t) => `<tr><td>${esc(t.key)}</td><td class="r num">${n0(t.value)}</td></tr>`).join("")}</tbody></table>` : `<p class="mu sm">Hakuna mauzo.</p>`}</div>
        <div class="card"><h3>Njia za malipo</h3><table class="t"><tbody>${methodRows(R).map((m) => `<tr><td>${esc(m.key)}</td><td class="r">${m.count}</td><td class="r num">${n0(m.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>
          <h3>Kwa keshia</h3><table class="t"><tbody>${cash.map((m) => `<tr><td>${esc(m.key)}</td><td class="r">${m.count}</td><td class="r num">${n0(m.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div></div>
      <div class="card"><h3>Agiza tena (stock ndogo)</h3>${L.length ? `<table class="t"><tbody>${L.map((p) => `<tr><td>${esc(p.name)}</td><td class="r"><span class="pill ${p.qty <= 0 ? "bd" : "wn"}">${n0(p.qty)}</span></td><td class="mu sm">${esc((get(p.sup) || {}).name || "")}</td></tr>`).join("")}</tbody></table>` : `<p class="mu sm">Stock iko sawa.</p>`}</div>
      <div class="card"><h3>Risiti za karibuni</h3><div class="tw"><table class="t"><tbody>${R.slice().sort((a, b) => b.time - a.time).slice(0, 25).map((s) => `<tr class="click" onclick="PK.pack.showSale('${s.id}')"><td class="num">#${s.no}</td><td>${hm(s.time)} · ${fdate(s.day)}</td><td>${esc(s.cashier)}</td><td>${esc(methodName(s.method))}</td><td class="r num">${n0(s.total)}</td></tr>`).join("")}</tbody></table></div></div>`;
  }
  function showSale(id) { const s = get(id); receipt({ title: "RISITI (nakala)", no: s.no, items: s.items, total: s.total, discount: s.discount, paid: s.paid, method: methodName(s.method), change: s.change, balance: s.balance, customer: s.customer, phone: s.phone }); }
  function csv() { const R = sales((s) => inRange(s.day)); downloadCSV("mauzo-" + PK.range, [["Tarehe", "Saa", "Risiti", "Keshia", "Njia", "Bidhaa", "Jumla"]].concat(R.map((s) => [s.day, hm(s.time), s.no, s.cashier, methodName(s.method), s.items.map((i) => i.name + " x" + i.qty).join("; "), s.total]))); }

  document.addEventListener("keydown", (e) => { if (e.key === "F2" && PK.page === "kaunta" && PK.user) { e.preventDefault(); pay(); } });

  registerPack({
    id: "supermarket", name: "Supermarket", theme: "mkaa", home: "kaunta",
    money: (inR) => { const R = txList("sale", (s) => inR(s.day)); return { rev: R.reduce((a, s) => a + s.total, 0), cost: R.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty * (i.cost || 0), 0), 0) }; },
    roles: [["meneja", "Meneja"], ["keshia", "Keshia"], ["stoka", "Mtunza stoo"]],
    pages: [
      { id: "kaunta", label: "Kaunta", icon: "🛒", roles: ["meneja", "keshia"], render: pageKaunta },
      { id: "bidhaa", label: "Bidhaa", icon: "📦", roles: ["meneja", "stoka"], render: pageBidhaa, actions: () => roleOk(["meneja", "stoka"]) ? `<button class="btn p s" onclick="PK.pack.prodForm()">＋ Bidhaa</button>` : "" },
      { id: "zamu", label: "Zamu", icon: "⏱️", roles: ["meneja", "keshia"], render: pageZamu },
      { id: "wasambazaji", label: "Wasambazaji", icon: "🚚", roles: ["meneja", "stoka"], render: pageSup, actions: () => `<button class="btn s" onclick="PK.pack.supForm()">＋ Msambazaji</button><button class="btn p s" onclick="PK.pack.receiveForm()">📦 Pokea mzigo</button>` },
      { id: "madeni", label: "Madeni", icon: "📒", roles: ["meneja", "keshia"], render: pageMadeni, badge: () => list("debt").length || "" },
      { id: "ripoti", label: "Ripoti", icon: "📊", roles: ["meneja"], render: pageRipoti },
    ],
    settings: [{ key: "useShifts", label: "Lazima kufungua zamu kabla ya kuuza", type: "check", def: true }],
    onScan: (code) => { const p = findCode(code); if (!p) return toast("Barcode " + code + " haijasajiliwa"); if (PK.page !== "kaunta") go("kaunta"); addToCart(p, 1); },
    scan: (code) => PK.pack.onScan(code), qEnter, add: (id) => addToCart(get(id), 1), setQty, editLine, pay, openShift,
    prodForm, prodSave, adjForm, adjSave, closeForm, closeShift, cashOut, supForm, receiveForm, drawReceive, rcvAdd, rcvSave, supPay, supPaySave, debtPay, debtPaySave, showSale, csv,
  });
})();
