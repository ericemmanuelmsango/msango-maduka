/* =====================================================================
   PAKITI: MSAMBAZAJI / WHOLESALE  · msambazaji.js v1
   Oda za maduka (mpya → imepakiwa → njiani → imefikishwa), maduka-wateja
   wenye kikomo cha mkopo, njia (routes) na wauzaji, ankara zenye umri wa
   deni (aging), makusanyo, stoo, ripoti.
   ===================================================================== */
(function () {
  const MS = { draft: null, route: "", q: "" };
  PK.ms = MS;
  const prods = () => list("prod").sort((a, b) => a.name.localeCompare(b.name));
  const custs = () => list("cust").sort((a, b) => a.name.localeCompare(b.name));
  const routes = () => list("route").sort((a, b) => a.name.localeCompare(b.name));
  const orders = (pred) => list("ord", pred);
  const invs = (pred) => list("inv", pred);
  const bal = (c) => invs((i) => i.cust === c.id).reduce((a, i) => a + (i.total - (i.paid || 0)), 0) - (Number(c.advance) || 0);
  const terms = () => Number(S("terms", 14)) || 14;
  const WD = [["1", "Jtt"], ["2", "Jnn"], ["3", "Jtn"], ["4", "Alh"], ["5", "Ijm"], ["6", "Jms"], ["0", "Jpl"]];
  const todayWd = () => String(new Date().getDay());
  const ST = [["mpya", "Mpya", "in"], ["imepakiwa", "Imepakiwa", "wn"], ["njiani", "Njiani", "ac"]];
  const age = (i) => daysBetween(i.day0 || i.day, today());
  const overdue = (i) => i.due < today();

  /* ---------- ODA ---------- */
  function orderForm(custId) {
    MS.draft = { cust: custId || "", items: [], note: "", due: addDays(today(), 1) }; drawOrder();
  }
  function drawOrder() {
    const D = MS.draft, c = D.cust && get(D.cust), tot = D.items.reduce((a, l) => a + l.qty * l.price, 0), b = c ? bal(c) : 0, lim = c ? Number(c.limit) || 0 : 0;
    modal(`${mhead("Oda mpya")}<label class="l">Duka (mteja)<select id="od-c" class="f" onchange="PK.ms.draft.cust=this.value;PK.pack.drawOrder()"><option value="">— chagua —</option>${opt(custs().map((x) => [x.id, x.name + (x.area ? " · " + x.area : "")]), D.cust)}</select></label>
      ${c ? `<div class="row between sm"><span>Deni: <b class="num">${n0(b)}</b>${lim ? ` · Kikomo: <b class="num">${n0(lim)}</b>` : ""}</span>${lim && b + tot > lim ? `<span class="pill bd">itazidi kikomo kwa ${n0(b + tot - lim)}</span>` : ""}</div>` : ""}
      <div class="row" style="flex-wrap:nowrap"><select id="od-p" class="f">${opt(prods().map((p) => [p.id, `${p.name} · ${n0(p.price)}/${p.unit || "ktn"} · stoo ${n0(p.qty)}`]))}</select><input id="od-q" class="f" style="max-width:90px" inputmode="numeric" placeholder="Idadi"><button class="btn" onclick="PK.pack.odAdd()">＋</button></div>
      ${D.items.length ? `<div class="tw"><table class="t"><tbody>${D.items.map((l, i) => `<tr><td>${esc(l.name)}</td><td class="r num">${l.qty} × ${n0(l.price)}</td><td class="r num">${n0(l.qty * l.price)}</td><td class="r"><button class="btn g s" onclick="PK.ms.draft.items.splice(${i},1);PK.pack.drawOrder()">✕</button></td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="total"><span>Jumla</span><span class="num">${n0(tot)}</span></div>
      <div class="form"><label class="l">Ifikishwe<input id="od-d" class="f" type="date" value="${D.due}" onchange="PK.ms.draft.due=this.value"></label><label class="l">Maelezo<input id="od-n" class="f" value="${esc(D.note)}" oninput="PK.ms.draft.note=this.value"></label></div>
      <button class="btn p big" onclick="PK.pack.odSave()" ${D.items.length && D.cust ? "" : "disabled"}>✅ Hifadhi oda</button>`, true);
  }
  function odAdd() {
    const p = get(val("od-p")), q = num(val("od-q")); if (!p || !q) return toast("Chagua bidhaa na idadi");
    const l = MS.draft.items.find((x) => x.prod === p.id); if (l) l.qty += q; else MS.draft.items.push({ prod: p.id, name: p.name, unit: p.unit || "", qty: q, price: Number(p.price) || 0, cost: Number(p.cost) || 0 });
    drawOrder();
  }
  async function odSave() {
    const D = MS.draft, c = get(D.cust), tot = D.items.reduce((a, l) => a + l.qty * l.price, 0), lim = Number(c.limit) || 0;
    if (lim && bal(c) + tot > lim && !roleOk(["meneja"]) && !MS.force) return toast("Inazidi kikomo cha mkopo — meneja aidhinishe");
    const id = newId("ord");
    save({ id, t: "ord", no: "…", cust: c.id, custName: c.name, route: c.route || "", items: D.items, total: tot, status: "mpya", due: D.due, note: D.note, rep: PK.user.name, openAt: Date.now() });
    MS.draft = null; closeModal(); toast("✅ Oda imehifadhiwa");
    const no = await nextNo("ord"); if (get(id)) setField(id, "no", no);
  }
  function move(id, s) {
    const o = get(id);
    if (s === "imepakiwa") { const short = o.items.filter((l) => (Number((get(l.prod) || {}).qty) || 0) < l.qty); if (short.length && !MS.force) { MS.force = true; return toast("⚠️ Stoo haitoshi: " + short.map((l) => l.name).join(", ") + ". Bonyeza tena kupakia hata hivyo."); } MS.force = false; o.items.forEach((l) => bump(l.prod, "qty", -l.qty)); }
    patch(id, { status: s, [s + "At"]: Date.now(), [s + "By"]: PK.user.name });
  }
  function deliverForm(id) {
    const o = get(id), c = get(o.cust) || {};
    modal(`${mhead("Fikisha oda #" + o.no + " · " + o.custName)}<div class="tw"><table class="t"><tbody>${o.items.map((l, i) => `<tr><td>${esc(l.name)}</td><td class="r">Imepokelewa <input id="dl-${i}" class="f" style="width:70px;padding:6px;display:inline-block" inputmode="numeric" value="${l.qty}"> / ${l.qty}</td><td class="r num">${n0(l.price)}</td></tr>`).join("")}</tbody></table></div>
      <p class="sm mu" style="margin:0">Kama duka limepokea pungufu, punguza idadi — zilizobaki zinarudi stoo.</p>
      <div class="form"><label class="l">Pesa iliyopokelewa sasa<input id="dl-paid" class="f" inputmode="numeric" placeholder="0 = deni lote"></label><label class="l">Njia<select id="dl-m" class="f">${opt(METHODS.filter((m) => m[0] !== "credit"), "cash")}</select></label></div>
      <p class="sm" style="margin:0">Deni la sasa la duka: <b>${tzs(bal(c))}</b> · Muda wa kulipa: siku ${terms()}</p>
      <button class="btn p big" onclick="PK.pack.deliver('${id}')">🚚 Imefikishwa — toa ankara</button>`, true);
  }
  async function deliver(id) {
    const o = get(id), c = get(o.cust); const items = o.items.map((l, i) => ({ ...l, qty: Math.min(l.qty, Math.max(0, num(val("dl-" + i)))) }));
    o.items.forEach((l, i) => { const back = l.qty - items[i].qty; if (back > 0) bump(l.prod, "qty", back); });
    const total = items.reduce((a, l) => a + l.qty * l.price, 0), paid = Math.min(num(val("dl-paid")), total), m = val("dl-m");
    archive(id, { status: "imefikishwa", items, total, deliveredBy: PK.user.name, deliveredAt: Date.now() });
    const invNo = await nextNo("inv"), invId = newId("inv");
    save({ id: invId, t: "inv", no: invNo, ord: o.no, cust: o.cust, custName: o.custName, route: o.route, rep: o.rep, items: items.filter((l) => l.qty), total, paid: 0, day0: today(), due: addDays(today(), terms()), status: "wazi" });
    if (paid) setTimeout(() => collect(o.cust, paid, m, "Wakati wa kufikisha"), 60);
    closeModal(); toast("✅ Ankara #" + invNo + " · " + tzs(total));
    setTimeout(() => printInv(invId), 120);
  }
  function pageOda() {
    const O = orders(), R = routes();
    const f = (o) => !MS.route || o.route === MS.route;
    return `<div class="kpis">${kpi("Oda wazi", n0(O.length), true)}${kpi("Thamani", tzs(O.reduce((a, o) => a + o.total, 0)))}${kpi("Zinafikishwa leo", n0(O.filter((o) => o.due <= today()).length))}${kpi("Zimefikishwa leo", n0(txList("ord", (o) => o.day === today()).length))}</div>
      ${R.length ? `<div class="chips"><button class="chip ${!MS.route ? "on" : ""}" onclick="PK.ms.route='';render()">Njia zote</button>${R.map((r) => `<button class="chip ${MS.route === r.id ? "on" : ""}" onclick="PK.ms.route='${r.id}';render()">${esc(r.name)}</button>`).join("")}</div>` : ""}
      <div class="kan">${ST.map(([k, l, c]) => { const L = O.filter((o) => o.status === k && f(o)).sort((a, b) => a.due.localeCompare(b.due));
        return `<div class="col"><h4><span>${l}</span><span class="pill ${c}">${L.length} · ${n0(L.reduce((a, o) => a + o.total, 0))}</span></h4>${L.map((o) => `<div class="tk ${o.due < today() ? "late" : ""}"><div class="row between"><b>#${o.no} · ${esc(o.custName)}</b><span class="num">${n0(o.total)}</span></div>
          <span class="xs mu">${o.items.map((i) => i.qty + "× " + esc(i.name)).join(", ")}</span><span class="xs mu">${esc((get(o.route) || {}).name || "")} · ${esc(o.rep)} · ifike ${fdate(o.due)}</span>
          <div class="row">${k === "mpya" && roleOk(["meneja", "stoo"]) ? `<button class="btn s p" onclick="PK.pack.move('${o.id}','imepakiwa')">📦 Pakia</button>` : ""}${k === "imepakiwa" && roleOk(["meneja", "stoo", "dereva"]) ? `<button class="btn s p" onclick="PK.pack.move('${o.id}','njiani')">🚚 Ondoka</button>` : ""}${k === "njiani" && roleOk(["meneja", "dereva"]) ? `<button class="btn s p" onclick="PK.pack.deliverForm('${o.id}')">✅ Fikisha</button>` : ""}
            ${k === "mpya" ? `<button class="btn s" onclick="confirmBox('Futa oda #${o.no}?',()=>delDoc('${o.id}'),'Futa')">✕</button>` : ""}</div></div>`).join("") || `<p class="mu sm" style="margin:0">—</p>`}</div>`; }).join("")}</div>`;
  }

  /* ---------- MADUKA ---------- */
  function custForm(id) {
    const c = id ? get(id) : { name: "", owner: "", phone: "", area: "", route: MS.route || "", limit: S("defLimit", 500000), tin: "" };
    modal(`${mhead(id ? "Duka" : "Duka jipya (mteja)")}<div class="form"><label class="l">Jina la duka<input id="cf-n" class="f" value="${esc(c.name)}"></label><label class="l">Mmiliki<input id="cf-o" class="f" value="${esc(c.owner || "")}"></label>
      <label class="l">Simu<input id="cf-p" class="f" inputmode="tel" value="${esc(c.phone || "")}"></label><label class="l">Eneo<input id="cf-a" class="f" value="${esc(c.area || "")}"></label>
      <label class="l">Njia<select id="cf-r" class="f"><option value="">—</option>${opt(routes().map((r) => [r.id, r.name]), c.route)}</select></label><label class="l">Kikomo cha mkopo<input id="cf-l" class="f" inputmode="numeric" value="${esc(c.limit || "")}" placeholder="0 = hakuna kikomo"></label>
      <label class="l">TIN<input id="cf-t" class="f" value="${esc(c.tin || "")}"></label></div>
      <button class="btn p" onclick="PK.pack.custSave('${id || ""}')">Hifadhi</button>`);
  }
  function custSave(id) { const d = { name: val("cf-n"), owner: val("cf-o"), phone: val("cf-p"), area: val("cf-a"), route: val("cf-r"), limit: num(val("cf-l")), tin: val("cf-t") }; if (!d.name) return toast("Andika jina"); if (id) patch(id, d); else save({ id: newId("cust"), t: "cust", ...d, since: today() }); closeModal(); }
  function custView(id) {
    const c = get(id), I = invs((i) => i.cust === id).sort((a, b) => a.day0.localeCompare(b.day0)), P = txList("pay", (p) => p.cust === id).sort((a, b) => b.at - a.at).slice(0, 8), b = bal(c);
    const ph = String(c.phone || "").replace(/\D/g, "").replace(/^0/, "255");
    const msg = encodeURIComponent(`Habari ${c.owner || c.name}, salio la deni lako kwa ${SHOP.name} ni TSh ${n0(b)}.\n${I.map((i) => `Ankara #${i.no} (${fdate(i.day0)}): ${n0(i.total - (i.paid || 0))}${overdue(i) ? " — imepita muda" : ""}`).join("\n")}\nAsante.`);
    modal(`${mhead(c.name)}<p class="sm" style="margin:0">${esc(c.owner || "")} · ${esc(c.phone || "")} · ${esc(c.area || "")} · ${esc((get(c.route) || {}).name || "")}</p>
      <div class="kpis">${kpi("Deni", tzs(b), b > 0)}${kpi("Kikomo", c.limit ? tzs(c.limit) : "—")}${kpi("Ankara wazi", n0(I.length))}</div>
      ${I.length ? `<table class="t"><thead><tr><th>Ankara</th><th>Tarehe</th><th>Mwisho</th><th class="r">Salio</th></tr></thead><tbody>${I.map((i) => `<tr class="click" onclick="PK.pack.printInv('${i.id}')"><td>#${i.no}</td><td>${fdate(i.day0)}</td><td>${fdate(i.due)} ${overdue(i) ? '<span class="pill bd">imepita</span>' : ""}</td><td class="r num">${n0(i.total - (i.paid || 0))}</td></tr>`).join("")}</tbody></table>` : ""}
      ${P.length ? `<h4>Malipo ya karibuni</h4><table class="t"><tbody>${P.map((p) => `<tr><td>${fdate(p.day)}</td><td>${esc(methodName(p.method))}</td><td class="r num">${n0(p.amount)}</td></tr>`).join("")}</tbody></table>` : ""}
      <div class="row"><button class="btn p" onclick="PK.pack.payForm('${id}')">💵 Pokea malipo</button><button class="btn" onclick="closeModal();PK.pack.orderForm('${id}')">📝 Oda</button>${ph && b > 0 ? `<a class="btn" target="_blank" href="https://wa.me/${ph}?text=${msg}">📲 Kumbusha deni</a>` : ""}<button class="btn" onclick="PK.pack.custForm('${id}')">✎</button></div>`, true);
  }
  function pageMaduka() {
    const C = custs().filter((c) => match(c.name + " " + (c.owner || "") + " " + (c.area || "") + " " + (c.phone || ""), PK.q) && (!MS.route || c.route === MS.route));
    const total = custs().reduce((a, c) => a + Math.max(0, bal(c)), 0), over = custs().filter((c) => c.limit && bal(c) > c.limit);
    return `<div class="kpis">${kpi("Maduka", n0(custs().length))}${kpi("Madeni yote", tzs(total), true)}${kpi("Yamezidi kikomo", n0(over.length))}${kpi("Yenye ankara zilizopita muda", n0(new Set(invs(overdue).map((i) => i.cust)).size))}</div>
      <div class="row between">${searchBox("Tafuta duka, mmiliki, eneo…")}${routes().length ? `<div class="chips"><button class="chip ${!MS.route ? "on" : ""}" onclick="PK.ms.route='';render()">Zote</button>${routes().map((r) => `<button class="chip ${MS.route === r.id ? "on" : ""}" onclick="PK.ms.route='${r.id}';render()">${esc(r.name)}</button>`).join("")}</div>` : ""}</div>
      ${C.length ? `<div class="tw"><table class="t"><thead><tr><th>Duka</th><th>Eneo / Njia</th><th class="r">Deni</th><th class="r">Kikomo</th><th></th></tr></thead><tbody>${C.map((c) => { const b = bal(c); return `<tr class="click" onclick="PK.pack.custView('${c.id}')"><td><b>${esc(c.name)}</b><br><small class="mu">${esc(c.owner || "")} ${esc(c.phone || "")}</small></td><td>${esc(c.area || "")}<br><small class="mu">${esc((get(c.route) || {}).name || "")}</small></td>
        <td class="r num" style="${b > 0 ? "color:var(--bd);font-weight:700" : ""}">${n0(b)}</td><td class="r">${c.limit ? `<span class="pill ${b > c.limit ? "bd" : b > c.limit * 0.8 ? "wn" : "ok"}">${n0(c.limit)}</span>` : "—"}</td><td class="r"><button class="btn s" onclick="event.stopPropagation();PK.pack.orderForm('${c.id}')">📝 Oda</button></td></tr>`; }).join("")}</tbody></table></div>` : empty("Ongeza maduka unayoyasambazia.")}`;
  }

  /* ---------- MALIPO / ANKARA ---------- */
  function payForm(custId) {
    const c = get(custId);
    modal(`${mhead("Pokea malipo · " + c.name)}<p class="sm" style="margin:0">Deni: <b>${tzs(bal(c))}</b>. Malipo yanalipa ankara za zamani kwanza.</p>
      <div class="form"><label class="l">Kiasi<input id="pf-a" class="f" inputmode="numeric" value="${Math.max(0, bal(c))}"></label><label class="l">Njia<select id="pf-m" class="f">${opt(METHODS.filter((m) => m[0] !== "credit"), "mpesa")}</select></label><label class="l">Kumbukumbu<input id="pf-r" class="f" placeholder="namba ya muamala/cheki"></label></div>
      <button class="btn p" onclick="const a=num(val('pf-a'));if(!a)return toast('Andika kiasi');const m=val('pf-m'),r=val('pf-r');closeModal();PK.pack.collect('${custId}',a,m,r)">✅ Pokea</button>`);
  }
  function collect(custId, amount, method, ref) {
    const c = get(custId); let left = amount; const alloc = [];
    invs((i) => i.cust === custId).sort((a, b) => a.day0.localeCompare(b.day0) || a.no - b.no).forEach((i) => { if (left <= 0) return; const due = i.total - (i.paid || 0), take = Math.min(due, left); if (take <= 0) return; left -= take; alloc.push({ inv: i.no, amt: take });
      if (take >= due) archive(i.id, { paid: i.total, status: "imelipwa", paidAt: Date.now() }); else patch(i.id, { paid: (i.paid || 0) + take }); });
    if (left > 0) patch(custId, { advance: (Number(c.advance) || 0) + left });
    save({ id: newId("pay"), t: "pay", k: "tx", cust: custId, custName: c.name, route: c.route || "", amount, method, ref: ref || "", alloc, by: PK.user.name });
    toast("✅ " + tzs(amount) + " · " + (alloc.length ? "ankara " + alloc.map((a) => "#" + a.inv).join(", ") : "malipo ya mbele"));
    receipt({ title: "STAKABADHI YA MALIPO", customer: c.name, phone: c.phone, items: alloc.map((a) => ({ name: "Ankara #" + a.inv, qty: 1, price: a.amt })), total: amount, paid: amount, method: methodName(method), notes: ["Deni lililobaki: TSh " + n0(Math.max(0, bal(get(custId))))] });
  }
  function printInv(id) {
    const i = get(id); if (!i) return; const c = get(i.cust) || {};
    receipt({ title: "ANKARA (INVOICE)", no: i.no, customer: i.custName + (c.tin ? " · TIN " + c.tin : ""), phone: c.phone, items: i.items, total: i.total, paid: i.paid || 0, balance: i.total - (i.paid || 0), notes: [`Oda #${i.ord} · Tarehe ${fdate(i.day0)}`, `Lipa kabla ya: ${fdate(i.due)}`] });
  }
  function pageAnkara() {
    const I = invs().sort((a, b) => a.due.localeCompare(b.due)), owed = (i) => i.total - (i.paid || 0);
    const B = [["0–7", (i) => age(i) <= 7], ["8–30", (i) => age(i) > 7 && age(i) <= 30], ["31–60", (i) => age(i) > 30 && age(i) <= 60], ["60+", (i) => age(i) > 60]];
    return `<div class="kpis">${B.map(([l, f], k) => kpi("Siku " + l, tzs(I.filter(f).reduce((a, i) => a + owed(i), 0)), k === 3)).join("")}${kpi("Zimepita muda wa kulipa", n0(I.filter(overdue).length))}</div>
      ${I.length ? `<div class="tw"><table class="t"><thead><tr><th>#</th><th>Duka</th><th>Tarehe</th><th>Mwisho</th><th class="r">Jumla</th><th class="r">Salio</th><th></th></tr></thead><tbody>${I.map((i) => `<tr><td class="num">${i.no}</td><td><b>${esc(i.custName)}</b><br><small class="mu">${esc((get(i.route) || {}).name || "")}</small></td><td>${fdate(i.day0)}<br><small class="mu">siku ${age(i)}</small></td><td>${fdate(i.due)} ${overdue(i) ? '<span class="pill bd">imepita</span>' : ""}</td><td class="r num">${n0(i.total)}</td><td class="r num"><b>${n0(owed(i))}</b></td>
        <td class="r" style="white-space:nowrap"><button class="btn s" onclick="PK.pack.printInv('${i.id}')">🧾</button> <button class="btn s p" onclick="PK.pack.payForm('${i.cust}')">💵</button></td></tr>`).join("")}</tbody></table></div>` : empty("Hakuna ankara zinazodaiwa. 🎉")}`;
  }

  /* ---------- NJIA ---------- */
  function routeForm(id) {
    const r = id ? get(id) : { name: "", days: [], rep: "", vehicle: "" };
    modal(`${mhead(id ? "Njia" : "Njia mpya")}<div class="form"><label class="l">Jina<input id="rf-n" class="f" value="${esc(r.name)}" placeholder="mf. Igoma – Buhongwa"></label><label class="l">Muuzaji / dereva<input id="rf-r" class="f" value="${esc(r.rep || "")}"></label><label class="l">Gari<input id="rf-v" class="f" value="${esc(r.vehicle || "")}" placeholder="T 123 ABC"></label></div>
      <div class="chips">${WD.map(([k, l]) => `<label class="chip"><input type="checkbox" id="rf-d${k}" ${(r.days || []).includes(k) ? "checked" : ""}> ${l}</label>`).join("")}</div>
      <div class="row between">${id ? `<button class="btn d" onclick="${custs().some((c) => c.route === id) ? "toast('Njia ina maduka')" : `delDoc('${id}');closeModal()`}">Futa</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.routeSave('${id || ""}')">Hifadhi</button></div>`);
  }
  function routeSave(id) { const d = { name: val("rf-n"), rep: val("rf-r"), vehicle: val("rf-v"), days: WD.map(([k]) => k).filter((k) => val("rf-d" + k)) }; if (!d.name) return toast("Andika jina"); if (id) patch(id, d); else save({ id: newId("route"), t: "route", ...d }); closeModal(); }
  function pageNjia() {
    const R = routes(), wd = todayWd();
    if (!R.length) return empty("Panga njia (routes) — kila njia ina maduka yake, siku za kupita na muuzaji/dereva.", `<button class="btn p" onclick="PK.pack.routeForm()">＋ Njia</button>`);
    return `<div class="grid2">${R.map((r) => { const C = custs().filter((c) => c.route === r.id), O = orders((o) => o.route === r.id), debt = C.reduce((a, c) => a + Math.max(0, bal(c)), 0), on = (r.days || []).includes(wd);
      return `<div class="card ${on ? "" : ""}" style="${on ? "border-color:var(--ac)" : ""}"><div class="row between"><h3>${esc(r.name)}</h3>${on ? '<span class="pill ac">leo</span>' : ""}</div>
        <p class="sm mu" style="margin:0">${(r.days || []).map((d) => (WD.find((x) => x[0] === d) || [, d])[1]).join(" · ") || "siku hazijapangwa"} · ${esc(r.rep || "—")} ${r.vehicle ? "· 🚚 " + esc(r.vehicle) : ""}</p>
        <div class="kpis">${kpi("Maduka", n0(C.length))}${kpi("Oda wazi", n0(O.length))}${kpi("Madeni", tzs(debt))}</div>
        ${C.length ? `<table class="t"><tbody>${C.map((c) => { const b = bal(c), o = O.filter((x) => x.cust === c.id); return `<tr class="click" onclick="PK.pack.custView('${c.id}')"><td>${esc(c.name)}<br><small class="mu">${esc(c.area || "")}</small></td><td>${o.length ? `<span class="pill in">${o.length} oda</span>` : ""}</td><td class="r num" style="${b > 0 ? "color:var(--bd)" : ""}">${n0(b)}</td></tr>`; }).join("")}</tbody></table>` : `<p class="mu sm" style="margin:0">Hakuna maduka bado.</p>`}
        <div class="row"><button class="btn s" onclick="PK.pack.routeSheet('${r.id}')">⬇️ Karatasi ya safari</button><button class="btn s" onclick="PK.pack.routeForm('${r.id}')">✎</button></div></div>`; }).join("")}</div>`;
  }
  function routeSheet(id) {
    const r = get(id), C = custs().filter((c) => c.route === id);
    downloadCSV("safari-" + slugify(r.name) + "-" + today(), [["Duka", "Mmiliki", "Simu", "Eneo", "Oda za kufikisha", "Thamani ya oda", "Deni", "Amelipa", "Saini"]].concat(C.map((c) => { const O = orders((o) => o.cust === c.id && o.status !== "mpya"); return [c.name, c.owner, c.phone, c.area, O.map((o) => "#" + o.no).join(" "), O.reduce((a, o) => a + o.total, 0), bal(c), "", ""]; })));
  }
  const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  /* ---------- BIDHAA (stoo) ---------- */
  function prodForm(id) {
    const p = id ? get(id) : { name: "", unit: "katoni", price: "", cost: "", qty: "", min: 10, pack: "" };
    modal(`${mhead(id ? "Bidhaa" : "Bidhaa mpya")}<div class="form"><label class="l" style="grid-column:1/-1">Jina<input id="pr-n" class="f" value="${esc(p.name)}" placeholder="mf. Azam Embe 500ml"></label>
      <label class="l">Kipimo cha kuuza<select id="pr-u" class="f">${opt(["katoni", "dazeni", "bandó", "mfuko", "kreti", "pc"], p.unit)}</select></label><label class="l">Vipande ndani<input id="pr-k" class="f" inputmode="numeric" value="${esc(p.pack || "")}" placeholder="mf. 24"></label>
      <label class="l">Bei ya jumla<input id="pr-p" class="f" inputmode="numeric" value="${esc(p.price)}"></label><label class="l">Gharama<input id="pr-c" class="f" inputmode="numeric" value="${esc(p.cost || "")}"></label>
      <label class="l">${id ? "Ongeza stoo" : "Stoo ya mwanzo"}<input id="pr-q" class="f" inputmode="numeric" placeholder="${id ? "+0 (iliyopo " + n0(p.qty) + ")" : ""}"></label><label class="l">Tahadhari ikifika<input id="pr-m" class="f" inputmode="numeric" value="${esc(p.min)}"></label></div>
      <button class="btn p" onclick="PK.pack.prodSave('${id || ""}')">Hifadhi</button>`);
  }
  function prodSave(id) { const d = { name: val("pr-n"), unit: val("pr-u"), pack: num(val("pr-k")), price: num(val("pr-p")), cost: num(val("pr-c")), min: num(val("pr-m")) }; if (!d.name || !d.price) return toast("Andika jina na bei"); const q = num(val("pr-q")); if (id) { patch(id, d); if (q) { bump(id, "qty", q); save({ id: newId("rcv"), t: "rcv", k: "tx", prod: id, name: d.name, qty: q, value: q * d.cost }); } } else save({ id: newId("prod"), t: "prod", ...d, qty: q }); closeModal(); }
  function pageBidhaa() {
    const P = prods().filter((p) => match(p.name, PK.q)), reserved = (pid) => orders((o) => o.status === "mpya").reduce((a, o) => a + o.items.filter((l) => l.prod === pid).reduce((b, l) => b + l.qty, 0), 0);
    return `<div class="kpis">${kpi("Bidhaa", n0(prods().length))}${kpi("Thamani ya stoo", tzs(prods().reduce((a, p) => a + Math.max(0, p.qty || 0) * (p.cost || 0), 0)), true)}${kpi("Zinazoisha", n0(prods().filter((p) => (p.qty || 0) - reserved(p.id) <= (p.min || 0)).length))}</div>${searchBox("Tafuta bidhaa…")}
      ${P.length ? `<div class="tw"><table class="t"><thead><tr><th>Bidhaa</th><th class="r">Bei</th><th class="r">Stoo</th><th class="r">Zimeagizwa</th><th class="r">Zinapatikana</th></tr></thead><tbody>${P.map((p) => { const rs = reserved(p.id), av = (p.qty || 0) - rs; return `<tr class="click" onclick="PK.pack.prodForm('${p.id}')"><td><b>${esc(p.name)}</b><br><small class="mu">${esc(p.unit)}${p.pack ? " × " + p.pack : ""}</small></td><td class="r num">${n0(p.price)}</td><td class="r num">${n0(p.qty)}</td><td class="r num">${n0(rs)}</td><td class="r"><span class="pill ${av <= 0 ? "bd" : av <= (p.min || 0) ? "wn" : "ok"}">${n0(av)}</span></td></tr>`; }).join("")}</tbody></table></div>` : empty("Ongeza bidhaa unazosambaza.")}`;
  }

  /* ---------- RIPOTI ---------- */
  function pageRipoti() {
    const O = txList("ord", (o) => inRange(o.day) && o.status === "imefikishwa"), P = txList("pay", (p) => inRange(p.day)), L = O.flatMap((o) => o.items);
    const sales = O.reduce((a, o) => a + o.total, 0), coll = P.reduce((a, p) => a + p.amount, 0), profit = L.reduce((a, l) => a + l.qty * (l.price - (l.cost || 0)), 0);
    const tb = (rows) => `<table class="t"><tbody>${rows.map((x) => `<tr><td>${esc(x.key)}</td><td class="r">${x.count}</td><td class="r num">${n0(x.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>`;
    return `<div class="row between">${rangeChips()}<button class="btn s" onclick="downloadCSV('mauzo-jumla-'+PK.range,[['Tarehe','Oda','Duka','Njia','Muuzaji','Jumla']].concat(txList('ord',o=>inRange(o.day)&&o.status==='imefikishwa').map(o=>[o.day,o.no,o.custName,(get(o.route)||{}).name||'',o.rep,o.total])))">⬇️ CSV</button></div>
      <div class="kpis">${kpi("Mauzo (yaliyofikishwa)", tzs(sales), true)}${kpi("Makusanyo", tzs(coll))}${kpi("Faida ghafi", tzs(profit))}${kpi("Madeni yote sasa", tzs(custs().reduce((a, c) => a + Math.max(0, bal(c)), 0)))}${kpi("Oda zilizofikishwa", n0(O.length))}</div>
      <div class="card"><h3>Mauzo vs makusanyo (siku 14)</h3>${bars(dailySeries(txList("ord", (o) => o.status === "imefikishwa"), 14, (o) => o.total))}<p class="mu xs" style="margin:0">Makusanyo siku 14: ${tzs(txList("pay", (p) => p.day >= addDays(today(), -13)).reduce((a, p) => a + p.amount, 0))}</p></div>
      <div class="grid2"><div class="card"><h3>Maduka makubwa</h3>${tb(groupSum(O, (o) => o.custName, (o) => o.total).slice(0, 10))}<h3>Kwa njia</h3>${tb(groupSum(O, (o) => (get(o.route) || {}).name || "—", (o) => o.total))}</div>
        <div class="card"><h3>Bidhaa zinazotoka</h3>${tb(groupSum(L, (l) => l.name, (l) => l.qty * l.price).slice(0, 10))}<h3>Kwa muuzaji</h3>${tb(groupSum(O, (o) => o.rep, (o) => o.total))}<h3>Makusanyo kwa njia</h3>${tb(groupSum(P, (p) => methodName(p.method), (p) => p.amount))}</div></div>`;
  }

  registerPack({
    id: "msambazaji", name: "Msambazaji", theme: "bahari", home: "oda",
    money: (inR) => { const O = txList("ord", (o) => inR(o.day) && o.status === "imefikishwa"); return { rev: O.reduce((a, o) => a + o.total, 0), cost: O.reduce((a, o) => a + o.items.reduce((b, l) => b + l.qty * (l.cost || 0), 0), 0) }; },
    roles: [["meneja", "Meneja"], ["mauzo", "Muuzaji (rep)"], ["stoo", "Stoo"], ["dereva", "Dereva"], ["mhasibu", "Mhasibu"]],
    pages: [
      { id: "oda", label: "Oda", icon: "📝", roles: ["meneja", "mauzo", "stoo", "dereva"], render: pageOda, actions: () => roleOk(["meneja", "mauzo"]) ? `<button class="btn p s" onclick="PK.pack.orderForm()">＋ Oda</button>` : "" },
      { id: "maduka", label: "Maduka", icon: "🏪", roles: ["meneja", "mauzo", "mhasibu", "dereva"], render: pageMaduka, actions: () => roleOk(["meneja", "mauzo"]) ? `<button class="btn p s" onclick="PK.pack.custForm()">＋ Duka</button>` : "" },
      { id: "njia", label: "Njia", icon: "🛣️", roles: ["meneja", "mauzo", "dereva"], render: pageNjia, actions: () => roleOk(["meneja"]) ? `<button class="btn p s" onclick="PK.pack.routeForm()">＋ Njia</button>` : "" },
      { id: "ankara", label: "Ankara", icon: "🧾", roles: ["meneja", "mhasibu", "dereva"], render: pageAnkara, badge: () => invs(overdue).length || "" },
      { id: "bidhaa", label: "Stoo", icon: "📦", roles: ["meneja", "stoo", "mauzo"], render: pageBidhaa, actions: () => roleOk(["meneja", "stoo"]) ? `<button class="btn p s" onclick="PK.pack.prodForm()">＋ Bidhaa</button>` : "" },
      { id: "ripoti", label: "Ripoti", icon: "📊", roles: ["meneja", "mhasibu"], render: pageRipoti },
    ],
    settings: [{ key: "terms", label: "Muda wa kulipa ankara (siku)", type: "number", def: 14 }, { key: "defLimit", label: "Kikomo cha mkopo cha kawaida (TSh)", type: "number", def: 500000 }],
    orderForm, drawOrder, odAdd, odSave, move, deliverForm, deliver, custForm, custSave, custView, payForm, collect, printInv, routeForm, routeSave, routeSheet, prodForm, prodSave,
  });
})();
