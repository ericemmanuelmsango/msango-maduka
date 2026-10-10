/* =====================================================================
   PAKITI: MGAHAWA & BAR  · mgahawa.js v1
   Ramani ya meza, oda kwa meza/take-away, skrini ya jikoni na bar,
   menyu, bili (kugawanya), ripoti.
   Oda: cfg t:'ord' → items[] (mistari iliyotumwa), st{lid:hali}, voids{lid}, payments[]
   ===================================================================== */
(function () {
  const MG = { cur: null, draft: [], cat: "", station: "jikoni", area: "", q: "", seen: {} };
  PK.mg = MG;
  const items = () => list("item").sort((a, b) => (a.cat || "").localeCompare(b.cat || "") || a.name.localeCompare(b.name));
  const tables = () => list("tbl").sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
  const orders = (pred) => list("ord", pred);
  const cats = () => [...new Set(items().map((i) => i.cat).filter(Boolean))];
  const live = (o) => (o.items || []).filter((l) => !(o.voids || {})[l.lid]);
  const lineSt = (o, l) => (o.st || {})[l.lid] || "new";
  const svcPct = () => Number(S("service", 0)) || 0;
  const bill = (o) => { const sub = live(o).reduce((s, l) => s + l.qty * l.price, 0), svc = Math.round((sub * svcPct()) / 100), disc = Number(o.discount) || 0, total = sub + svc - disc, paid = (o.payments || []).reduce((s, p) => s + p.amt, 0); return { sub, svc, disc, total, paid, bal: total - paid }; };
  const tableOrder = (tid) => orders((o) => o.table === tid)[0];
  const mins = (ms) => Math.max(0, Math.round((Date.now() - ms) / 60000));
  const TYPES = { meza: "Meza", take: "Take-away", del: "Delivery" };

  /* ---------- MEZA ---------- */
  function pageMeza() {
    const T = tables(), areas = [...new Set(T.map((t) => t.area || ""))].filter(Boolean);
    const open = orders(), busy = T.filter((t) => tableOrder(t.id)).length, sales = txList("ord", (o) => o.day === today()).reduce((s, o) => s + (o.total || 0), 0) + 0;
    const ready = open.reduce((s, o) => s + live(o).filter((l) => lineSt(o, l) === "ready").length, 0);
    const others = open.filter((o) => !o.table);
    if (!T.length && !items().length) return `<div class="card" style="max-width:620px"><h3>Karibu! Tuanze</h3><p class="mu sm" style="margin:0">1) Weka menyu (vyakula na vinywaji, bei, na vinaandaliwa wapi — jikoni au bar). 2) Ongeza meza zako. Kisha wahudumu wataanza kuchukua oda.</p>
      <div class="row"><button class="btn p" onclick="go('menyu')">🍽️ Weka menyu</button><button class="btn" onclick="PK.pack.tablesForm()">🪑 Ongeza meza</button></div></div>`;
    return `<div class="kpis">${kpi("Meza zenye wateja", busy + " / " + T.length, true)}${kpi("Oda wazi", n0(open.length))}${kpi("Tayari kupelekwa", n0(ready), ready > 0)}${kpi("Mauzo leo", tzs(sales))}</div>
      <div class="row between">${areas.length ? `<div class="chips"><button class="chip ${!MG.area ? "on" : ""}" onclick="PK.mg.area='';render()">Zote</button>${areas.map((a) => `<button class="chip ${MG.area === a ? "on" : ""}" onclick="PK.mg.area='${esc(a)}';render()">${esc(a)}</button>`).join("")}</div>` : "<span></span>"}
        <div class="row"><button class="btn" onclick="PK.pack.newOrder('take')">🥡 Take-away</button><button class="btn" onclick="PK.pack.newOrder('del')">🛵 Delivery</button></div></div>
      <div class="tiles">${T.filter((t) => !MG.area || t.area === MG.area).map((t) => { const o = tableOrder(t.id);
        if (!o) return `<button class="tile ok" onclick="PK.pack.newOrder('meza','${t.id}')"><small>${esc(t.area || "Meza")} · viti ${t.seats || "—"}</small><b>${esc(t.name)}</b><small>Wazi</small></button>`;
        const b = bill(o), L = live(o), rd = L.filter((l) => lineSt(o, l) === "ready").length, cook = L.filter((l) => ["new", "cooking"].includes(lineSt(o, l))).length;
        const cls = o.billReq ? "bd" : rd ? "wn" : "ac";
        return `<button class="tile ${cls}" onclick="PK.pack.openOrder('${o.id}')"><small>${esc(o.waiter)} · ${mins(o.openAt)} dk</small><b>${esc(t.name)}</b>
          <small class="num" style="color:var(--ink);font-weight:700">${n0(b.total)}</small><small>${o.billReq ? "🧾 wanataka bili" : rd ? "🔔 " + rd + " tayari" : cook ? "🍳 " + cook + " jikoni" : "✓ wamehudumiwa"}</small></button>`; }).join("")}</div>
      ${others.length ? `<h4>Take-away & Delivery</h4><div class="tiles">${others.map((o) => { const b = bill(o), rd = live(o).filter((l) => lineSt(o, l) === "ready").length; return `<button class="tile ${rd ? "wn" : "in"}" onclick="PK.pack.openOrder('${o.id}')"><small>${TYPES[o.type]} · #${o.no}</small><b style="font-size:16px">${esc(o.customer || "Mteja")}</b><small class="num">${n0(b.total)}${rd ? " · 🔔 tayari" : ""}</small></button>`; }).join("")}</div>` : ""}`;
  }
  function tablesForm() {
    modal(`${mhead("Meza")}<p class="mu sm" style="margin:0">Ongeza meza kwa mfululizo (mf. 1 hadi 12) au moja moja (mf. VIP 1). Eneo ni hiari: Ndani, Nje, Bar, Rooftop…</p>
      <div class="form"><label class="l">Kuanzia<input id="tb-a" class="f" placeholder="1"></label><label class="l">Hadi<input id="tb-b" class="f" placeholder="12"></label><label class="l">Eneo<input id="tb-ar" class="f" placeholder="Ndani"></label><label class="l">Viti<input id="tb-s" class="f" inputmode="numeric" value="4"></label></div>
      <button class="btn p" onclick="PK.pack.addTables()">＋ Ongeza</button>
      ${tables().length ? `<div class="chips">${tables().map((t) => `<button class="chip" onclick="${tableOrder(t.id) ? "toast('Meza ina oda wazi')" : `confirmBox('Futa meza ${esc(t.name)}?',()=>{delDoc('${t.id}');PK.pack.tablesForm()},'Futa')`}">${esc(t.name)}${t.area ? " · " + esc(t.area) : ""} ✕</button>`).join("")}</div>` : ""}`);
  }
  function addTables() {
    const a = val("tb-a"), b = val("tb-b") || a; if (!a) return toast("Andika jina/namba ya meza");
    const names = /^\d+$/.test(a) && /^\d+$/.test(b) && +b >= +a && +b - +a < 100 ? Array.from({ length: +b - +a + 1 }, (_, i) => String(+a + i)) : [a];
    const have = new Set(tables().map((t) => String(t.name)));
    names.filter((n) => !have.has(n)).forEach((n) => save({ id: newId("tbl"), t: "tbl", name: n, area: val("tb-ar"), seats: num(val("tb-s")) || 4 }));
    tablesForm();
  }

  /* ---------- ODA ---------- */
  async function newOrder(type, tid) {
    if (tid && tableOrder(tid)) return openOrder(tableOrder(tid).id);
    let customer = "", phone = "", addr = "";
    if (type !== "meza") { PK._no = { type }; return modal(`${mhead(TYPES[type])}<div class="form"><label class="l">Jina la mteja<input id="no-c" class="f"></label><label class="l">Simu<input id="no-p" class="f" inputmode="tel"></label>${type === "del" ? `<label class="l" style="grid-column:1/-1">Anwani<input id="no-a" class="f"></label>` : ""}</div><button class="btn p" onclick="PK.pack.newOrder2()">Anza oda</button>`); }
    create(type, tid, customer, phone, addr);
  }
  function newOrder2() { const t = PK._no.type; create(t, "", val("no-c"), val("no-p"), val("no-a")); closeModal(); }
  async function create(type, tid, customer, phone, addr) {
    const id = newId("ord");
    save({ id, t: "ord", no: "…", type, table: tid || "", customer, phone, addr, waiter: PK.user.name, wid: PK.user.id, openAt: Date.now(), items: [], st: {}, voids: {}, payments: [] });
    MG.cur = id; MG.draft = []; go("oda");
    const no = await nextNo("ord"); if (get(id)) setField(id, "no", no);
  }
  function openOrder(id) { MG.cur = id; MG.draft = []; closeModal(); go("oda"); }
  function addDraft(itemId) {
    const it = get(itemId); if (!it || it.avail === false) return;
    const d = MG.draft.find((x) => x.item === itemId && !x.note); if (d) d.qty++; else MG.draft.push({ item: itemId, name: it.name, price: Number(it.price) || 0, qty: 1, note: "", station: it.station || "jikoni" });
    render();
  }
  function draftQty(i, d) { const x = MG.draft[i]; x.qty += d; if (x.qty <= 0) MG.draft.splice(i, 1); render(); }
  function draftNote(i) { const x = MG.draft[i]; modal(`${mhead(x.name)}<label class="l">Maelekezo kwa jikoni<input id="dn" class="f" value="${esc(x.note)}" placeholder="mf. bila pilipili, nusu kuku, barafu nyingi"></label><div class="chips">${["Bila pilipili", "Pilipili nyingi", "Iive sana", "Take-away", "Baridi", "Bila barafu"].map((c) => `<button class="chip" onclick="const e=document.getElementById('dn');e.value=(e.value?e.value+', ':'')+'${c}'">${c}</button>`).join("")}</div><button class="btn p" onclick="PK.mg.draft[${i}].note=val('dn');closeModal()">Sawa</button>`); }
  function send() {
    const o = get(MG.cur); if (!o || !MG.draft.length) return;
    const now = Date.now(), lines = MG.draft.map((d) => ({ lid: uid(), ...d, at: now, by: PK.user.name }));
    pushTo(o.id, "items", lines); MG.draft = [];
    if (o.billReq) setField(o.id, "billReq", false);
    toast("✅ Imetumwa: " + lines.map((l) => l.qty + "× " + l.name).join(", "));
    if (!S("stayOnSend", false)) setTimeout(() => go(o.table ? "meza" : "meza"), 400);
  }
  function pageOda() {
    const o = MG.cur && get(MG.cur);
    if (!o) { const O = orders().sort((a, b) => b.openAt - a.openAt);
      return O.length ? `<div class="tw"><table class="t"><thead><tr><th>#</th><th>Meza / Mteja</th><th>Mhudumu</th><th>Muda</th><th class="r">Jumla</th></tr></thead><tbody>${O.map((x) => `<tr class="click" onclick="PK.pack.openOrder('${x.id}')"><td class="num">${x.no}</td><td><b>${x.table ? "Meza " + esc((get(x.table) || {}).name) : TYPES[x.type] + " · " + esc(x.customer || "")}</b></td><td>${esc(x.waiter)}</td><td>${mins(x.openAt)} dk</td><td class="r num">${n0(bill(x).total)}</td></tr>`).join("")}</tbody></table></div>` : empty("Hakuna oda wazi. Chagua meza kwenye ukurasa wa Meza.", `<button class="btn p" onclick="go('meza')">🪑 Meza</button>`); }
    const I = items(), C = cats(), q = MG.q, b = bill(o), L = live(o);
    const shown = I.filter((i) => (q ? match(i.name + " " + (i.cat || ""), q) : !MG.cat || i.cat === MG.cat));
    const dTot = MG.draft.reduce((s, d) => s + d.qty * d.price, 0);
    const stp = { new: ["in", "imetumwa"], cooking: ["wn", "inaandaliwa"], ready: ["ok", "tayari"], served: ["", "imefika"] };
    return `<div class="split"><div style="display:grid;gap:10px;min-width:0">
      <div class="row"><input id="mg-q" class="f" placeholder="Tafuta kwenye menyu…" value="${esc(q)}" oninput="PK.mg.q=this.value;soft()" style="flex:1"></div>
      ${C.length && !q ? `<div class="chips"><button class="chip ${!MG.cat ? "on" : ""}" onclick="PK.mg.cat='';render()">Zote</button>${C.map((c) => `<button class="chip ${MG.cat === c ? "on" : ""}" onclick="PK.mg.cat='${esc(c)}';render()">${esc(c)}</button>`).join("")}</div>` : ""}
      ${I.length ? `<div class="prods">${shown.map((i) => `<button class="prod ${i.avail === false ? "out" : ""}" onclick="PK.pack.addDraft('${i.id}')" ${i.avail === false ? 'title="Imeisha"' : ""}><b>${esc(i.name)}</b><span>${n0(i.price)}</span><small>${i.avail === false ? "❌ imeisha" : i.station === "bar" ? "🍹 bar" : "🍳 jikoni"}</small></button>`).join("")}</div>` : empty("Menyu iko tupu.", roleOk(["meneja"]) ? `<button class="btn p" onclick="go('menyu')">Weka menyu</button>` : "")}
    </div>
    <div class="card sticky"><div class="row between"><h3>${o.table ? "Meza " + esc((get(o.table) || {}).name) : TYPES[o.type] + (o.customer ? " · " + esc(o.customer) : "")}</h3><span class="mu xs">#${o.no} · ${esc(o.waiter)}</span></div>
      ${L.length ? `<div class="cart">${L.map((l) => { const s = stp[lineSt(o, l)]; return `<div class="cline"><span>${l.qty}× ${esc(l.name)}${l.note ? `<br><small class="mu">📝 ${esc(l.note)}</small>` : ""}</span><span style="text-align:right"><span class="num">${n0(l.qty * l.price)}</span><br>${lineSt(o, l) === "ready" ? `<button class="btn s p" onclick="setField('${o.id}','st.${l.lid}','served')">🔔 Peleka</button>` : `<span class="pill ${s[0]}">${s[1]}</span>`}</span></div>`; }).join("")}</div>` : ""}
      ${MG.draft.length ? `<div class="xs mu" style="letter-spacing:.1em;text-transform:uppercase">Mpya — bado haijatumwa</div><div class="cart">${MG.draft.map((d, i) => `<div class="cline" style="background:color-mix(in srgb,var(--ac) 7%,transparent);padding-inline:6px;border-radius:8px"><button class="btn g" style="justify-content:flex-start;padding:0;color:var(--ink);font-weight:600;white-space:normal;text-align:left" onclick="PK.pack.draftNote(${i})">${esc(d.name)}${d.note ? `<br><small class="mu">📝 ${esc(d.note)}</small>` : `<small class="mu">&nbsp;＋ maelekezo</small>`}</button><div style="text-align:right"><b class="num">${n0(d.qty * d.price)}</b><div class="q"><button onclick="PK.pack.draftQty(${i},-1)">−</button><span class="num" style="min-width:20px;text-align:center">${d.qty}</span><button onclick="PK.pack.draftQty(${i},1)">＋</button></div></div></div>`).join("")}</div>
        <button class="btn p big" onclick="PK.pack.send()">🔥 Tuma jikoni/bar · ${n0(dTot)}</button>` : ""}
      <div class="total"><span>Jumla</span><span class="num">${n0(b.total + dTot)}</span></div>${b.paid ? `<div class="row between sm"><span>Imelipwa</span><b class="num">${n0(b.paid)}</b></div>` : ""}
      ${MG.draft.length ? `<div class="mbar"><span>${MG.draft.reduce((s, d) => s + d.qty, 0)} vipya · <span class="num">${n0(dTot)}</span></span><button class="btn p" onclick="PK.pack.send()">🔥 Tuma</button></div>` : ""}
      <div class="row"><button class="btn" onclick="PK.pack.billView('${o.id}')" ${L.length ? "" : "disabled"}>🧾 Bili / Lipa</button><button class="btn" onclick="PK.pack.moreOrder('${o.id}')">⋯</button><button class="btn g" onclick="PK.mg.cur=null;go('meza')">← Meza</button></div>
    </div></div>`;
  }
  function moreOrder(id) {
    const o = get(id), L = live(o), isM = roleOk(["meneja"]);
    modal(`${mhead("Oda #" + o.no)}<div style="display:grid;gap:6px">
      ${o.table ? `<label class="l">Hamisha kwenda meza<select id="mo-t" class="f">${opt([["", "—"]].concat(tables().filter((t) => !tableOrder(t.id)).map((t) => [t.id, t.name])))}</select></label><button class="btn" onclick="const t=val('mo-t');if(t){patch('${id}',{table:t});closeModal()}">🔁 Hamisha</button>` : ""}
      <button class="btn" onclick="setField('${id}','billReq',true);closeModal();toast('Imeandikwa: wanataka bili')">🧾 Wanataka bili</button>
      ${isM ? `<h4>Futa kipengele (void) — meneja</h4>${L.map((l) => `<div class="row between sm"><span>${l.qty}× ${esc(l.name)}</span><button class="btn s d" onclick="PK.pack.voidLine('${id}','${l.lid}')">Void</button></div>`).join("") || `<p class="mu sm">—</p>`}
        ${!L.length && !(o.payments || []).length ? `<button class="btn d" onclick="delDoc('${id}');PK.mg.cur=null;closeModal();go('meza')">🗑️ Futa oda tupu</button>` : ""}` : `<p class="mu sm" style="margin:0">Kuondoa kitu kilichotumwa jikoni kunahitaji meneja.</p>`}</div>`);
  }
  function voidLine(id, lid) { modal(`${mhead("Sababu ya void")}<input id="vd" class="f" placeholder="mf. mteja amebadilisha, kimeungua"><button class="btn d" onclick="setField('${id}','voids.${lid}',{why:val('vd')||'—',by:PK.user.name,at:Date.now()});closeModal()">Void</button>`); }

  /* ---------- BILI ---------- */
  function billView(id) {
    const o = get(id), b = bill(o), L = live(o); PK._bl = { id, sel: {}, method: "cash" };
    const draw = () => {
      const sel = PK._bl.sel, selSum = L.filter((l) => sel[l.lid]).reduce((s, l) => s + l.qty * l.price, 0);
      modal(`${mhead("Bili · " + (o.table ? "Meza " + (get(o.table) || {}).name : o.customer || TYPES[o.type]))}
        <div class="tw"><table class="t"><tbody>${L.map((l) => `<tr><td><label class="row sm"><input type="checkbox" ${sel[l.lid] ? "checked" : ""} onchange="PK._bl.sel['${l.lid}']=this.checked;PK._bl.draw()"> ${l.qty}× ${esc(l.name)}</label></td><td class="r num">${n0(l.qty * l.price)}</td></tr>`).join("")}
          ${b.svc ? `<tr><td>Huduma ${svcPct()}%</td><td class="r num">${n0(b.svc)}</td></tr>` : ""}${b.disc ? `<tr><td>Punguzo</td><td class="r num">−${n0(b.disc)}</td></tr>` : ""}
          <tr><td><b>Jumla</b></td><td class="r num"><b>${n0(b.total)}</b></td></tr>${(o.payments || []).map((p) => `<tr><td class="mu">Imelipwa · ${esc(methodName(p.method))}</td><td class="r num">−${n0(p.amt)}</td></tr>`).join("")}
          <tr><td><b>Salio</b></td><td class="r num"><b>${n0(b.bal)}</b></td></tr></tbody></table></div>
        <div class="chips"><span class="mu sm">Gawanya:</span>${[2, 3, 4, 5].map((n) => `<button class="chip" onclick="document.getElementById('bl-a').value=Math.ceil(${b.bal}/${n})">÷${n}</button>`).join("")}${selSum ? `<button class="chip on" onclick="document.getElementById('bl-a').value=${selSum}">Vilivyochaguliwa ${n0(selSum)}</button>` : ""}</div>
        <div class="chips">${METHODS.filter((m) => m[0] !== "credit").map((m) => `<button class="chip ${PK._bl.method === m[0] ? "on" : ""}" onclick="PK._bl.method='${m[0]}';PK._bl.draw()">${m[1]}</button>`).join("")}</div>
        <div class="form"><label class="l">Kiasi cha kulipa sasa<input id="bl-a" class="f" inputmode="numeric" value="${selSum || b.bal}"></label>${PK._bl.method === "cash" ? `<label class="l">Pesa aliyotoa<input id="bl-g" class="f" inputmode="numeric" placeholder="kwa chenji"></label>` : `<label class="l">Namba ya muamala<input id="bl-r" class="f"></label>`}
          ${roleOk(["meneja"]) ? `<label class="l">Punguzo (meneja)<input id="bl-d" class="f" inputmode="numeric" value="${b.disc || ""}" onchange="setField('${id}','discount',num(this.value));setTimeout(()=>PK.pack.billView('${id}'),50)"></label>` : ""}</div>
        <div class="row"><button class="btn" onclick="PK.pack.preBill('${id}')">🖨️ Bili ya awali</button><button class="btn p big" style="flex:1" onclick="PK.pack.payOrder('${id}')">💵 Pokea malipo</button></div>`);
    };
    PK._bl.draw = draw; draw();
  }
  function preBill(id) { const o = get(id), b = bill(o); receipt({ title: "BILI", no: o.no, items: live(o).map((l) => ({ name: l.name, qty: l.qty, price: l.price })).concat(b.svc ? [{ name: "Huduma " + svcPct() + "%", qty: 1, price: b.svc }] : []), discount: b.disc, total: b.total, customer: o.customer, phone: o.phone, notes: o.table ? ["Meza " + (get(o.table) || {}).name] : [] }); }
  function payOrder(id) {
    const o = get(id), b = bill(o), amt = Math.min(num(val("bl-a")), b.bal), m = PK._bl.method, got = num(val("bl-g"));
    if (!amt || amt <= 0) return toast("Andika kiasi");
    if (m === "cash" && got && got < amt) return toast("Pesa aliyotoa haitoshi");
    const p = { amt, method: m, ref: val("bl-r") || "", by: PK.user.name, at: Date.now() };
    const pays = (o.payments || []).concat([p]), bal = b.bal - amt;
    if (bal <= 0) {
      archive(id, { payments: pays, total: b.total, sub: b.sub, svc: b.svc, closedBy: PK.user.name, tableName: o.table ? (get(o.table) || {}).name : "" });
      MG.cur = null; closeModal(); go("meza");
      receipt({ title: "RISITI", no: o.no, items: live(o).map((l) => ({ name: l.name, qty: l.qty, price: l.price })).concat(b.svc ? [{ name: "Huduma " + svcPct() + "%", qty: 1, price: b.svc }] : []), discount: b.disc, total: b.total, paid: pays.reduce((s, x) => s + x.amt, 0), method: [...new Set(pays.map((x) => methodName(x.method)))].join(" + "), change: m === "cash" && got ? got - amt : 0, customer: o.customer, phone: o.phone });
    } else { pushTo(id, "payments", [p]); toast(`✅ ${tzs(amt)} imepokelewa · salio ${tzs(bal)}${m === "cash" && got ? " · chenji " + tzs(got - amt) : ""}`); setTimeout(() => billView(id), 60); }
  }

  /* ---------- JIKONI / BAR ---------- */
  function pageJikoni() {
    const late = Number(S("lateMin", 15)) || 15, st = MG.station;
    const tickets = orders().map((o) => ({ o, L: live(o).filter((l) => (l.station || "jikoni") === st && ["new", "cooking", "ready"].includes(lineSt(o, l))) })).filter((x) => x.L.length);
    const col = (s, title) => { const T = tickets.map((x) => ({ ...x, L: x.L.filter((l) => lineSt(x.o, l) === s) })).filter((x) => x.L.length).sort((a, b) => a.L[0].at - b.L[0].at);
      return `<div class="col"><h4><span>${title}</span><span class="pill">${T.reduce((n, x) => n + x.L.length, 0)}</span></h4>${T.map(({ o, L }) => { const m = mins(Math.min(...L.map((l) => l.at)));
        return `<div class="tk ${m >= late && s !== "ready" ? "late" : ""}"><div class="row between"><b>${o.table ? "Meza " + esc((get(o.table) || {}).name) : TYPES[o.type] + " #" + o.no}</b><span class="xs ${m >= late && s !== "ready" ? "err" : "mu"}">${m} dk · ${esc(o.waiter)}</span></div>
          ${L.map((l) => `<div class="row between"><span><b style="font-size:16px">${l.qty}×</b> ${esc(l.name)}${l.note ? `<br><small style="color:var(--bd);font-weight:700">📝 ${esc(l.note)}</small>` : ""}</span>${s === "new" ? `<button class="btn s" onclick="setField('${o.id}','st.${l.lid}','cooking')">Anza</button>` : s === "cooking" ? `<button class="btn s p" onclick="setField('${o.id}','st.${l.lid}','ready')">Tayari ✓</button>` : `<span class="pill ok">inasubiri</span>`}</div>`).join("")}
          ${s !== "ready" && L.length > 1 ? `<button class="btn s" onclick="${L.map((l) => `setField('${o.id}','st.${l.lid}','${s === "new" ? "cooking" : "ready"}');`).join("")}">${s === "new" ? "Anza zote" : "Zote tayari"}</button>` : ""}</div>`; }).join("") || `<p class="mu sm" style="margin:0">—</p>`}</div>`; };
    return `<div class="row between"><div class="chips"><button class="chip ${st === "jikoni" ? "on" : ""}" onclick="PK.mg.station='jikoni';render()">🍳 Jikoni</button><button class="chip ${st === "bar" ? "on" : ""}" onclick="PK.mg.station='bar';render()">🍹 Bar</button></div><span class="mu xs">Inajisasisha yenyewe · sauti oda mpya ikifika</span></div>
      <div class="kan">${col("new", "Mpya")}${col("cooking", "Zinaandaliwa")}${col("ready", "Tayari — mhudumu achukue")}</div>`;
  }
  function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(0.2, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.5); o.start(); o.stop(a.currentTime + 0.5); } catch (e) {} }
  function onData() {
    const ids = {}; orders().forEach((o) => live(o).forEach((l) => (ids[l.lid] = l.station || "jikoni")));
    const fresh = Object.keys(ids).filter((k) => !MG.seen[k]);
    if (MG.primed && PK.page === "jikoni" && fresh.some((k) => ids[k] === MG.station)) beep();
    fresh.forEach((k) => (MG.seen[k] = 1)); MG.primed = true;
  }
  setInterval(() => { if (PK.user && ["jikoni", "meza"].includes(PK.page) && !PK.modalHtml) render(); }, 30000);

  /* ---------- MENYU ---------- */
  function itemForm(id) {
    const i = id ? get(id) : { name: "", cat: "", price: "", cost: "", station: "jikoni", avail: true };
    modal(`${mhead(id ? "Badilisha" : "Kipengele kipya cha menyu")}<div class="form">
      <label class="l" style="grid-column:1/-1">Jina<input id="it-n" class="f" value="${esc(i.name)}" placeholder="mf. Pilau nyama"></label>
      <label class="l">Kundi<input id="it-c" class="f" list="it-cl" value="${esc(i.cat || "")}" placeholder="mf. Vyakula, Vinywaji, Bia"><datalist id="it-cl">${cats().concat(["Vyakula", "Vitafunwa", "Vinywaji baridi", "Bia", "Pombe kali", "Chai & Kahawa"]).filter((v, k, a) => a.indexOf(v) === k).map((c) => `<option value="${esc(c)}">`).join("")}</datalist></label>
      <label class="l">Bei<input id="it-p" class="f" inputmode="numeric" value="${esc(i.price)}"></label><label class="l">Gharama (si lazima)<input id="it-k" class="f" inputmode="numeric" value="${esc(i.cost || "")}"></label>
      <label class="l">Kinaandaliwa<select id="it-s" class="f">${opt([["jikoni", "🍳 Jikoni"], ["bar", "🍹 Bar"]], i.station)}</select></label></div>
      <div class="row between">${id ? `<button class="btn d" onclick="delDoc('${id}');closeModal()">Futa</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.itemSave('${id || ""}')">Hifadhi</button></div>`);
  }
  function itemSave(id) { const d = { name: val("it-n"), cat: val("it-c"), price: num(val("it-p")), cost: num(val("it-k")), station: val("it-s") }; if (!d.name || !d.price) return toast("Andika jina na bei"); if (id) patch(id, d); else save({ id: newId("item"), t: "item", avail: true, ...d }); closeModal(); }
  function pageMenyu() {
    const I = items().filter((i) => match(i.name + " " + (i.cat || ""), PK.q)), C = [...new Set(I.map((i) => i.cat || "Mengineyo"))];
    return `<div class="row between">${searchBox("Tafuta kwenye menyu…")}<span class="mu sm">Bonyeza "Ipo/Imeisha" kuzima kipengele kwa muda — wahudumu wataona papo hapo.</span></div>
      ${I.length ? C.map((c) => `<div class="card"><h3>${esc(c)}</h3><table class="t"><tbody>${I.filter((i) => (i.cat || "Mengineyo") === c).map((i) => `<tr><td><b>${esc(i.name)}</b> <small class="mu">${i.station === "bar" ? "🍹" : "🍳"}</small></td><td class="r num">${n0(i.price)}</td>
        <td class="r" style="white-space:nowrap"><button class="btn s ${i.avail === false ? "d" : ""}" onclick="patch('${i.id}',{avail:${i.avail === false}})">${i.avail === false ? "❌ Imeisha" : "✅ Ipo"}</button> <button class="btn s" onclick="PK.pack.itemForm('${i.id}')">✎</button></td></tr>`).join("")}</tbody></table></div>`).join("") : empty("Ongeza vyakula na vinywaji vyako.")}`;
  }

  /* ---------- RIPOTI ---------- */
  function pageRipoti() {
    const R = txList("ord", (o) => inRange(o.day)), total = R.reduce((s, o) => s + (o.total || 0), 0), L = R.flatMap((o) => live(o));
    const cost = L.reduce((s, l) => s + l.qty * ((get(l.item) || {}).cost || 0), 0);
    const byItem = groupSum(L, (l) => l.name, (l) => l.qty * l.price).slice(0, 12), byW = groupSum(R, (o) => o.waiter, (o) => o.total || 0), byCat = groupSum(L, (l) => (get(l.item) || {}).cat || "—", (l) => l.qty * l.price);
    const pays = R.flatMap((o) => o.payments || []), voids = R.reduce((n, o) => n + Object.keys(o.voids || {}).length, 0);
    const turn = R.filter((o) => o.closedAt && o.openAt).map((o) => (o.closedAt - o.openAt) / 60000);
    return `<div class="row between">${rangeChips()}<button class="btn s" onclick="downloadCSV('oda-'+PK.range,[['Tarehe','#','Meza','Mhudumu','Jumla']].concat(txList('ord',o=>inRange(o.day)).map(o=>[o.day,o.no,o.tableName||o.type,o.waiter,o.total])))">⬇️ CSV</button></div>
      <div class="kpis">${kpi("Mauzo", tzs(total), true)}${kpi("Oda", n0(R.length))}${kpi("Wastani wa bili", tzs(R.length ? total / R.length : 0))}${cost ? kpi("Faida ghafi", tzs(total - cost)) : ""}${kpi("Muda wastani mezani", (turn.length ? Math.round(turn.reduce((a, b) => a + b, 0) / turn.length) : 0) + " dk")}${kpi("Voids", n0(voids))}</div>
      <div class="card"><h3>Mauzo kwa siku (siku 14)</h3>${bars(dailySeries(txList("ord"), 14, (o) => o.total || 0))}</div>
      <div class="grid2"><div class="card"><h3>Vinavyopendwa zaidi</h3><table class="t"><tbody>${byItem.map((x) => `<tr><td>${esc(x.key)}</td><td class="r">${x.count}</td><td class="r num">${n0(x.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div>
        <div class="card"><h3>Kwa mhudumu</h3><table class="t"><tbody>${byW.map((x) => `<tr><td>${esc(x.key)}</td><td class="r">${x.count} oda</td><td class="r num">${n0(x.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>
          <h3>Kwa kundi</h3><table class="t"><tbody>${byCat.map((x) => `<tr><td>${esc(x.key)}</td><td class="r num">${n0(x.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>
          <h3>Njia za malipo</h3><table class="t"><tbody>${groupSum(pays, (p) => methodName(p.method), (p) => p.amt).map((x) => `<tr><td>${esc(x.key)}</td><td class="r num">${n0(x.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div></div>`;
  }

  registerPack({
    id: "mgahawa", name: "Mgahawa & Bar", theme: "kitenge", home: "meza",
    roles: [["meneja", "Meneja"], ["mhudumu", "Mhudumu"], ["jikoni", "Jikoni / Bar"], ["keshia", "Keshia"]],
    pages: [
      { id: "meza", label: "Meza", icon: "🪑", roles: ["meneja", "mhudumu", "keshia"], render: pageMeza, actions: () => roleOk(["meneja"]) ? `<button class="btn s" onclick="PK.pack.tablesForm()">🪑 Panga meza</button>` : "" },
      { id: "oda", label: "Oda", icon: "📝", roles: ["meneja", "mhudumu", "keshia"], render: pageOda, badge: () => orders().length || "" },
      { id: "jikoni", label: "Jikoni", icon: "🍳", roles: ["meneja", "jikoni"], render: pageJikoni },
      { id: "menyu", label: "Menyu", icon: "📋", roles: ["meneja", "jikoni"], render: pageMenyu, actions: () => roleOk(["meneja"]) ? `<button class="btn p s" onclick="PK.pack.itemForm()">＋ Menyu</button>` : "" },
      { id: "ripoti", label: "Ripoti", icon: "📊", roles: ["meneja"], render: pageRipoti },
    ],
    settings: [{ key: "service", label: "Gharama ya huduma (%) — 0 kama hamna", type: "number", def: 0 }, { key: "lateMin", label: "Oda ikichelewa jikoni zaidi ya (dakika)", type: "number", def: 15 }, { key: "stayOnSend", label: "Baki kwenye oda baada ya kutuma jikoni", type: "check", def: false }],
    onData, tablesForm, addTables, newOrder, newOrder2, openOrder, addDraft, draftQty, draftNote, send, moreOrder, voidLine, billView, preBill, payOrder, itemForm, itemSave,
  });
})();
