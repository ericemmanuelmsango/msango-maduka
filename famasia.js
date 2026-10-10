/* =====================================================================
   PAKITI: FAMASIA & DUKA LA DAWA  · famasia.js v1
   Kaunta yenye FEFO (batch inayoisha kwanza ndiyo inauzwa kwanza),
   dawa & batch, tahadhari za kuisha muda, daftari la vyeti (Rx),
   maelekezo ya matumizi kwenye risiti, ripoti.
   ===================================================================== */
(function () {
  const FM = { cart: [], q: "", tab: "zote", win: 90 };
  PK.fm = FM;
  const drugs = () => list("drug").sort((a, b) => a.name.localeCompare(b.name));
  const batchesOf = (id) => list("batch", (b) => b.drug === id && (Number(b.qty) || 0) > 0).sort((a, b) => (a.exp || "9999").localeCompare(b.exp || "9999"));
  const sellable = (id) => batchesOf(id).filter((b) => !b.exp || b.exp > today());
  const stock = (id) => sellable(id).reduce((s, b) => s + (Number(b.qty) || 0), 0);
  const nextExp = (id) => (sellable(id)[0] || {}).exp;
  const win = () => Number(S("expWin", 90)) || 90;
  const daysTo = (d) => daysBetween(today(), d);
  const label = (d) => d.name + (d.strength ? " " + d.strength : "") + (d.form ? " (" + d.form + ")" : "");
  const FORMS = ["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Cream", "Drops", "Inhaler", "Sachet", "Kifaa"];
  const DOSE = ["1×1", "1×2", "1×3", "2×2", "2×3", "5ml×3", "10ml×3", "Asubuhi", "Usiku", "Kabla ya kula", "Baada ya kula"];
  const DAYS = ["siku 3", "siku 5", "siku 7", "siku 14", "mwezi 1"];

  /* ---------- UZA ---------- */
  function add(id) {
    const d = get(id); if (!d) return; const have = stock(id), inCart = FM.cart.filter((l) => l.id === id).reduce((s, l) => s + l.qty, 0);
    if (inCart + 1 > have) return toast(have ? "Stock iliyopo (isiyoisha muda): " + have : "Dawa hii haipo kwenye stock halali");
    const l = FM.cart.find((x) => x.id === id); if (l) l.qty++; else FM.cart.push({ id, name: label(d), price: Number(d.price) || 0, qty: 1, dose: "", rx: !!d.rx });
    FM.q = ""; PK._noKeep = true; render(); setTimeout(() => { const i = document.getElementById("fm-q"); i && i.focus(); }, 20);
  }
  function qty(i, dd) { const l = FM.cart[i]; const n = l.qty + dd; if (n > stock(l.id)) return toast("Stock haitoshi"); l.qty = n; if (l.qty <= 0) FM.cart.splice(i, 1); render(); }
  function doseForm(i) {
    const l = FM.cart[i];
    modal(`${mhead("Maelekezo · " + l.name)}<label class="l">Jinsi ya kutumia (itaonekana kwenye risiti/lebo)<input id="ds" class="f" value="${esc(l.dose)}" placeholder="mf. 1×3 siku 5 baada ya kula"></label>
      <div class="chips">${DOSE.concat(DAYS).map((c) => `<button class="chip" onclick="const e=document.getElementById('ds');e.value=(e.value?e.value+' ':'')+'${c}'">${c}</button>`).join("")}</div>
      <label class="l">Idadi<input id="dq" class="f" inputmode="numeric" value="${l.qty}"></label>
      <div class="row between"><button class="btn d" onclick="PK.fm.cart.splice(${i},1);closeModal()">Ondoa</button><button class="btn p" onclick="PK.pack.doseSave(${i})">Sawa</button></div>`);
  }
  function doseSave(i) { const l = FM.cart[i], q = Math.max(1, num(val("dq"))); if (q > stock(l.id)) return toast("Stock iliyopo: " + stock(l.id)); l.qty = q; l.dose = val("ds"); closeModal(); }
  function pay() {
    if (!FM.cart.length) return;
    const total = FM.cart.reduce((s, l) => s + l.qty * l.price, 0), needRx = FM.cart.filter((l) => l.rx);
    if (needRx.length) return rxForm(total, needRx);
    checkout({ total, title: "Malipo", credit: true, askCustomer: false, onPay: (p) => finish(total, p, null) });
  }
  function rxForm(total, needRx) {
    modal(`${mhead("Cheti cha daktari (Rx)")}<p class="sm" style="margin:0">Dawa zinazohitaji cheti: <b>${needRx.map((l) => esc(l.name)).join(", ")}</b></p>
      <div class="form"><label class="l">Jina la mgonjwa *<input id="rx-p" class="f"></label><label class="l">Umri<input id="rx-a" class="f" inputmode="numeric"></label>
        <label class="l">Daktari *<input id="rx-d" class="f" placeholder="Dkt. …"></label><label class="l">Kituo / hospitali<input id="rx-h" class="f"></label>
        <label class="l">Namba ya cheti<input id="rx-n" class="f"></label><label class="l">Simu ya mgonjwa<input id="rx-t" class="f" inputmode="tel"></label></div>
      <button class="btn p" onclick="PK.pack.rxNext(${total})">Endelea kulipa →</button>`);
  }
  function rxNext(total) {
    const rx = { patient: val("rx-p"), age: val("rx-a"), doctor: val("rx-d"), facility: val("rx-h"), no: val("rx-n"), phone: val("rx-t") };
    if (!rx.patient || !rx.doctor) return toast("Jina la mgonjwa na daktari ni lazima");
    checkout({ total, title: "Malipo", credit: true, customer: rx.patient, phone: rx.phone, onPay: (p) => finish(total, p, rx) });
  }
  async function finish(total, p, rx) {
    const lines = FM.cart.map((l) => ({ ...l })); FM.cart = [];
    /* FEFO: gawa kila mstari kwenye batch zinazoisha mapema kwanza */
    lines.forEach((l) => { let need = l.qty; l.batches = []; let cost = 0;
      sellable(l.id).forEach((b) => { if (need <= 0) return; const take = Math.min(need, Number(b.qty) || 0); if (!take) return; need -= take; l.batches.push({ b: b.id, no: b.no, exp: b.exp, q: take }); cost += take * (Number(b.cost) || Number(get(l.id).cost) || 0); bump(b.id, "qty", -take); });
      l.cost = l.qty ? cost / l.qty : 0; });
    const no = await nextNo("sale");
    save({ id: newId("sale"), t: "sale", k: "tx", no, items: lines, total, ...p, rx: rx || null, uid: PK.user.id, seller: PK.user.name, time: Date.now() });
    if (rx) save({ id: newId("rx"), t: "rx", k: "tx", sale: no, ...rx, items: lines.filter((l) => l.rx).map((l) => ({ name: l.name, qty: l.qty, dose: l.dose, batches: l.batches })), by: PK.user.name });
    if (p.balance > 0) { const d = list("debt", (x) => x.name.toLowerCase() === p.customer.toLowerCase())[0]; if (d) patch(d.id, { amount: (d.amount || 0) + p.balance }); else save({ id: newId("debt"), t: "debt", name: p.customer, phone: p.phone, amount: p.balance, paidSum: 0, since: today() }); }
    receipt({ title: "RISITI", no, items: lines, total, paid: p.paid, method: methodName(p.method), change: p.change, balance: p.balance, customer: p.customer || (rx && rx.patient), phone: p.phone,
      notes: lines.filter((l) => l.dose).map((l) => "💊 " + l.name + ": " + l.dose).concat(rx ? ["Rx: " + rx.doctor + (rx.facility ? " · " + rx.facility : "")] : []) });
  }
  function pageUza() {
    const D = drugs(), q = FM.q;
    const shown = (q ? D.filter((d) => match(d.name + " " + (d.generic || "") + " " + (d.cat || "") + " " + (d.code || ""), q)) : D).slice(0, 48);
    const tot = FM.cart.reduce((s, l) => s + l.qty * l.price, 0);
    return `<div class="split"><div style="display:grid;gap:10px;min-width:0">
      <input id="fm-q" class="f" style="font-size:18px;padding:12px 14px" autocomplete="off" placeholder="Tafuta dawa kwa jina au generic (mf. amoxi, panadol)…" value="${esc(q)}" oninput="PK.fm.q=this.value;soft()" onkeydown="if(event.key==='Enter'){const f=document.querySelector('.prod:not(.out)');f&&f.click()}">
      ${D.length ? `<div class="prods">${shown.map((d) => { const st = stock(d.id), ex = nextExp(d.id), dt = ex ? daysTo(ex) : null;
        return `<button class="prod ${st <= 0 ? "out" : ""}" onclick="PK.pack.add('${d.id}')"><b>${esc(d.name)} ${d.strength ? `<small class="mu">${esc(d.strength)}</small>` : ""}</b><span>${n0(d.price)}</span>
          <small>${d.rx ? '<b style="color:var(--bd)">Rx</b> · ' : ""}${st} ${esc(d.unit || "")}${dt != null && dt <= win() ? ` · <span style="color:${dt <= 30 ? "var(--bd)" : "#a86400"}">⏳ siku ${dt}</span>` : ""}</small></button>`; }).join("")}</div>`
        : empty("Bado hakuna dawa.", roleOk(["meneja", "mfamasia"]) ? `<button class="btn p" onclick="go('dawa')">＋ Ongeza dawa</button>` : "")}
    </div>
    <div class="card sticky"><h3>Dawa za mteja</h3>
      ${FM.cart.length ? `<div class="cart">${FM.cart.map((l, i) => `<div class="cline"><button class="btn g" style="justify-content:flex-start;padding:0;color:var(--ink);font-weight:600;white-space:normal;text-align:left" onclick="PK.pack.doseForm(${i})"><span>${esc(l.name)} ${l.rx ? '<span class="pill bd">Rx</span>' : ""}<br><small class="mu">${l.dose ? "💊 " + esc(l.dose) : "＋ maelekezo ya matumizi"}</small></span></button>
        <div style="text-align:right"><b class="num">${n0(l.qty * l.price)}</b><div class="q"><button onclick="PK.pack.qty(${i},-1)">−</button><span class="num" style="min-width:22px;text-align:center">${l.qty}</span><button onclick="PK.pack.qty(${i},1)">＋</button></div></div></div>`).join("")}</div>` : `<p class="mu sm" style="margin:0">Tafuta na bonyeza dawa. Mfumo unauza batch inayoisha muda mapema kwanza (FEFO) na unazuia dawa iliyoisha muda.</p>`}
      <div class="total"><span>Jumla</span><span class="num">${n0(tot)}</span></div>
      <button class="btn p big" onclick="PK.pack.pay()" ${FM.cart.length ? "" : "disabled"}>💳 Lipa</button>
      ${FM.cart.length ? `<div class="mbar"><span>${FM.cart.length} dawa · <span class="num">${n0(tot)}</span></span><button class="btn p" onclick="PK.pack.pay()">💳 Lipa</button></div>` : ""}</div></div>`;
  }

  /* ---------- DAWA & BATCH ---------- */
  function drugForm(id) {
    const d = id ? get(id) : { name: "", generic: "", strength: "", form: "Tablet", unit: "tab", price: "", cost: "", min: 20, rx: false, cat: "", code: "" };
    modal(`${mhead(id ? "Badilisha dawa" : "Dawa mpya")}<div class="form">
      <label class="l">Jina (brand)<input id="dg-n" class="f" value="${esc(d.name)}" placeholder="mf. Amoxil"></label><label class="l">Generic<input id="dg-g" class="f" value="${esc(d.generic || "")}" placeholder="mf. Amoxicillin"></label>
      <label class="l">Nguvu<input id="dg-s" class="f" value="${esc(d.strength || "")}" placeholder="500mg"></label><label class="l">Aina<select id="dg-f" class="f">${opt(FORMS, d.form)}</select></label>
      <label class="l">Inauzwa kwa<select id="dg-u" class="f">${opt([["tab", "Kidonge/tab"], ["cap", "Capsule"], ["chupa", "Chupa"], ["box", "Boksi"], ["strip", "Strip"], ["kipande", "Kipande"]], d.unit)}</select></label>
      <label class="l">Bei ya kuuza (kwa kipimo hicho)<input id="dg-p" class="f" inputmode="numeric" value="${esc(d.price)}"></label><label class="l">Gharama<input id="dg-c" class="f" inputmode="numeric" value="${esc(d.cost || "")}"></label>
      <label class="l">Tahadhari stock ikifika<input id="dg-m" class="f" inputmode="numeric" value="${esc(d.min)}"></label><label class="l">Kundi<input id="dg-k" class="f" value="${esc(d.cat || "")}" placeholder="mf. Antibiotic"></label>
      <label class="l">Barcode<input id="dg-b" class="f" value="${esc(d.code || "")}"></label>
      <label class="row sm" style="grid-column:1/-1"><input id="dg-rx" type="checkbox" ${d.rx ? "checked" : ""}> Inahitaji cheti cha daktari (Prescription-only, POM)</label></div>
      ${id ? "" : `<h4>Batch ya kwanza (si lazima)</h4><div class="form"><label class="l">Namba ya batch<input id="b-no" class="f"></label><label class="l">Inaisha muda<input id="b-ex" class="f" type="date"></label><label class="l">Idadi<input id="b-q" class="f" inputmode="numeric"></label></div>`}
      <div class="row between">${id ? `<button class="btn d" onclick="${batchesOf(id).length ? "toast('Ina stock — haiwezi kufutwa')" : `delDoc('${id}');closeModal()`}">Futa</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.drugSave('${id || ""}')">Hifadhi</button></div>`, true);
  }
  function drugSave(id) {
    const d = { name: val("dg-n"), generic: val("dg-g"), strength: val("dg-s"), form: val("dg-f"), unit: val("dg-u"), price: num(val("dg-p")), cost: num(val("dg-c")), min: num(val("dg-m")), cat: val("dg-k"), code: val("dg-b"), rx: !!val("dg-rx") };
    if (!d.name || !d.price) return toast("Andika jina na bei");
    if (id) patch(id, d); else { const nid = newId("drug"); save({ id: nid, t: "drug", ...d }); const q = num(val("b-q")); if (q) save({ id: newId("batch"), t: "batch", drug: nid, no: val("b-no"), exp: val("b-ex"), qty: q, cost: d.cost, received: today() }); }
    closeModal(); toast("✅ Imehifadhiwa");
  }
  function batchForm(drugId) {
    const D = drugs();
    modal(`${mhead("Pokea stock (batch mpya)")}<div class="form">
      <label class="l" style="grid-column:1/-1">Dawa<select id="bt-d" class="f">${opt(D.map((d) => [d.id, label(d)]), drugId)}</select></label>
      <label class="l">Namba ya batch *<input id="bt-no" class="f"></label><label class="l">Inaisha muda *<input id="bt-ex" class="f" type="date"></label>
      <label class="l">Idadi *<input id="bt-q" class="f" inputmode="numeric"></label><label class="l">Gharama kwa kimoja<input id="bt-c" class="f" inputmode="numeric"></label>
      <label class="l">Msambazaji<input id="bt-s" class="f" list="bt-sl"><datalist id="bt-sl">${[...new Set(list("batch").map((b) => b.sup).filter(Boolean))].map((s) => `<option value="${esc(s)}">`).join("")}</datalist></label><label class="l">Ankara #<input id="bt-i" class="f"></label></div>
      <button class="btn p" onclick="PK.pack.batchSave()">✅ Ingiza</button>`);
  }
  function batchSave() {
    const b = { drug: val("bt-d"), no: val("bt-no"), exp: val("bt-ex"), qty: num(val("bt-q")), cost: num(val("bt-c")), sup: val("bt-s"), inv: val("bt-i"), received: today() };
    if (!b.drug || !b.no || !b.exp || !b.qty) return toast("Jaza dawa, batch, tarehe ya kuisha na idadi");
    if (b.exp <= today()) return toast("Batch hii imeshaisha muda — haiwezi kupokelewa");
    save({ id: newId("batch"), t: "batch", ...b }); save({ id: newId("rcv"), t: "rcv", k: "tx", ...b, name: label(get(b.drug)), value: b.qty * b.cost });
    if (b.cost) patch(b.drug, { cost: b.cost });
    closeModal(); toast("✅ Batch " + b.no + " imeingizwa");
  }
  function drugView(id) {
    const d = get(id), B = list("batch", (b) => b.drug === id && (Number(b.qty) || 0) > 0).sort((a, b) => (a.exp || "").localeCompare(b.exp || ""));
    modal(`${mhead(label(d))}<p class="sm mu" style="margin:0">${esc(d.generic || "")} ${d.rx ? '· <span class="pill bd">Rx</span>' : ""} · Bei ${tzs(d.price)} kwa ${esc(d.unit)}</p>
      <div class="tw"><table class="t"><thead><tr><th>Batch</th><th>Inaisha</th><th class="r">Idadi</th><th></th></tr></thead><tbody>${B.map((b) => { const dt = b.exp ? daysTo(b.exp) : 9999; return `<tr><td class="num">${esc(b.no || "—")}</td><td>${fdate(b.exp)} <span class="pill ${dt <= 0 ? "bd" : dt <= 30 ? "bd" : dt <= win() ? "wn" : "ok"}">${dt <= 0 ? "imeisha" : dt + " siku"}</span></td><td class="r num">${n0(b.qty)}</td><td class="r"><button class="btn s" onclick="PK.pack.batchAdj('${b.id}')">±</button></td></tr>`; }).join("") || `<tr><td class="mu">Hakuna stock</td></tr>`}</tbody></table></div>
      <div class="row"><button class="btn p" onclick="PK.pack.batchForm('${id}')">＋ Batch</button><button class="btn" onclick="PK.pack.drugForm('${id}')">✎ Badilisha</button></div>`);
  }
  function batchAdj(id) {
    const b = get(id);
    modal(`${mhead("Hesabu batch " + (b.no || ""))}<label class="l">Idadi halisi iliyopo<input id="ba-q" class="f" inputmode="numeric" value="${b.qty}"></label><label class="l">Sababu<input id="ba-w" class="f" placeholder="mf. hesabu ya mwezi, imevunjika"></label>
      <button class="btn p" onclick="PK.pack.batchAdjSave('${id}')">Hifadhi</button>`);
  }
  function batchAdjSave(id) { const b = get(id), q = num(val("ba-q")), dlt = q - (Number(b.qty) || 0); if (dlt) { bump(id, "qty", dlt); save({ id: newId("adj"), t: "adj", k: "tx", batch: id, drug: b.drug, name: label(get(b.drug)), delta: dlt, why: val("ba-w"), value: dlt * (Number(b.cost) || 0) }); } closeModal(); }
  function pageDawa() {
    let D = drugs().filter((d) => match(d.name + " " + (d.generic || "") + " " + (d.cat || ""), PK.q));
    const low = (d) => stock(d.id) <= (Number(d.min) || 0);
    if (FM.tab === "chini") D = D.filter(low); if (FM.tab === "rx") D = D.filter((d) => d.rx);
    const value = list("batch").reduce((s, b) => s + Math.max(0, Number(b.qty) || 0) * (Number(b.cost) || 0), 0);
    return `<div class="kpis">${kpi("Aina za dawa", n0(drugs().length))}${kpi("Thamani ya stock", tzs(value))}${kpi("Stock ndogo", n0(drugs().filter(low).length))}${kpi("Zinaisha ≤ siku " + win(), n0(list("batch", (b) => b.qty > 0 && b.exp && daysTo(b.exp) <= win() && daysTo(b.exp) > 0).length))}</div>
      <div class="row between">${searchBox("Tafuta dawa…")}<div class="chips">${[["zote", "Zote"], ["chini", "Stock ndogo"], ["rx", "Rx tu"]].map(([k, l]) => `<button class="chip ${FM.tab === k ? "on" : ""}" onclick="PK.fm.tab='${k}';render()">${l}</button>`).join("")}</div></div>
      ${D.length ? `<div class="tw"><table class="t"><thead><tr><th>Dawa</th><th>Generic</th><th class="r">Bei</th><th class="r">Stock</th><th>Inaisha karibu</th></tr></thead><tbody>${D.map((d) => { const st = stock(d.id), ex = nextExp(d.id), dt = ex ? daysTo(ex) : null;
        return `<tr class="click" onclick="PK.pack.drugView('${d.id}')"><td><b>${esc(d.name)}</b> ${esc(d.strength || "")} <small class="mu">${esc(d.form || "")}</small> ${d.rx ? '<span class="pill bd">Rx</span>' : ""}</td><td>${esc(d.generic || "—")}</td><td class="r num">${n0(d.price)}</td><td class="r"><span class="pill ${st <= 0 ? "bd" : low(d) ? "wn" : "ok"}">${n0(st)} ${esc(d.unit || "")}</span></td><td>${ex ? `${fdate(ex)} <small class="${dt <= 30 ? "err" : "mu"}">(${dt}s)</small>` : "—"}</td></tr>`; }).join("")}</tbody></table></div>` : empty("Ongeza dawa ya kwanza.")}`;
  }

  /* ---------- ZINAISHA MUDA ---------- */
  function pageMuda() {
    const B = list("batch", (b) => (Number(b.qty) || 0) > 0 && b.exp).sort((a, b) => a.exp.localeCompare(b.exp));
    const expired = B.filter((b) => b.exp <= today()), soon = B.filter((b) => b.exp > today() && daysTo(b.exp) <= win());
    const val2 = (L) => L.reduce((s, b) => s + b.qty * (Number(b.cost) || Number((get(b.drug) || {}).cost) || 0), 0);
    const row = (b, x) => { const d = get(b.drug) || {}, dt = daysTo(b.exp); return `<tr><td><b>${esc(label(d))}</b></td><td class="num">${esc(b.no || "—")}</td><td>${fdate(b.exp)}</td><td><span class="pill ${dt <= 0 ? "bd" : dt <= 30 ? "bd" : "wn"}">${dt <= 0 ? "imeisha " + -dt + "s" : dt + " siku"}</span></td><td class="r num">${n0(b.qty)}</td><td class="r">${x}</td></tr>`; };
    return `<div class="kpis">${kpi("Zimeisha muda (bado stoo)", n0(expired.length), expired.length > 0)}${kpi("Thamani iliyoisha", tzs(val2(expired)))}${kpi("Zinaisha ≤ siku " + win(), n0(soon.length))}${kpi("Thamani iko hatarini", tzs(val2(soon)))}</div>
      ${expired.length ? `<div class="card"><h3>⛔ Zimeisha muda — haziuzwi, ziondoe</h3><div class="tw"><table class="t"><tbody>${expired.map((b) => row(b, roleOk(["meneja", "mfamasia"]) ? `<button class="btn s d" onclick="PK.pack.dispose('${b.id}')">Ondoa</button>` : "")).join("")}</tbody></table></div></div>` : ""}
      <div class="card"><h3>⏳ Zinakaribia kuisha (siku ${win()})</h3><p class="mu sm" style="margin:0">Ushauri: zipe kipaumbele kuuza, rudisha kwa msambazaji kama mkataba unaruhusu, au punguza bei.</p>
        ${soon.length ? `<div class="tw"><table class="t"><tbody>${soon.map((b) => row(b, "")).join("")}</tbody></table></div>` : `<p class="mu sm">Hakuna. ✅</p>`}</div>`;
  }
  function dispose(id) {
    const b = get(id), d = get(b.drug) || {};
    confirmBox(`Ondoa ${b.qty} ${d.unit || ""} za ${label(d)} (batch ${b.no}) kama zilizoisha muda?`, () => {
      save({ id: newId("disp"), t: "disp", k: "tx", batch: id, drug: b.drug, name: label(d), no: b.no, exp: b.exp, qty: b.qty, value: b.qty * (Number(b.cost) || Number(d.cost) || 0) });
      bump(id, "qty", -b.qty); toast("Imeondolewa na kuandikwa kwenye daftari la uharibifu");
    }, "Ondoa");
  }

  /* ---------- VYETI (Rx) ---------- */
  function pageVyeti() {
    const R = txList("rx", (r) => inRange(r.day) && match(r.patient + " " + r.doctor + " " + (r.facility || "") + " " + (r.no || ""), PK.q)).sort((a, b) => b.at - a.at);
    return `<div class="row between">${rangeChips()}<div class="row">${searchBox("Mgonjwa, daktari, kituo…")}<button class="btn s" onclick="PK.pack.rxCsv()">⬇️ Daftari (CSV)</button></div></div>
      ${R.length ? `<div class="tw"><table class="t"><thead><tr><th>Tarehe</th><th>Mgonjwa</th><th>Daktari / Kituo</th><th>Dawa</th><th>Risiti</th></tr></thead><tbody>${R.map((r) => `<tr><td>${fdate(r.day)}</td><td><b>${esc(r.patient)}</b>${r.age ? ` <small class="mu">(${esc(r.age)})</small>` : ""}<br><small class="mu">${esc(r.phone || "")}</small></td><td>${esc(r.doctor)}<br><small class="mu">${esc(r.facility || "")} ${r.no ? "· #" + esc(r.no) : ""}</small></td>
        <td>${r.items.map((i) => `${esc(i.name)} ×${i.qty}${i.dose ? ` <small class="mu">(${esc(i.dose)})</small>` : ""}<br><small class="mu">batch ${i.batches.map((b) => esc(b.no || "—")).join(", ")}</small>`).join("<br>")}</td><td class="num">#${r.sale}</td></tr>`).join("")}</tbody></table></div>` : empty("Dawa za cheti (Rx) zikiuzwa, kumbukumbu zake zinahifadhiwa hapa — daftari linalotakiwa na TMDA/PC.")}`;
  }
  function rxCsv() { downloadCSV("daftari-rx-" + PK.range, [["Tarehe", "Mgonjwa", "Umri", "Simu", "Daktari", "Kituo", "Cheti #", "Dawa", "Idadi", "Maelekezo", "Batch", "Mtoaji"]].concat(txList("rx", (r) => inRange(r.day)).flatMap((r) => r.items.map((i) => [r.day, r.patient, r.age, r.phone, r.doctor, r.facility, r.no, i.name, i.qty, i.dose, i.batches.map((b) => b.no).join(" "), r.by])))); }

  /* ---------- RIPOTI ---------- */
  function pageRipoti() {
    const R = txList("sale", (s) => inRange(s.day)), total = R.reduce((s, x) => s + x.total, 0), L = R.flatMap((s) => s.items);
    const profit = L.reduce((s, l) => s + l.qty * (l.price - (l.cost || 0)), 0), disp = txList("disp", (x) => inRange(x.day)), loss = disp.reduce((s, x) => s + (x.value || 0), 0);
    const top = groupSum(L, (l) => l.name, (l) => l.qty * l.price).slice(0, 12);
    const debts = list("debt"), owed = debts.reduce((s, d) => s + (d.amount || 0) - (d.paidSum || 0), 0);
    return `<div class="row between">${rangeChips()}<button class="btn s" onclick="downloadCSV('mauzo-dawa-'+PK.range,[['Tarehe','Risiti','Dawa','Idadi','Bei','Batch']].concat(txList('sale',s=>inRange(s.day)).flatMap(s=>s.items.map(i=>[s.day,s.no,i.name,i.qty,i.price,(i.batches||[]).map(b=>b.no).join(' ')]))))">⬇️ CSV</button></div>
      <div class="kpis">${kpi("Mauzo", tzs(total), true)}${kpi("Faida ghafi", tzs(profit))}${kpi("Wateja (risiti)", n0(R.length))}${kpi("Mauzo ya Rx", n0(R.filter((s) => s.rx).length))}${kpi("Hasara (expired)", tzs(loss))}${owed ? kpi("Madeni ya wateja", tzs(owed)) : ""}</div>
      <div class="card"><h3>Mauzo kwa siku (siku 14)</h3>${bars(dailySeries(txList("sale"), 14, (s) => s.total))}</div>
      <div class="grid2"><div class="card"><h3>Dawa zinazouzika zaidi</h3><table class="t"><tbody>${top.map((t) => `<tr><td>${esc(t.key)}</td><td class="r num">${n0(t.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div>
        <div class="card"><h3>Njia za malipo</h3><table class="t"><tbody>${methodRows(R).map((m) => `<tr><td>${esc(m.key)}</td><td class="r num">${n0(m.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>
          ${debts.length ? `<h3>Wadaiwa</h3><table class="t"><tbody>${debts.map((d) => `<tr><td>${esc(d.name)}</td><td class="r num">${n0(d.amount - (d.paidSum || 0))}</td><td class="r"><button class="btn s" onclick="PK.pack.debtPay('${d.id}')">Pokea</button></td></tr>`).join("")}</tbody></table>` : ""}</div></div>`;
  }
  function debtPay(id) {
    const d = get(id), bal = d.amount - (d.paidSum || 0);
    checkout({ total: bal, title: "Deni la " + d.name, onPay: (p) => { const left = bal - p.paid; save({ id: newId("dpay"), t: "dpay", k: "tx", name: d.name, amount: p.paid, method: p.method }); if (left <= 0) archive(id, { paidSum: d.amount }); else patch(id, { paidSum: (d.paidSum || 0) + p.paid }); toast("✅ Imepokelewa"); } });
  }

  registerPack({
    id: "famasia", name: "Famasia", theme: "zumaridi", home: "uza",
    roles: [["meneja", "Meneja"], ["mfamasia", "Mfamasia"], ["muuzaji", "Muuzaji (dispenser)"]],
    pages: [
      { id: "uza", label: "Uza", icon: "💊", roles: ["meneja", "mfamasia", "muuzaji"], render: pageUza },
      { id: "dawa", label: "Dawa", icon: "🧪", roles: ["meneja", "mfamasia"], render: pageDawa, actions: () => `<button class="btn s" onclick="PK.pack.batchForm()">📦 Pokea stock</button><button class="btn p s" onclick="PK.pack.drugForm()">＋ Dawa</button>` },
      { id: "muda", label: "Zinaisha muda", icon: "⏳", roles: ["meneja", "mfamasia"], render: pageMuda, badge: () => list("batch", (b) => b.qty > 0 && b.exp && b.exp <= today()).length || "" },
      { id: "vyeti", label: "Vyeti (Rx)", icon: "📋", roles: ["meneja", "mfamasia"], render: pageVyeti },
      { id: "ripoti", label: "Ripoti", icon: "📊", roles: ["meneja"], render: pageRipoti },
    ],
    settings: [{ key: "expWin", label: "Onya dawa zikibakiza siku (kuisha muda)", type: "number", def: 90 }],
    onScan: (code) => { const d = drugs().find((x) => x.code && x.code === code); if (!d) return toast("Barcode haijasajiliwa"); if (PK.page !== "uza") go("uza"); add(d.id); },
    add, qty, doseForm, doseSave, pay, rxNext, drugForm, drugSave, batchForm, batchSave, drugView, batchAdj, batchAdjSave, dispose, rxCsv, debtPay,
  });
})();
