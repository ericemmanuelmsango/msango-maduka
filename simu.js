/* =====================================================================
   PAKITI: SIMU & ELECTRONICS  · simu.js v1
   Kila simu/kifaa kinafuatiliwa kwa IMEI/serial, warranty inaanza
   siku ya kuuzwa, ukaguzi wa warranty kwa IMEI, matengenezo (repair
   tickets) yenye hatua, vifaa (accessories) vya kawaida, ripoti.
   ===================================================================== */
(function () {
  const SM = { cart: [], q: "", tab: "stock", find: "" };
  PK.sm2 = SM;
  const prods = () => list("prod").sort((a, b) => a.name.localeCompare(b.name));
  const units = (pred) => list("unit", pred);
  const inStock = (pid) => units((u) => u.prod === pid && u.status === "stock");
  const stockOf = (p) => (p.serial ? inStock(p.id).length : Number(p.qty) || 0);
  const imeiOk = (s) => /^\d{15}$/.test(s);
  const luhn = (s) => { let sum = 0; for (let i = 0; i < 15; i++) { let d = +s[14 - i]; if (i % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; } return sum % 10 === 0; };
  const addMonths = (day, m) => { const d = new Date(day + "T12:00:00"); d.setMonth(d.getMonth() + Number(m || 0)); return dayOf(d.getTime()); };
  const JOB = [["imepokelewa", "Imepokelewa", "in"], ["inachunguzwa", "Inachunguzwa", "wn"], ["vipuri", "Inasubiri vipuri", "bd"], ["tayari", "Tayari", "ok"]];
  const jobs = () => list("job").sort((a, b) => a.at - b.at);

  /* ---------- UZA ---------- */
  function add(pid) {
    const p = get(pid); if (!p) return;
    if (p.serial) return pickUnit(pid);
    const have = Number(p.qty) || 0, l = SM.cart.find((x) => x.prod === pid && !x.unit);
    if ((l ? l.qty : 0) + 1 > have) return toast("Imeisha");
    if (l) l.qty++; else SM.cart.push({ prod: pid, name: p.name, price: Number(p.price) || 0, cost: Number(p.cost) || 0, qty: 1, warrantyM: Number(p.warrantyM) || 0 });
    render();
  }
  function pickUnit(pid) {
    const p = get(pid), U = inStock(pid).filter((u) => !SM.cart.some((l) => l.unit === u.id));
    if (!U.length) return toast("Hakuna " + p.name + " stoo");
    modal(`${mhead("Chagua IMEI · " + p.name)}<input id="pu-q" class="f" placeholder="Skani au andika IMEI…" oninput="PK.sm2.find=this.value;PK.pack.pickUnit('${pid}')" value="${esc(SM.find)}">
      <div style="display:grid;gap:6px">${U.filter((u) => match(u.imei + " " + (u.imei2 || "") + " " + (u.color || "") + " " + (u.storage || ""), SM.find)).slice(0, 30).map((u) => `<button class="btn" style="justify-content:space-between" onclick="PK.pack.addUnit('${u.id}')"><span class="num">${esc(u.imei)}</span><span class="mu sm">${esc([u.color, u.storage].filter(Boolean).join(" · "))}</span></button>`).join("")}</div>`);
  }
  function addUnit(uidv) {
    const u = get(uidv), p = get(u.prod); if (u.status !== "stock") return toast("IMEI hii si ya stoo (" + u.status + ")");
    if (SM.cart.some((l) => l.unit === uidv)) return toast("Tayari iko kwenye mauzo");
    SM.cart.push({ prod: p.id, unit: u.id, imei: u.imei, name: p.name + (u.color ? " " + u.color : "") + (u.storage ? " " + u.storage : ""), price: Number(u.price) || Number(p.price) || 0, cost: Number(u.cost) || Number(p.cost) || 0, qty: 1, warrantyM: Number(p.warrantyM) || 0 });
    SM.find = ""; closeModal(); render();
  }
  function scanImei(code) { const u = units((x) => x.imei === code || x.imei2 === code)[0]; if (!u) return toast("IMEI " + code + " haipo kwenye mfumo"); if (u.status === "stock") { if (PK.page !== "uza") go("uza"); return addUnit(u.id); } go("imei"); SM.find = code; render(); }
  function pageUza() {
    const P = prods(), q = SM.q, tot = SM.cart.reduce((a, l) => a + l.qty * l.price, 0);
    const shown = P.filter((p) => match(p.name + " " + (p.brand || "") + " " + (p.cat || ""), q));
    return `<div class="split"><div style="display:grid;gap:10px;min-width:0">
      <div class="row"><input id="sm-q" class="f" style="flex:1;font-size:17px;padding:12px 14px" placeholder="Tafuta bidhaa au skani IMEI…" value="${esc(q)}" oninput="PK.sm2.q=this.value;soft()" onkeydown="if(event.key==='Enter'&&/^\\d{15}$/.test(this.value)){PK.pack.scanImei(this.value);PK.sm2.q='';this.value=''}"><button class="btn" onclick="cameraScan(c=>PK.pack.scanImei(c))">📷</button></div>
      ${P.length ? `<div class="prods">${shown.map((p) => { const s = stockOf(p); return `<button class="prod ${s <= 0 ? "out" : ""}" onclick="PK.pack.add('${p.id}')"><b>${esc(p.name)}</b><span>${n0(p.price)}</span><small>${p.serial ? "📱 IMEI · " : ""}${s} stoo${p.warrantyM ? " · 🛡️ miezi " + p.warrantyM : ""}</small></button>`; }).join("")}</div>` : empty("Bado hakuna bidhaa.", roleOk(["meneja"]) ? `<button class="btn p" onclick="go('bidhaa')">＋ Ongeza bidhaa</button>` : "")}
    </div>
    <div class="card sticky"><h3>Mauzo</h3>
      ${SM.cart.length ? `<div class="cart">${SM.cart.map((l, i) => `<div class="cline"><span><b>${esc(l.name)}</b>${l.qty > 1 ? " ×" + l.qty : ""}<br><small class="mu num">${l.imei ? "IMEI " + esc(l.imei) : ""}${l.warrantyM ? " · 🛡️ " + l.warrantyM + "m" : ""}</small></span><span style="text-align:right"><b class="num">${n0(l.qty * l.price)}</b><br><button class="btn g s" onclick="PK.pack.editLine(${i})">✎</button></span></div>`).join("")}</div>` : `<p class="mu sm" style="margin:0">Simu zinauzwa kwa IMEI — warranty inaanza leo na inaonekana kwenye risiti.</p>`}
      <div class="total"><span>Jumla</span><span class="num">${n0(tot)}</span></div>
      <button class="btn p big" onclick="PK.pack.pay()" ${SM.cart.length ? "" : "disabled"}>💳 Lipa</button>
      ${SM.cart.length ? `<div class="mbar"><span>${SM.cart.length} · <span class="num">${n0(tot)}</span></span><button class="btn p" onclick="PK.pack.pay()">💳 Lipa</button></div>` : ""}</div></div>`;
  }
  function editLine(i) {
    const l = SM.cart[i], M = roleOk(["meneja"]);
    modal(`${mhead(l.name)}<div class="form">${l.unit ? "" : `<label class="l">Idadi<input id="el-q" class="f" inputmode="numeric" value="${l.qty}"></label>`}<label class="l">Bei${M ? "" : " (meneja tu)"}<input id="el-p" class="f" inputmode="numeric" value="${l.price}" ${M ? "" : "disabled"}></label></div>
      <div class="row between"><button class="btn d" onclick="PK.sm2.cart.splice(${i},1);closeModal()">Ondoa</button><button class="btn p" onclick="const l=PK.sm2.cart[${i}];${l.unit ? "" : "l.qty=Math.max(1,num(val('el-q')));"}${M ? "l.price=num(val('el-p'));" : ""}closeModal()">Sawa</button></div>`);
  }
  function pay() {
    if (!SM.cart.length) return; const total = SM.cart.reduce((a, l) => a + l.qty * l.price, 0), serial = SM.cart.some((l) => l.unit);
    checkout({ total, title: "Malipo", credit: true, askCustomer: serial, onPay: (p) => finish(total, p) });
  }
  async function finish(total, p) {
    const lines = SM.cart.map((l) => ({ ...l, wEnd: l.warrantyM ? addMonths(today(), l.warrantyM) : "" })); SM.cart = [];
    const no = await nextNo("sale");
    save({ id: newId("sale"), t: "sale", k: "tx", no, items: lines, total, ...p, seller: PK.user.name, time: Date.now() });
    lines.forEach((l) => { if (l.unit) patch(l.unit, { status: "sold", soldNo: no, soldDay: today(), soldPrice: l.price, customer: p.customer, phone: p.phone, wEnd: l.wEnd, seller: PK.user.name }); else bump(l.prod, "qty", -l.qty); });
    if (p.balance > 0) save({ id: newId("debt"), t: "debt", name: p.customer, phone: p.phone, amount: p.balance, paidSum: 0, sale: no, since: today() });
    receipt({ title: "RISITI", no, items: lines.map((l) => ({ name: l.name + (l.imei ? " · IMEI " + l.imei : ""), qty: l.qty, price: l.price })), total, paid: p.paid, method: methodName(p.method), change: p.change, balance: p.balance, customer: p.customer, phone: p.phone,
      notes: lines.filter((l) => l.wEnd).map((l) => `🛡️ Warranty ${l.name}: hadi ${fdate(l.wEnd)}`).concat(lines.some((l) => l.wEnd) ? ["Warranty inahitaji risiti hii. Haihusu kuvunjika au maji."] : []) });
  }

  /* ---------- BIDHAA & STOCK ---------- */
  function prodForm(id) {
    const p = id ? get(id) : { name: "", brand: "", cat: "Simu", price: "", cost: "", serial: true, warrantyM: 12, qty: "" };
    modal(`${mhead(id ? "Bidhaa" : "Bidhaa mpya")}<div class="form"><label class="l" style="grid-column:1/-1">Jina / modeli<input id="pf-n" class="f" value="${esc(p.name)}" placeholder="mf. Samsung Galaxy A15 128GB"></label>
      <label class="l">Brand<input id="pf-b" class="f" list="pf-bl" value="${esc(p.brand || "")}"><datalist id="pf-bl">${["Samsung", "Tecno", "Infinix", "itel", "Apple", "Xiaomi", "Oppo", "Vivo", "Nokia", "HP", "Lenovo", "JBL", "Oraimo"].map((x) => `<option value="${x}">`).join("")}</datalist></label>
      <label class="l">Kundi<select id="pf-c" class="f">${opt(["Simu", "Tablet", "Laptop", "TV", "Spika", "Earphones", "Chaja & Waya", "Cover & Glass", "Power bank", "Vipuri", "Nyingine"], p.cat)}</select></label>
      <label class="l">Bei<input id="pf-p" class="f" inputmode="numeric" value="${esc(p.price)}"></label><label class="l">Gharama<input id="pf-k" class="f" inputmode="numeric" value="${esc(p.cost || "")}"></label>
      <label class="l">Warranty (miezi)<input id="pf-w" class="f" inputmode="numeric" value="${esc(p.warrantyM || 0)}"></label>
      ${id && p.serial ? "" : `<label class="row sm" style="grid-column:1/-1"><input id="pf-s" type="checkbox" ${p.serial ? "checked" : ""} ${id ? "disabled" : ""}> Kila kipande kina IMEI/serial (simu, laptop, TV)</label>`}
      </div>
      ${!id ? `<label class="l">Idadi (kwa bidhaa zisizo na IMEI)<input id="pf-q" class="f" inputmode="numeric"></label>` : ""}
      <div class="row between">${id ? `<button class="btn d" onclick="${stockOf(p) ? "toast('Ina stock')" : `delDoc('${id}');closeModal()`}">Futa</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.prodSave('${id || ""}')">Hifadhi</button></div>`);
  }
  function prodSave(id) {
    const d = { name: val("pf-n"), brand: val("pf-b"), cat: val("pf-c"), price: num(val("pf-p")), cost: num(val("pf-k")), warrantyM: num(val("pf-w")) }; if (!d.name || !d.price) return toast("Andika jina na bei");
    if (id) { patch(id, d); return closeModal(); }
    const nid = newId("prod"), serial = !!val("pf-s"); save({ id: nid, t: "prod", ...d, serial, qty: serial ? 0 : num(val("pf-q")) });
    if (serial) receiveForm(nid); else closeModal();
  }
  function receiveForm(pid) {
    const p = get(pid);
    modal(`${mhead("Ingiza stock · " + p.name)}${p.serial ? `<p class="mu sm" style="margin:0">Skani au andika IMEI moja kwa kila mstari (unaweza kubandika orodha). IMEI ya pili baada ya koma kwa simu za laini mbili.</p>
      <textarea id="rv-list" class="f" rows="6" placeholder="356789012345678&#10;356789012345686, 356789012345694"></textarea>
      <div class="form"><label class="l">Rangi<input id="rv-c" class="f" placeholder="mf. Nyeusi"></label><label class="l">Storage/RAM<input id="rv-s" class="f" placeholder="128GB/4GB"></label><label class="l">Gharama kwa kimoja<input id="rv-k" class="f" inputmode="numeric" value="${esc(p.cost || "")}"></label><label class="l">Msambazaji<input id="rv-sup" class="f"></label></div>`
      : `<div class="form"><label class="l">Idadi<input id="rv-q" class="f" inputmode="numeric"></label><label class="l">Gharama kwa kimoja<input id="rv-k" class="f" inputmode="numeric" value="${esc(p.cost || "")}"></label></div>`}
      <button class="btn p" onclick="PK.pack.receiveSave('${pid}')">✅ Ingiza</button>`, true);
  }
  function receiveSave(pid) {
    const p = get(pid), cost = num(val("rv-k"));
    if (!p.serial) { const q = num(val("rv-q")); if (!q) return toast("Andika idadi"); bump(pid, "qty", q); save({ id: newId("rcv"), t: "rcv", k: "tx", prod: pid, name: p.name, qty: q, value: q * cost }); if (cost) patch(pid, { cost }); closeModal(); return toast("✅ " + q + " zimeingizwa"); }
    const rows = val("rv-list").split(/\n+/).map((r) => r.split(/[,;\s]+/).filter(Boolean)).filter((r) => r.length);
    const known = new Set(units().flatMap((u) => [u.imei, u.imei2].filter(Boolean))); const bad = [], dup = [], warn = []; let n = 0;
    rows.forEach((r) => { const [a, b] = r; if (!/^[A-Za-z0-9-]{6,20}$/.test(a)) return bad.push(a); if (known.has(a)) return dup.push(a); if (imeiOk(a) && !luhn(a)) warn.push(a);
      known.add(a); save({ id: newId("unit"), t: "unit", prod: pid, imei: a, imei2: b || "", color: val("rv-c"), storage: val("rv-s"), cost: cost || p.cost || 0, sup: val("rv-sup"), status: "stock", inDay: today() }); n++; });
    if (n) { save({ id: newId("rcv"), t: "rcv", k: "tx", prod: pid, name: p.name, qty: n, value: n * (cost || p.cost || 0) }); if (cost) patch(pid, { cost }); }
    closeModal(); toast(`✅ ${n} zimeingizwa${dup.length ? " · " + dup.length + " zilikuwepo" : ""}${bad.length ? " · ❌ hazikukubalika: " + bad.slice(0, 3).join(", ") : ""}${warn.length ? " · ⚠️ " + warn.length + " hazipiti ukaguzi wa IMEI (huenda ni bandia) — hakiki" : ""}`);
  }
  function pageBidhaa() {
    const P = prods().filter((p) => match(p.name + " " + (p.brand || "") + " " + (p.cat || ""), PK.q));
    const units0 = units((u) => u.status === "stock"), value = units0.reduce((a, u) => a + (Number(u.cost) || 0), 0) + prods().filter((p) => !p.serial).reduce((a, p) => a + (Number(p.qty) || 0) * (Number(p.cost) || 0), 0);
    return `<div class="kpis">${kpi("Simu/vifaa vyenye IMEI stoo", n0(units0.length), true)}${kpi("Accessories stoo", n0(prods().filter((p) => !p.serial).reduce((a, p) => a + (Number(p.qty) || 0), 0)))}${kpi("Thamani ya stock", tzs(value))}</div>
      ${searchBox("Tafuta modeli, brand…")}
      ${P.length ? `<div class="tw"><table class="t"><thead><tr><th>Bidhaa</th><th>Kundi</th><th class="r">Bei</th><th class="r">Stoo</th><th class="r">Warranty</th><th></th></tr></thead><tbody>${P.map((p) => `<tr><td><b>${esc(p.name)}</b> ${p.serial ? '<span class="pill in">IMEI</span>' : ""}<br><small class="mu">${esc(p.brand || "")}</small></td><td>${esc(p.cat || "")}</td><td class="r num">${n0(p.price)}</td><td class="r"><span class="pill ${stockOf(p) <= 0 ? "bd" : stockOf(p) <= 2 ? "wn" : "ok"}">${stockOf(p)}</span></td><td class="r">${p.warrantyM ? p.warrantyM + "m" : "—"}</td>
        <td class="r" style="white-space:nowrap"><button class="btn s" onclick="PK.pack.receiveForm('${p.id}')">＋ Stock</button> <button class="btn s" onclick="PK.pack.prodForm('${p.id}')">✎</button></td></tr>`).join("")}</tbody></table></div>` : empty("Ongeza modeli ya kwanza.")}`;
  }

  /* ---------- IMEI / WARRANTY ---------- */
  function pageImei() {
    const f = SM.find.trim(), hits = f.length >= 4 ? units((u) => match(u.imei + " " + (u.imei2 || "") + " " + (u.customer || "") + " " + (u.phone || ""), f)).slice(0, 20) : [];
    const sold = units((u) => u.status === "sold"), active = sold.filter((u) => u.wEnd && u.wEnd >= today());
    return `<div class="kpis">${kpi("Zimeuzwa (zinafuatiliwa)", n0(sold.length))}${kpi("Warranty hai", n0(active.length), true)}${kpi("Zinaisha warranty siku 30", n0(active.filter((u) => daysBetween(today(), u.wEnd) <= 30).length))}${kpi("Zimerudishwa/matengenezo", n0(units((u) => u.status === "repair" || u.status === "returned").length))}</div>
      <div class="card"><h3>🔎 Kagua IMEI au mteja</h3><div class="row"><input id="im-f" class="f" style="flex:1;font-size:17px" placeholder="IMEI, simu au jina la mteja" value="${esc(SM.find)}" oninput="PK.sm2.find=this.value;soft()"><button class="btn" onclick="cameraScan(c=>{PK.sm2.find=c;render()})">📷</button></div>
      ${hits.map((u) => { const p = get(u.prod) || {}, w = u.wEnd && u.wEnd >= today();
        return `<div class="card flat"><div class="row between"><b>${esc(p.name || "?")}</b><span class="pill ${u.status === "stock" ? "in" : u.status === "sold" ? (w ? "ok" : "") : "wn"}">${u.status === "stock" ? "iko stoo" : u.status === "sold" ? (w ? "🛡️ warranty hai" : "warranty imeisha") : u.status === "repair" ? "matengenezo" : u.status}</span></div>
          <div class="sm num">IMEI ${esc(u.imei)}${u.imei2 ? " · " + esc(u.imei2) : ""}</div><div class="sm mu">${esc([u.color, u.storage].filter(Boolean).join(" · "))} · iliingia ${fdate(u.inDay)}${u.sup ? " · " + esc(u.sup) : ""}</div>
          ${u.status !== "stock" && u.soldDay ? `<div class="sm">Iliuzwa ${fdate(u.soldDay)} (risiti #${u.soldNo}) kwa ${esc(u.customer || "—")} ${esc(u.phone || "")} · ${tzs(u.soldPrice)}<br>Warranty hadi <b>${fdate(u.wEnd)}</b>${w ? ` (siku ${daysBetween(today(), u.wEnd)} zimebaki)` : ""}</div>` : ""}
          <div class="row">${u.status === "sold" ? `<button class="btn s" onclick="PK.pack.jobForm('',{imei:'${esc(u.imei)}',device:${JSON.stringify(p.name || "").replace(/"/g, "&quot;")},customer:${JSON.stringify(u.customer || "").replace(/"/g, "&quot;")},phone:'${esc(u.phone || "")}',warranty:${w}})">🔧 Fungua matengenezo</button>${roleOk(["meneja"]) ? `<button class="btn s d" onclick="PK.pack.returnUnit('${u.id}')">↩️ Rudisha stoo</button>` : ""}` : ""}</div></div>`; }).join("") || (f.length >= 4 ? `<p class="mu sm">Haikupatikana. Kama ni simu ya nje, bado unaweza kufungua matengenezo.</p>` : `<p class="mu sm" style="margin:0">Andika angalau tarakimu 4.</p>`)}</div>`;
  }
  function returnUnit(id) {
    const u = get(id);
    confirmBox(`Rudisha IMEI ${u.imei} stoo (mteja amerudisha)? Mrudishie pesa kwa mkono kama inahitajika.`, () => { save({ id: newId("ret"), t: "ret", k: "tx", unit: id, imei: u.imei, prod: u.prod, amount: u.soldPrice || 0, sale: u.soldNo, by: PK.user.name }); patch(id, { status: "stock", returnedDay: today(), customer: "", phone: "", wEnd: "", soldNo: "", soldDay: "" }); toast("↩️ Imerudishwa stoo"); }, "Rudisha");
  }

  /* ---------- MATENGENEZO ---------- */
  function jobForm(id, pre) {
    const j = id ? get(id) : { customer: "", phone: "", device: "", imei: "", problem: "", est: "", deposit: "", tech: "", warranty: false, accessories: "", ...(pre || {}) };
    modal(`${mhead(id ? "Kazi #" + j.no : "Pokea kifaa cha matengenezo")}<div class="form">
      <label class="l">Mteja<input id="jb-c" class="f" value="${esc(j.customer)}"></label><label class="l">Simu<input id="jb-p" class="f" inputmode="tel" value="${esc(j.phone || "")}"></label>
      <label class="l">Kifaa<input id="jb-d" class="f" value="${esc(j.device)}" placeholder="mf. Tecno Spark 10"></label><label class="l">IMEI/Serial<input id="jb-i" class="f" value="${esc(j.imei || "")}"></label>
      <label class="l" style="grid-column:1/-1">Tatizo<input id="jb-pr" class="f" value="${esc(j.problem)}" placeholder="mf. kioo kimevunjika, haichaji"></label>
      <label class="l">Alivyokiacha (vifaa)<input id="jb-a" class="f" value="${esc(j.accessories || "")}" placeholder="mf. bila cover, na laini"></label><label class="l">Fundi<input id="jb-t" class="f" value="${esc(j.tech || "")}"></label>
      <label class="l">Makadirio ya gharama<input id="jb-e" class="f" inputmode="numeric" value="${esc(j.est || "")}"></label><label class="l">Malipo ya awali<input id="jb-dp" class="f" inputmode="numeric" value="${esc(j.deposit || "")}" ${id ? "disabled" : ""}></label>
      <label class="l">Itakuwa tayari<input id="jb-r" class="f" type="date" value="${esc(j.ready || addDays(today(), 2))}"></label>
      <label class="row sm"><input id="jb-w" type="checkbox" ${j.warranty ? "checked" : ""}> Iko chini ya warranty (bure)</label></div>
      <button class="btn p" onclick="PK.pack.jobSave('${id || ""}')">${id ? "Hifadhi" : "🧾 Pokea na toa risiti"}</button>`, true);
  }
  async function jobSave(id) {
    const d = { customer: val("jb-c"), phone: val("jb-p"), device: val("jb-d"), imei: val("jb-i"), problem: val("jb-pr"), accessories: val("jb-a"), tech: val("jb-t"), est: num(val("jb-e")), ready: val("jb-r"), warranty: !!val("jb-w") };
    if (!d.customer || !d.device || !d.problem) return toast("Jaza mteja, kifaa na tatizo");
    if (id) { patch(id, d); return closeModal(); }
    const dep = num(val("jb-dp")), nid = newId("job");
    save({ id: nid, t: "job", ...d, no: "…", status: "imepokelewa", deposit: dep, parts: [], inDay: today(), log: [{ s: "imepokelewa", at: Date.now(), by: PK.user.name }] });
    if (d.warranty) { const u = units((x) => x.imei === d.imei)[0]; if (u) patch(u.id, { status: "repair" }); }
    const no = await nextNo("job"); setField(nid, "no", no);
    if (dep) save({ id: newId("jpay"), t: "jpay", k: "tx", job: nid, amount: dep, method: "cash", what: "Malipo ya awali" });
    receipt({ title: "RISITI YA KUPOKEA KIFAA", no, customer: d.customer, phone: d.phone, items: [], total: d.warranty ? 0 : d.est, paid: dep || null, balance: d.warranty ? 0 : Math.max(0, d.est - dep),
      notes: [`Kifaa: ${d.device}${d.imei ? " · " + d.imei : ""}`, `Tatizo: ${d.problem}`, d.accessories ? "Vifaa: " + d.accessories : "", `Tayari: ${fdate(d.ready)}`, d.warranty ? "🛡️ Chini ya warranty" : "", "Kifaa kisipochukuliwa ndani ya siku 30 hatuwajibiki."].filter(Boolean) });
  }
  function jobMove(id, s) { const j = get(id); patch(id, { status: s, log: (j.log || []).concat([{ s, at: Date.now(), by: PK.user.name }]) });
    if (s === "tayari" && j.phone) { const ph = String(j.phone).replace(/\D/g, "").replace(/^0/, "255"); toast("Mjulishe mteja 📲"); setTimeout(() => window.open(`https://wa.me/${ph}?text=${encodeURIComponent(`Habari ${j.customer}, ${j.device} yako (kazi #${j.no}) iko tayari ${SHOP.name}. Salio: TSh ${n0(jobDue(get(id)))}. Karibu!`)}`, "_blank"), 300); } }
  function jobDue(j) { return j.warranty ? 0 : Math.max(0, (Number(j.charge) || Number(j.est) || 0) - (Number(j.deposit) || 0)); }
  function jobView(id) {
    const j = get(id), parts = (j.parts || []);
    modal(`${mhead("Kazi #" + j.no + " · " + j.device)}<p class="sm" style="margin:0"><b>${esc(j.customer)}</b> ${esc(j.phone || "")} · ${esc(j.imei || "")}<br>Tatizo: ${esc(j.problem)}${j.accessories ? "<br>Vifaa: " + esc(j.accessories) : ""}${j.warranty ? '<br><span class="pill ok">warranty</span>' : ""}</p>
      <div class="chips">${JOB.map(([k, l]) => `<button class="chip ${j.status === k ? "on" : ""}" onclick="PK.pack.jobMove('${id}','${k}');PK.pack.jobView('${id}')">${l}</button>`).join("")}</div>
      <h4>Vipuri vilivyotumika</h4>${parts.length ? `<table class="t"><tbody>${parts.map((p) => `<tr><td>${esc(p.name)}</td><td class="r num">${n0(p.cost)}</td></tr>`).join("")}</tbody></table>` : `<p class="mu sm" style="margin:0">—</p>`}
      <div class="row" style="flex-wrap:nowrap"><input id="jp-n" class="f" placeholder="Kipuri (mf. kioo)"><input id="jp-c" class="f" style="max-width:120px" inputmode="numeric" placeholder="Gharama"><button class="btn" onclick="const n=val('jp-n');if(!n)return;patch('${id}',{parts:(get('${id}').parts||[]).concat([{name:n,cost:num(val('jp-c'))}])});PK.pack.jobView('${id}')">＋</button></div>
      <div class="form"><label class="l">Gharama ya mwisho kwa mteja<input id="jv-ch" class="f" inputmode="numeric" value="${esc(j.charge || j.est || "")}" ${j.warranty ? "disabled" : ""}></label><label class="l">Fundi<input id="jv-t" class="f" value="${esc(j.tech || "")}"></label></div>
      <p class="sm" style="margin:0">Malipo ya awali: ${tzs(j.deposit || 0)}</p>
      <div class="row between"><button class="btn" onclick="patch('${id}',{charge:num(val('jv-ch')),tech:val('jv-t')});toast('✅')">Hifadhi</button>${j.status === "tayari" ? `<button class="btn p" onclick="patch('${id}',{charge:num(val('jv-ch')),tech:val('jv-t')});setTimeout(()=>PK.pack.collect('${id}'),40)">✅ Mteja amechukua & lipa</button>` : ""}</div>`, true);
  }
  function collect(id) {
    const j = get(id), due = j.warranty ? 0 : Math.max(0, (Number(j.charge) || Number(j.est) || 0) - (Number(j.deposit) || 0));
    const done = (p) => {
      if (p && p.paid) save({ id: newId("jpay"), t: "jpay", k: "tx", job: id, amount: p.paid, method: p.method, what: "Malipo ya mwisho" });
      const partsCost = (j.parts || []).reduce((a, x) => a + (Number(x.cost) || 0), 0);
      archive(id, { status: "imechukuliwa", outDay: today(), total: j.warranty ? 0 : Number(j.charge) || Number(j.est) || 0, partsCost, log: (j.log || []).concat([{ s: "imechukuliwa", at: Date.now(), by: PK.user.name }]) });
      if (j.warranty) { const u = units((x) => x.imei === j.imei)[0]; if (u && u.status === "repair") patch(u.id, { status: "sold" }); }
      closeModal(); toast("✅ Kazi #" + j.no + " imefungwa");
    };
    if (!due) return done(null);
    checkout({ total: due, title: "Malipo · kazi #" + j.no, customer: j.customer, phone: j.phone, onPay: (p) => { done(p); receipt({ title: "RISITI YA MATENGENEZO", no: j.no, customer: j.customer, phone: j.phone, items: [{ name: j.device + " — " + j.problem, qty: 1, price: Number(j.charge) || Number(j.est) || 0 }], total: Number(j.charge) || Number(j.est) || 0, paid: (Number(j.deposit) || 0) + p.paid, method: methodName(p.method), notes: ["Warranty ya matengenezo: siku " + (S("repairWarranty", 30) || 30)] }); } });
  }
  function pageMatengenezo() {
    const J = jobs();
    return `<div class="kpis">${kpi("Kazi zilizopo", n0(J.length), true)}${kpi("Tayari kuchukuliwa", n0(J.filter((j) => j.status === "tayari").length))}${kpi("Zimechelewa", n0(J.filter((j) => j.ready && j.ready < today() && j.status !== "tayari").length))}${kpi("Mapato ya matengenezo (siku 30)", tzs(txList("jpay").reduce((a, p) => a + p.amount, 0)))}</div>
      <div class="kan">${JOB.map(([k, l, c]) => { const L = J.filter((j) => j.status === k); return `<div class="col"><h4><span>${l}</span><span class="pill ${c}">${L.length}</span></h4>${L.map((j) => `<button class="tk ${j.ready && j.ready < today() && k !== "tayari" ? "late" : ""}" style="text-align:left;cursor:pointer;font:inherit;color:inherit" onclick="PK.pack.jobView('${j.id}')"><div class="row between"><b>#${j.no} · ${esc(j.device)}</b>${j.warranty ? '<span class="pill ok">W</span>' : ""}</div><span class="sm">${esc(j.problem)}</span><span class="xs mu">${esc(j.customer)} · tayari ${fdate(j.ready)}${j.tech ? " · " + esc(j.tech) : ""}</span></button>`).join("") || `<p class="mu sm" style="margin:0">—</p>`}</div>`; }).join("")}</div>`;
  }

  /* ---------- RIPOTI ---------- */
  function pageRipoti() {
    const R = txList("sale", (s) => inRange(s.day)), L = R.flatMap((s) => s.items), total = R.reduce((a, s) => a + s.total, 0), profit = L.reduce((a, l) => a + l.qty * (l.price - (l.cost || 0)), 0);
    const JP = txList("jpay", (p) => inRange(p.day)), jobsDone = txList("job", (j) => inRange(j.day)), repProfit = jobsDone.reduce((a, j) => a + (j.total || 0) - (j.partsCost || 0), 0);
    const byBrand = groupSum(L, (l) => (get(l.prod) || {}).brand || "—", (l) => l.qty * l.price), top = groupSum(L, (l) => (get(l.prod) || {}).name || l.name, (l) => l.qty).slice(0, 10);
    const aged = units((u) => u.status === "stock" && u.inDay && daysBetween(u.inDay, today()) > 60);
    return `<div class="row between">${rangeChips()}<button class="btn s" onclick="downloadCSV('mauzo-simu-'+PK.range,[['Tarehe','Risiti','Bidhaa','IMEI','Bei','Mteja','Simu']].concat(txList('sale',s=>inRange(s.day)).flatMap(s=>s.items.map(l=>[s.day,s.no,l.name,l.imei||'',l.price*l.qty,s.customer,s.phone]))))">⬇️ CSV</button></div>
      <div class="kpis">${kpi("Mauzo", tzs(total), true)}${kpi("Faida ya mauzo", tzs(profit))}${kpi("Simu zilizouzwa", n0(L.filter((l) => l.imei).length))}${kpi("Mapato ya matengenezo", tzs(JP.reduce((a, p) => a + p.amount, 0)))}${kpi("Faida ya matengenezo", tzs(repProfit))}</div>
      <div class="card"><h3>Mauzo kwa siku (siku 14)</h3>${bars(dailySeries(txList("sale"), 14, (s) => s.total))}</div>
      <div class="grid2"><div class="card"><h3>Modeli zinazouzika</h3><table class="t"><tbody>${top.map((t) => `<tr><td>${esc(t.key)}</td><td class="r">${n0(t.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table><h3>Kwa brand</h3><table class="t"><tbody>${byBrand.map((t) => `<tr><td>${esc(t.key)}</td><td class="r num">${n0(t.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div>
        <div class="card"><h3>Njia za malipo</h3><table class="t"><tbody>${methodRows(R).map((m) => `<tr><td>${esc(m.key)}</td><td class="r num">${n0(m.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>
          <h3>🐢 Zimekaa stoo siku 60+</h3>${aged.length ? `<table class="t"><tbody>${aged.slice(0, 12).map((u) => `<tr><td>${esc((get(u.prod) || {}).name)}</td><td class="num xs">${esc(u.imei)}</td><td class="r">${daysBetween(u.inDay, today())}s</td></tr>`).join("")}</tbody></table>` : `<p class="mu sm">Hakuna. 👍</p>`}</div></div>`;
  }

  registerPack({
    id: "simu", name: "Simu & Electronics", theme: "theluji", home: "uza",
    money: (inR) => { const R = txList("sale", (s) => inR(s.day)), J = txList("job", (j) => inR(j.day)); return { rev: R.reduce((a, s) => a + s.total, 0) + J.reduce((a, j) => a + (j.total || 0), 0), cost: R.reduce((a, s) => a + s.items.reduce((b, l) => b + l.qty * (l.cost || 0), 0), 0) + J.reduce((a, j) => a + (j.partsCost || 0), 0) }; },
    roles: [["meneja", "Meneja"], ["muuzaji", "Muuzaji"], ["fundi", "Fundi"]],
    pages: [
      { id: "uza", label: "Uza", icon: "📱", roles: ["meneja", "muuzaji"], render: pageUza },
      { id: "bidhaa", label: "Bidhaa", icon: "📦", roles: ["meneja", "muuzaji"], render: pageBidhaa, actions: () => roleOk(["meneja"]) ? `<button class="btn p s" onclick="PK.pack.prodForm()">＋ Bidhaa</button>` : "" },
      { id: "imei", label: "IMEI", icon: "🔎", roles: ["meneja", "muuzaji", "fundi"], render: pageImei },
      { id: "matengenezo", label: "Matengenezo", icon: "🔧", roles: ["meneja", "muuzaji", "fundi"], render: pageMatengenezo, actions: () => `<button class="btn p s" onclick="PK.pack.jobForm()">＋ Pokea kifaa</button>`, badge: () => jobs().filter((j) => j.status === "tayari").length || "" },
      { id: "ripoti", label: "Ripoti", icon: "📊", roles: ["meneja"], render: pageRipoti },
    ],
    settings: [{ key: "repairWarranty", label: "Warranty ya matengenezo (siku)", type: "number", def: 30 }],
    onScan: (code) => scanImei(code),
    add, pickUnit, addUnit, scanImei, editLine, pay, prodForm, prodSave, receiveForm, receiveSave, returnUnit, jobForm, jobSave, jobMove, jobView, collect,
  });
})();
