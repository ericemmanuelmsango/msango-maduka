/* =====================================================================
   PAKITI: SALUNI, SPA & UREMBO  · saluni.js v1
   Kalenda ya miadi kwa kila mhudumu, kaunta (huduma + bidhaa),
   kamisheni ya wahudumu, kumbukumbu za wateja, ripoti.
   ===================================================================== */
(function () {
  const SL = { day: null, cart: [], cli: "", apt: "", tab: "huduma", sty: "" };
  PK.sl = SL;
  const svcs = () => list("svc").sort((a, b) => (a.cat || "").localeCompare(b.cat || "") || a.name.localeCompare(b.name));
  const prods = () => list("prod").sort((a, b) => a.name.localeCompare(b.name));
  const stys = () => list("sty", (s) => s.active !== false).sort((a, b) => a.name.localeCompare(b.name));
  const clis = () => list("cli");
  const apts = (pred) => list("apt", pred);
  const day = () => SL.day || today();
  const toMin = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
  const toHM = (m) => pad2(Math.floor(m / 60)) + ":" + pad2(m % 60);
  const open = () => toMin(S("open", "08:00")), close = () => toMin(S("close", "20:00")), STEP = 30;
  const defComm = () => Number(S("comm", 30)) || 0;
  const commOf = (line) => { const sv = line.kind === "svc" ? get(line.id) : null, st = get(line.sty); const pct = sv && sv.comm !== "" && sv.comm != null && !isNaN(sv.comm) && sv.comm !== 0 ? Number(sv.comm) : st && st.comm != null && st.comm !== "" ? Number(st.comm) : defComm(); return line.kind === "svc" ? Math.round((line.price * line.qty * pct) / 100) : Math.round((line.price * line.qty * (Number(S("prodComm", 0)) || 0)) / 100); };
  const ST = { booked: ["", "Imepangwa"], arrived: ["wn", "Amefika"], inservice: ["", "Anahudumiwa"], done: ["ok", "Imekamilika"], noshow: ["bd", "Hakuja"], cancel: ["mu", "Imeghairiwa"] };
  const COLORS = ["#c2185b", "#7b1fa2", "#1565c0", "#00897b", "#ef6c00", "#6d4c41", "#455a64", "#2e7d32"];

  /* ---------- MIADI (kalenda) ---------- */
  function pageMiadi() {
    const S2 = stys(); if (!S2.length || !svcs().length) return `<div class="card" style="max-width:620px"><h3>Karibu! Tuanze</h3><p class="mu sm" style="margin:0">1) Ongeza huduma zako na bei (mf. Rasta 35,000 · saa 3). 2) Ongeza wahudumu (wasusi, wanaofanya kucha, massage…) na asilimia ya kamisheni yao. Kisha kalenda itafunguka.</p>
      <div class="row"><button class="btn p" onclick="PK.sl.tab='huduma';go('huduma')">💇 Huduma</button><button class="btn" onclick="PK.sl.tab='wahudumu';go('huduma')">👩🏾‍🎨 Wahudumu</button></div></div>`;
    const d = day(), A = apts((a) => a.day === d && a.status !== "cancel"), o = open(), c = close(), rows = Math.ceil((c - o) / STEP);
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const cols = `58px repeat(${S2.length}, minmax(130px,1fr))`;
    const income = txList("visit", (v) => v.day === d).reduce((s, v) => s + v.total, 0);
    const cells = []; for (let r = 0; r < rows; r++) S2.forEach((s, i) => cells.push(`<div style="grid-column:${i + 2};grid-row:${r + 2};border-top:1px ${r % 2 ? "dashed" : "solid"} var(--ln);border-left:1px solid var(--ln);cursor:pointer" onclick="PK.pack.aptForm('',{sty:'${s.id}',time:'${toHM(o + r * STEP)}'})" title="${esc(s.name)} ${toHM(o + r * STEP)}"></div>`));
    const times = Array.from({ length: rows }, (_, r) => `<div style="grid-column:1;grid-row:${r + 2};font-family:var(--fm);font-size:11px;color:var(--mu);padding:2px 6px;border-top:1px ${r % 2 ? "dashed" : "solid"} var(--ln)">${r % 2 ? "" : toHM(o + r * STEP)}</div>`).join("");
    const ev = A.map((a) => { const i = S2.findIndex((s) => s.id === a.sty); if (i < 0) return ""; const r0 = Math.max(0, Math.floor((toMin(a.time) - o) / STEP)), span = Math.max(1, Math.ceil((a.dur || 30) / STEP)); const st = ST[a.status] || ST.booked;
      return `<button class="ev ${st[0]}" style="grid-column:${i + 2};grid-row:${r0 + 2} / span ${span};margin:2px;z-index:2;display:flex;flex-direction:column;justify-content:flex-start;text-align:left;border-left-color:${S2[i].color || "var(--ac)"};overflow:hidden" onclick="PK.pack.aptView('${a.id}')"><b>${a.time} · ${esc(a.client)}</b><br>${esc(a.svcNames || "")}${a.status !== "booked" ? `<br><small>${st[1]}</small>` : ""}</button>`; }).join("");
    const nowLine = d === today() && nowM >= o && nowM <= c ? `<div style="grid-column:1/-1;grid-row:${Math.floor((nowM - o) / STEP) + 2};align-self:start;margin-top:${(((nowM - o) % STEP) / STEP) * 34}px;border-top:2px solid var(--bd);z-index:3;pointer-events:none"></div>` : "";
    const wd = new Date(d + "T12:00").toLocaleDateString("sw-TZ", { weekday: "long", day: "numeric", month: "long" });
    return `<div class="kpis">${kpi("Miadi " + (d === today() ? "leo" : ""), n0(A.length), true)}${kpi("Wamefika / wanahudumiwa", n0(A.filter((a) => a.status === "arrived" || a.status === "inservice").length))}${kpi("Mapato " + (d === today() ? "leo" : ""), tzs(income))}${kpi("Hawakuja", n0(A.filter((a) => a.status === "noshow").length))}</div>
      <div class="row between"><div class="row"><button class="btn s" onclick="PK.sl.day='${addDays(d, -1)}';render()">◀</button><button class="btn s" onclick="PK.sl.day=null;render()">Leo</button><button class="btn s" onclick="PK.sl.day='${addDays(d, 1)}';render()">▶</button><input type="date" class="f" style="width:auto" value="${d}" onchange="PK.sl.day=this.value;render()"></div><b style="text-transform:capitalize">${esc(wd)}</b></div>
      <div class="cal" style="min-width:0"><div style="display:grid;grid-template-columns:${cols};grid-template-rows:38px repeat(${rows},34px);min-width:${58 + S2.length * 130}px;position:relative">
        <div style="grid-column:1;grid-row:1;background:var(--sf2)"></div>${S2.map((s, i) => `<div style="grid-column:${i + 2};grid-row:1;background:var(--sf2);padding:8px;font-weight:800;font-size:13px;border-left:1px solid var(--ln);border-bottom:3px solid ${s.color || "var(--ac)"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.name)}</div>`).join("")}
        ${times}${cells.join("")}${ev}${nowLine}</div></div>
      <p class="mu xs" style="margin:0">Bonyeza nafasi tupu kuweka miadi. Bonyeza miadi kuona/kuanza huduma/kulipa.</p>`;
  }
  function aptForm(id, pre) {
    const a = id ? get(id) : { day: day(), time: "10:00", sty: "", svcs: [], client: "", phone: "", note: "", ...(pre || {}) };
    PK._af = { id, svcs: (a.svcs || []).slice() };
    const draw = () => {
      const chosen = PK._af.svcs, dur = chosen.reduce((s, x) => s + (Number((get(x) || {}).dur) || 30), 0), price = chosen.reduce((s, x) => s + (Number((get(x) || {}).price) || 0), 0);
      const el = document.getElementById("af-sum"); if (el) el.textContent = chosen.length ? `${chosen.length} huduma · dakika ${dur} · ${tzs(price)}` : "Chagua huduma";
      document.querySelectorAll("[data-svc]").forEach((b) => b.classList.toggle("on", chosen.includes(b.dataset.svc)));
    };
    PK._af.draw = draw;
    modal(`${mhead(id ? "Miadi" : "Miadi mpya")}<div class="form">
      <label class="l">Mteja<input id="af-c" class="f" list="af-cl" value="${esc(a.client)}" oninput="const c=window.list('cli').find(x=>x.name===this.value);if(c){document.getElementById('af-p').value=c.phone||''}"><datalist id="af-cl">${clis().map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist></label>
      <label class="l">Simu<input id="af-p" class="f" inputmode="tel" value="${esc(a.phone || "")}"></label>
      <label class="l">Tarehe<input id="af-d" class="f" type="date" value="${a.day}"></label><label class="l">Saa<input id="af-t" class="f" type="time" step="900" value="${a.time}"></label>
      <label class="l" style="grid-column:1/-1">Mhudumu<select id="af-s" class="f">${opt(stys().map((s) => [s.id, s.name]), a.sty)}</select></label></div>
      <div class="chips">${svcs().map((s) => `<button class="chip" data-svc="${s.id}" onclick="const x=PK._af.svcs,i=x.indexOf('${s.id}');i<0?x.push('${s.id}'):x.splice(i,1);PK._af.draw()">${esc(s.name)} · ${n0(s.price)}</button>`).join("")}</div>
      <div id="af-sum" class="sm mu"></div><label class="l">Maelezo<input id="af-n" class="f" value="${esc(a.note || "")}" placeholder="mf. analeta nywele zake"></label>
      <div class="row between">${id ? `<button class="btn d" onclick="PK.pack.aptStatus('${id}','cancel')">Ghairi miadi</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.aptSave()">Hifadhi</button></div>`, true, draw);
  }
  function aptSave() {
    const id = PK._af.id, ch = PK._af.svcs, d = { client: val("af-c"), phone: val("af-p"), day: val("af-d"), time: val("af-t"), sty: val("af-s"), note: val("af-n"), svcs: ch };
    if (!d.client) return toast("Andika jina la mteja"); if (!ch.length) return toast("Chagua angalau huduma moja"); if (!d.sty) return toast("Chagua mhudumu");
    d.dur = ch.reduce((s, x) => s + (Number((get(x) || {}).dur) || 30), 0); d.svcNames = ch.map((x) => (get(x) || {}).name).join(", ");
    const s0 = toMin(d.time), s1 = s0 + d.dur, clash = apts((a) => a.id !== id && a.sty === d.sty && a.day === d.day && !["cancel", "noshow", "done"].includes(a.status) && toMin(a.time) < s1 && s0 < toMin(a.time) + (a.dur || 30));
    if (clash.length && !PK._af.force) { PK._af.force = true; return toast("⚠️ " + (get(d.sty) || {}).name + " ana miadi na " + clash[0].client + " saa " + clash[0].time + ". Bonyeza Hifadhi tena kuruhusu."); }
    if (id) patch(id, d); else save({ id: newId("apt"), t: "apt", status: "booked", ...d, createdBy: PK.user.name });
    upsertCli(d.client, d.phone); closeModal(); toast("✅ Miadi imehifadhiwa"); SL.day = d.day;
  }
  function upsertCli(name, phone) { if (!name) return; const c = clis().find((x) => x.name.toLowerCase() === name.toLowerCase() || (phone && x.phone === phone)); if (c) { if (phone && !c.phone) patch(c.id, { phone }); return c.id; } const id = newId("cli"); save({ id, t: "cli", name, phone: phone || "", visits: 0, spent: 0, since: today() }); return id; }
  function aptView(id) {
    const a = get(id), st = get(a.sty) || {}, cl = clis().find((c) => c.name === a.client) || {}, S0 = ST[a.status] || ST.booked;
    const msg = encodeURIComponent(`Habari ${a.client}, tunakukumbusha miadi yako ${SHOP.name} tarehe ${fdate(a.day)} saa ${a.time} (${a.svcNames}) na ${st.name || ""}. Karibu sana! 💇🏾‍♀️`);
    const ph = String(a.phone || cl.phone || "").replace(/\D/g, "").replace(/^0/, "255");
    modal(`${mhead(a.client)}<p class="sm" style="margin:0"><span class="pill ${S0[0]}">${S0[1]}</span> · ${fdate(a.day)} saa <b>${a.time}</b> · ${a.dur} dk · ${esc(st.name || "")}</p>
      <p class="sm" style="margin:0">${esc(a.svcNames)}</p>${a.note ? `<p class="sm mu" style="margin:0">📝 ${esc(a.note)}</p>` : ""}${cl.notes ? `<p class="sm" style="margin:0;color:var(--bd)">⚠️ ${esc(cl.notes)}</p>` : ""}
      ${cl.visits ? `<p class="xs mu" style="margin:0">Ziara ${cl.visits} · ametumia ${tzs(cl.spent || 0)} · mwisho ${fdate(cl.last)}</p>` : ""}
      <div style="display:grid;gap:6px">
        ${a.status === "booked" ? `<button class="btn p" onclick="PK.pack.aptStatus('${id}','arrived')">✅ Amefika</button>` : ""}
        ${a.status === "arrived" ? `<button class="btn p" onclick="PK.pack.aptStatus('${id}','inservice')">✂️ Anza huduma</button>` : ""}
        ${["booked", "arrived", "inservice"].includes(a.status) ? `<button class="btn ${a.status === "inservice" ? "p" : ""}" onclick="PK.pack.toCounter('${id}')">💳 Maliza & lipa</button>` : ""}
        <div class="row">${["booked", "arrived"].includes(a.status) ? `<button class="btn" onclick="PK.pack.aptForm('${id}')">✎ Badilisha</button>` : ""}${a.status === "booked" ? `<button class="btn d" onclick="PK.pack.aptStatus('${id}','noshow')">Hakuja</button>` : ""}${ph ? `<a class="btn" target="_blank" href="https://wa.me/${ph}?text=${msg}">📲 Kumbusha</a>` : ""}</div></div>`);
  }
  function aptStatus(id, s) { if (s === "noshow" || s === "cancel") { archive(id, { status: s, day: get(id).day }); closeModal(); return toast(ST[s][1]); } patch(id, { status: s, [s + "At"]: Date.now() }); closeModal(); }
  function toCounter(id) {
    const a = get(id); SL.apt = id; SL.cli = a.client; SL.phone = a.phone;
    SL.cart = (a.svcs || []).map((x) => { const s = get(x) || {}; return { kind: "svc", id: x, name: s.name, price: Number(s.price) || 0, qty: 1, sty: a.sty }; });
    closeModal(); go("kaunta");
  }

  /* ---------- KAUNTA ---------- */
  function addLine(kind, id) {
    const x = get(id); if (!x) return;
    if (kind === "prod" && (Number(x.qty) || 0) <= 0) return toast("Bidhaa hii imeisha");
    SL.cart.push({ kind, id, name: x.name, price: Number(x.price) || 0, qty: 1, sty: kind === "svc" || Number(S("prodComm", 0)) ? SL.sty || (stys()[0] || {}).id || "" : "" }); render();
  }
  function pageKaunta() {
    const tot = SL.cart.reduce((s, l) => s + l.qty * l.price, 0), S2 = stys();
    const waiting = apts((a) => a.day === today() && ["arrived", "inservice"].includes(a.status));
    return `${waiting.length && !SL.apt ? `<div class="card flat"><b>Wanaosubiri kulipa / wanahudumiwa</b><div class="chips">${waiting.map((a) => `<button class="chip" onclick="PK.pack.toCounter('${a.id}')">${esc(a.client)} · ${esc(a.svcNames)}</button>`).join("")}</div></div>` : ""}
      <div class="split"><div style="display:grid;gap:10px;min-width:0">
        <div class="row"><span class="sm mu">Mhudumu wa huduma inayofuata:</span><div class="chips">${S2.map((s) => `<button class="chip ${(SL.sty || (S2[0] || {}).id) === s.id ? "on" : ""}" onclick="PK.sl.sty='${s.id}';render()">${esc(s.name)}</button>`).join("")}</div></div>
        <h4>Huduma</h4><div class="prods">${svcs().map((s) => `<button class="prod" onclick="PK.pack.addLine('svc','${s.id}')"><b>${esc(s.name)}</b><span>${n0(s.price)}</span><small>${s.dur || 30} dk${s.cat ? " · " + esc(s.cat) : ""}</small></button>`).join("") || `<p class="mu sm">—</p>`}</div>
        ${prods().length ? `<h4>Bidhaa za kuuza</h4><div class="prods">${prods().map((p) => `<button class="prod ${p.qty <= 0 ? "out" : ""}" onclick="PK.pack.addLine('prod','${p.id}')"><b>${esc(p.name)}</b><span>${n0(p.price)}</span><small>${n0(p.qty)} zipo</small></button>`).join("")}</div>` : ""}
      </div>
      <div class="card sticky"><div class="row between"><h3>Bili</h3>${SL.cart.length || SL.apt ? `<button class="btn g s" onclick="PK.sl.cart=[];PK.sl.apt='';PK.sl.cli='';render()">Futa</button>` : ""}</div>
        <label class="l">Mteja<input id="sl-cli" class="f" list="sl-cl" value="${esc(SL.cli)}" oninput="PK.sl.cli=this.value"><datalist id="sl-cl">${clis().map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist></label>
        ${SL.cart.length ? `<div class="cart">${SL.cart.map((l, i) => `<div class="cline"><span><b>${esc(l.name)}</b>${l.qty > 1 ? " ×" + l.qty : ""}<br>${l.kind === "svc" ? `<select class="f" style="padding:3px 6px;font-size:12px;width:auto" onchange="PK.sl.cart[${i}].sty=this.value">${opt(S2.map((s) => [s.id, "✂️ " + s.name]), l.sty)}</select>` : `<small class="mu">bidhaa</small>`}</span>
          <span style="text-align:right"><b class="num">${n0(l.qty * l.price)}</b><br><button class="btn g s" onclick="PK.sl.cart.splice(${i},1);render()">✕</button></span></div>`).join("")}</div>` : `<p class="mu sm" style="margin:0">Chagua huduma au bidhaa.</p>`}
        ${SL.cart.length && roleOk(["meneja"]) ? `<label class="l">Punguzo<input id="sl-disc" class="f" inputmode="numeric" placeholder="0"></label>` : ""}
        <div class="total"><span>Jumla</span><span class="num">${n0(tot)}</span></div>
        <button class="btn p big" onclick="PK.pack.pay()" ${SL.cart.length ? "" : "disabled"}>💳 Lipa</button>
        ${SL.cart.length ? `<div class="mbar"><span>${SL.cart.length} · <span class="num">${n0(tot)}</span></span><button class="btn p" onclick="PK.pack.pay()">💳 Lipa</button></div>` : ""}</div></div>`;
  }
  function pay() {
    if (!SL.cart.length) return; const disc = num(val("sl-disc")), sub = SL.cart.reduce((s, l) => s + l.qty * l.price, 0), total = Math.max(0, sub - disc);
    SL.cli = val("sl-cli") || SL.cli;
    checkout({ total, title: "Malipo" + (SL.cli ? " · " + SL.cli : ""), customer: SL.cli, phone: SL.phone || "", credit: !!SL.cli, onPay: (p) => finish(sub, disc, total, p) });
  }
  async function finish(sub, disc, total, p) {
    const lines = SL.cart.map((l) => { const st = get(l.sty) || {}; return { ...l, styName: st.name || "", comm: 0 }; });
    const factor = sub ? total / sub : 1; lines.forEach((l) => { l.comm = Math.round(commOf(l) * factor); });
    const cli = SL.cli || p.customer || "", apt = SL.apt; SL.cart = []; SL.apt = ""; SL.cli = ""; SL.phone = "";
    const no = await nextNo("visit");
    save({ id: newId("visit"), t: "visit", k: "tx", no, items: lines, sub, discount: disc, total, ...p, client: cli, apt, by: PK.user.name, time: Date.now() });
    lines.filter((l) => l.kind === "prod").forEach((l) => bump(l.id, "qty", -l.qty));
    if (apt && get(apt)) archive(apt, { status: "done", doneAt: Date.now(), paid: total, day: get(apt).day });
    if (cli) { const cid = upsertCli(cli, p.phone); setTimeout(() => { const c = get(cid) || clis().find((x) => x.name === cli); if (c) patch(c.id, { visits: (c.visits || 0) + 1, spent: (c.spent || 0) + total, last: today(), lastSvc: lines.filter((l) => l.kind === "svc").map((l) => l.name).join(", "), debt: (c.debt || 0) + (p.balance || 0) }); }, 50); }
    receipt({ title: "RISITI", no, items: lines.map((l) => ({ name: l.name + (l.kind === "svc" && l.styName ? " (" + l.styName + ")" : ""), qty: l.qty, price: l.price })), discount: disc, total, paid: p.paid, method: methodName(p.method), change: p.change, balance: p.balance, customer: cli, phone: p.phone });
  }

  /* ---------- HUDUMA / BIDHAA / WAHUDUMU ---------- */
  function svcForm(id) {
    const s = id ? get(id) : { name: "", cat: "", price: "", dur: 60, comm: "" };
    modal(`${mhead(id ? "Huduma" : "Huduma mpya")}<div class="form"><label class="l" style="grid-column:1/-1">Jina<input id="sv-n" class="f" value="${esc(s.name)}" placeholder="mf. Rasta, Kusuka, Manicure, Massage"></label>
      <label class="l">Kundi<input id="sv-c" class="f" list="sv-cl" value="${esc(s.cat || "")}"><datalist id="sv-cl">${["Nywele", "Kusuka", "Kucha", "Ngozi & Uso", "Massage", "Kunyoa", "Make-up"].map((x) => `<option value="${x}">`).join("")}</datalist></label>
      <label class="l">Bei<input id="sv-p" class="f" inputmode="numeric" value="${esc(s.price)}"></label><label class="l">Muda (dakika)<input id="sv-d" class="f" inputmode="numeric" value="${esc(s.dur)}"></label>
      <label class="l">Kamisheni % (acha wazi = ya mhudumu)<input id="sv-k" class="f" inputmode="numeric" value="${esc(s.comm || "")}"></label></div>
      <div class="row between">${id ? `<button class="btn d" onclick="delDoc('${id}');closeModal()">Futa</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.svcSave('${id || ""}')">Hifadhi</button></div>`);
  }
  function svcSave(id) { const d = { name: val("sv-n"), cat: val("sv-c"), price: num(val("sv-p")), dur: num(val("sv-d")) || 30, comm: val("sv-k") === "" ? "" : num(val("sv-k")) }; if (!d.name || !d.price) return toast("Andika jina na bei"); if (id) patch(id, d); else save({ id: newId("svc"), t: "svc", ...d }); closeModal(); }
  function styForm(id) {
    const s = id ? get(id) : { name: "", phone: "", comm: defComm(), color: COLORS[stys().length % COLORS.length], active: true };
    modal(`${mhead(id ? "Mhudumu" : "Mhudumu mpya")}<div class="form"><label class="l">Jina<input id="st-n" class="f" value="${esc(s.name)}"></label><label class="l">Simu<input id="st-p" class="f" value="${esc(s.phone || "")}"></label>
      <label class="l">Kamisheni %<input id="st-k" class="f" inputmode="numeric" value="${esc(s.comm)}"></label><label class="l">Rangi kwenye kalenda<input id="st-c" class="f" type="color" value="${esc(s.color || "#c2185b")}" style="height:42px;padding:4px"></label></div>
      ${id ? `<label class="row sm"><input id="st-a" type="checkbox" ${s.active !== false ? "checked" : ""}> Bado anafanya kazi</label>` : ""}
      <p class="mu xs" style="margin:0">Wahudumu si lazima waingie kwenye mfumo. Ukitaka aingie kwa PIN, mwongeze pia kwenye Watumiaji.</p>
      <button class="btn p" onclick="PK.pack.stySave('${id || ""}')">Hifadhi</button>`);
  }
  function stySave(id) { const d = { name: val("st-n"), phone: val("st-p"), comm: num(val("st-k")), color: val("st-c") }; if (!d.name) return toast("Andika jina"); if (id) patch(id, { ...d, active: !!val("st-a") }); else save({ id: newId("sty"), t: "sty", active: true, ...d }); closeModal(); }
  function prodForm(id) {
    const p = id ? get(id) : { name: "", price: "", cost: "", qty: "" };
    modal(`${mhead(id ? "Bidhaa" : "Bidhaa mpya ya kuuza")}<div class="form"><label class="l" style="grid-column:1/-1">Jina<input id="pr-n" class="f" value="${esc(p.name)}" placeholder="mf. Mafuta ya nywele, Shampoo"></label><label class="l">Bei<input id="pr-p" class="f" inputmode="numeric" value="${esc(p.price)}"></label><label class="l">Gharama<input id="pr-c" class="f" inputmode="numeric" value="${esc(p.cost || "")}"></label>
      <label class="l">${id ? "Ongeza stock" : "Stock"}<input id="pr-q" class="f" inputmode="numeric" placeholder="${id ? "+0 (iliyopo " + n0(p.qty) + ")" : ""}"></label></div>
      <div class="row between">${id ? `<button class="btn d" onclick="delDoc('${id}');closeModal()">Futa</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.prodSave('${id || ""}')">Hifadhi</button></div>`);
  }
  function prodSave(id) { const d = { name: val("pr-n"), price: num(val("pr-p")), cost: num(val("pr-c")) }; if (!d.name || !d.price) return toast("Andika jina na bei"); const q = num(val("pr-q")); if (id) { patch(id, d); if (q) bump(id, "qty", q); } else save({ id: newId("prod"), t: "prod", ...d, qty: q }); closeModal(); }
  function pageHuduma() {
    const tabs = [["huduma", "💇 Huduma"], ["wahudumu", "👩🏾‍🎨 Wahudumu"], ["bidhaa", "🧴 Bidhaa"]];
    let body = "";
    if (SL.tab === "huduma") body = svcs().length ? `<div class="tw"><table class="t"><thead><tr><th>Huduma</th><th>Kundi</th><th class="r">Muda</th><th class="r">Bei</th><th class="r">Kamisheni</th></tr></thead><tbody>${svcs().map((s) => `<tr class="click" onclick="PK.pack.svcForm('${s.id}')"><td><b>${esc(s.name)}</b></td><td>${esc(s.cat || "—")}</td><td class="r">${s.dur} dk</td><td class="r num">${n0(s.price)}</td><td class="r">${s.comm !== "" && s.comm != null ? s.comm + "%" : '<span class="mu">ya mhudumu</span>'}</td></tr>`).join("")}</tbody></table></div>` : empty("Ongeza huduma ya kwanza.");
    if (SL.tab === "wahudumu") body = list("sty").length ? `<div class="tiles">${list("sty").map((s) => `<button class="tile" style="border-left-color:${s.color || "var(--ac)"}${s.active === false ? ";opacity:.5" : ""}" onclick="PK.pack.styForm('${s.id}')"><small>${esc(s.phone || "")}</small><b style="font-size:17px">${esc(s.name)}</b><small>Kamisheni ${s.comm}%${s.active === false ? " · ameacha" : ""}</small></button>`).join("")}</div>` : empty("Ongeza wahudumu (wasusi, wa kucha, massage…).");
    if (SL.tab === "bidhaa") body = prods().length ? `<div class="tw"><table class="t"><thead><tr><th>Bidhaa</th><th class="r">Bei</th><th class="r">Stock</th></tr></thead><tbody>${prods().map((p) => `<tr class="click" onclick="PK.pack.prodForm('${p.id}')"><td><b>${esc(p.name)}</b></td><td class="r num">${n0(p.price)}</td><td class="r"><span class="pill ${p.qty <= 0 ? "bd" : p.qty <= 3 ? "wn" : "ok"}">${n0(p.qty)}</span></td></tr>`).join("")}</tbody></table></div>` : empty("Kama mnauza bidhaa (mafuta, shampoo, wigi…), ziongeze hapa.");
    const add = { huduma: "PK.pack.svcForm()", wahudumu: "PK.pack.styForm()", bidhaa: "PK.pack.prodForm()" }[SL.tab];
    return `<div class="row between"><div class="chips">${tabs.map(([k, l]) => `<button class="chip ${SL.tab === k ? "on" : ""}" onclick="PK.sl.tab='${k}';render()">${l}</button>`).join("")}</div>${roleOk(["meneja"]) ? `<button class="btn p" onclick="${add}">＋ Ongeza</button>` : ""}</div>${body}`;
  }

  /* ---------- WATEJA ---------- */
  function cliView(id) {
    const c = get(id), V = txList("visit", (v) => v.client === c.name).sort((a, b) => b.time - a.time).slice(0, 10), next = apts((a) => a.client === c.name && a.day >= today()).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time))[0];
    modal(`${mhead(c.name)}<div class="form"><label class="l">Simu<input id="cv-p" class="f" value="${esc(c.phone || "")}"></label><label class="l">Siku ya kuzaliwa<input id="cv-b" class="f" type="date" value="${esc(c.bday || "")}"></label>
      <label class="l" style="grid-column:1/-1">Kumbukumbu (mzio, mtindo anaoupenda, rangi…)<input id="cv-n" class="f" value="${esc(c.notes || "")}"></label></div>
      <p class="sm" style="margin:0">Ziara <b>${c.visits || 0}</b> · ametumia <b>${tzs(c.spent || 0)}</b> · mwisho ${fdate(c.last)}${c.debt ? ` · <span class="err">deni ${tzs(c.debt)}</span>` : ""}</p>
      ${next ? `<p class="sm okm" style="margin:0">📅 Miadi ijayo: ${fdate(next.day)} saa ${next.time} — ${esc(next.svcNames)}</p>` : ""}
      ${V.length ? `<table class="t"><tbody>${V.map((v) => `<tr><td>${fdate(v.day)}</td><td>${v.items.map((i) => esc(i.name)).join(", ")}</td><td class="r num">${n0(v.total)}</td></tr>`).join("")}</tbody></table>` : ""}
      <div class="row between"><span class="row">${c.debt ? `<button class="btn" onclick="PK.pack.cliDebt('${id}')">Pokea deni</button>` : ""}<button class="btn" onclick="closeModal();PK.pack.aptForm('',{client:${JSON.stringify(c.name).replace(/"/g, "&quot;")},phone:'${esc(c.phone || "")}'})">📅 Miadi</button></span><button class="btn p" onclick="patch('${id}',{phone:val('cv-p'),bday:val('cv-b'),notes:val('cv-n')});closeModal()">Hifadhi</button></div>`);
  }
  function cliDebt(id) { const c = get(id); checkout({ total: c.debt, title: "Deni · " + c.name, onPay: (p) => { patch(id, { debt: Math.max(0, c.debt - p.paid) }); save({ id: newId("dpay"), t: "dpay", k: "tx", client: c.name, amount: p.paid, method: p.method }); toast("✅ Imepokelewa"); } }); }
  function pageWateja() {
    const C = clis().filter((c) => match(c.name + " " + (c.phone || ""), PK.q)).sort((a, b) => (b.last || "").localeCompare(a.last || ""));
    const md = today().slice(5), bdays = clis().filter((c) => c.bday && c.bday.slice(5) === md), lost = clis().filter((c) => c.last && daysBetween(c.last, today()) > 45);
    return `<div class="kpis">${kpi("Wateja", n0(clis().length), true)}${kpi("Wa kudumu (ziara 5+)", n0(clis().filter((c) => (c.visits || 0) >= 5).length))}${kpi("Hawajarudi siku 45+", n0(lost.length))}${kpi("Madeni", tzs(clis().reduce((s, c) => s + (c.debt || 0), 0)))}</div>
      ${bdays.length ? `<div class="card flat">🎂 <b>Siku ya kuzaliwa leo:</b> ${bdays.map((c) => `${esc(c.name)} ${c.phone ? `<a class="btn s" target="_blank" href="https://wa.me/${String(c.phone).replace(/\D/g, "").replace(/^0/, "255")}?text=${encodeURIComponent("Heri ya siku ya kuzaliwa " + c.name + "! 🎉 Kutoka kwetu " + SHOP.name + " — karibu upate zawadi yako ya punguzo leo.")}">📲 Mtakie</a>` : ""}`).join(" ")}</div>` : ""}
      <div class="row between">${searchBox("Tafuta mteja…")}${lost.length ? `<span class="mu sm">💡 Watumie ujumbe wateja ${lost.length} ambao hawajarudi</span>` : ""}</div>
      ${C.length ? `<div class="tw"><table class="t"><thead><tr><th>Mteja</th><th>Simu</th><th class="r">Ziara</th><th class="r">Ametumia</th><th>Mwisho</th><th>Huduma ya mwisho</th></tr></thead><tbody>${C.map((c) => `<tr class="click" onclick="PK.pack.cliView('${c.id}')"><td><b>${esc(c.name)}</b>${(c.visits || 0) >= 5 ? ' <span class="pill ac">⭐ VIP</span>' : ""}${c.debt ? ' <span class="pill bd">deni</span>' : ""}</td><td>${esc(c.phone || "")}</td><td class="r">${c.visits || 0}</td><td class="r num">${n0(c.spent || 0)}</td><td>${fdate(c.last)}</td><td class="sm">${esc(c.lastSvc || "")}</td></tr>`).join("")}</tbody></table></div>` : empty("Wateja wataonekana hapa baada ya miadi au malipo.")}`;
  }

  /* ---------- RIPOTI ---------- */
  function pageRipoti() {
    const V = txList("visit", (v) => inRange(v.day)), total = V.reduce((s, v) => s + v.total, 0), L = V.flatMap((v) => v.items);
    const comm = groupSum(L.filter((l) => l.sty), (l) => l.styName || "—", (l) => l.comm || 0), sales = groupSum(L.filter((l) => l.kind === "svc"), (l) => l.styName || "—", (l) => l.qty * l.price);
    const paidC = txList("cpay", (c) => inRange(c.day)), topS = groupSum(L.filter((l) => l.kind === "svc"), (l) => l.name, (l) => l.qty * l.price).slice(0, 10);
    const noshow = txList("apt", (a) => inRange(a.day) && a.status === "noshow").length;
    return `<div class="row between">${rangeChips()}<button class="btn s" onclick="downloadCSV('kamisheni-'+PK.range,[['Tarehe','Mteja','Huduma','Mhudumu','Bei','Kamisheni']].concat(txList('visit',v=>inRange(v.day)).flatMap(v=>v.items.filter(i=>i.kind==='svc').map(i=>[v.day,v.client,i.name,i.styName,i.price*i.qty,i.comm]))))">⬇️ CSV</button></div>
      <div class="kpis">${kpi("Mapato", tzs(total), true)}${kpi("Wateja waliohudumiwa", n0(V.length))}${kpi("Wastani kwa mteja", tzs(V.length ? total / V.length : 0))}${kpi("Kamisheni", tzs(comm.reduce((s, c) => s + c.value, 0)))}${kpi("Hawakuja", n0(noshow))}</div>
      <div class="card"><h3>Mapato kwa siku (siku 14)</h3>${bars(dailySeries(txList("visit"), 14, (v) => v.total))}</div>
      <div class="grid2"><div class="card"><h3>Kamisheni ya wahudumu</h3><table class="t"><thead><tr><th>Mhudumu</th><th class="r">Huduma</th><th class="r">Mauzo</th><th class="r">Kamisheni</th><th class="r">Imelipwa</th><th></th></tr></thead><tbody>
          ${comm.map((c) => { const s = sales.find((x) => x.key === c.key) || { value: 0, count: 0 }, pd = paidC.filter((p) => p.styName === c.key).reduce((a, p) => a + p.amount, 0); return `<tr><td><b>${esc(c.key)}</b></td><td class="r">${s.count}</td><td class="r num">${n0(s.value)}</td><td class="r num">${n0(c.value)}</td><td class="r num">${n0(pd)}</td><td class="r">${c.value - pd > 0 && roleOk(["meneja"]) ? `<button class="btn s" onclick="PK.pack.payComm(${JSON.stringify(c.key).replace(/"/g, "&quot;")},${c.value - pd})">Lipa</button>` : ""}</td></tr>`; }).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div>
        <div class="card"><h3>Huduma zinazopendwa</h3><table class="t"><tbody>${topS.map((t) => `<tr><td>${esc(t.key)}</td><td class="r">${t.count}</td><td class="r num">${n0(t.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>
          <h3>Njia za malipo</h3><table class="t"><tbody>${methodRows(V).map((m) => `<tr><td>${esc(m.key)}</td><td class="r num">${n0(m.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div></div>`;
  }
  function payComm(name, amt) { modal(`${mhead("Lipa kamisheni · " + name)}<label class="l">Kiasi<input id="pc-a" class="f" inputmode="numeric" value="${amt}"></label><label class="l">Njia<select id="pc-m" class="f">${opt(METHODS.filter((m) => m[0] !== "credit"), "mpesa")}</select></label><button class="btn p" onclick="const a=num(val('pc-a'));if(!a)return;save({id:newId('cpay'),t:'cpay',k:'tx',styName:${JSON.stringify(name).replace(/"/g, "&quot;")},amount:a,method:val('pc-m'),range:PK.range});closeModal();toast('✅ Imeandikwa')">Andika malipo</button>`); }

  setInterval(() => { if (PK.user && PK.page === "miadi" && !PK.modalHtml) render(); }, 60000);

  registerPack({
    id: "saluni", name: "Saluni & Spa", theme: "kifalme", home: "miadi",
    money: (inR) => { const V = txList("visit", (v) => inR(v.day)); return { rev: V.reduce((a, v) => a + v.total, 0), cost: V.reduce((a, v) => a + v.items.reduce((b, l) => b + (l.comm || 0) + (l.kind === "prod" ? l.qty * ((get(l.id) || {}).cost || 0) : 0), 0), 0) }; },
    roles: [["meneja", "Meneja"], ["mapokezi", "Mapokezi / Keshia"], ["mhudumu", "Mhudumu"]],
    pages: [
      { id: "miadi", label: "Miadi", icon: "📅", roles: ["meneja", "mapokezi", "mhudumu"], render: pageMiadi, actions: () => stys().length ? `<button class="btn p s" onclick="PK.pack.aptForm()">＋ Miadi</button>` : "" },
      { id: "kaunta", label: "Kaunta", icon: "💳", roles: ["meneja", "mapokezi"], render: pageKaunta },
      { id: "huduma", label: "Huduma", icon: "💇", roles: ["meneja"], render: pageHuduma },
      { id: "wateja", label: "Wateja", icon: "💖", roles: ["meneja", "mapokezi"], render: pageWateja },
      { id: "ripoti", label: "Ripoti", icon: "📊", roles: ["meneja"], render: pageRipoti },
    ],
    settings: [{ key: "open", label: "Mnafungua saa", type: "time", def: "08:00" }, { key: "close", label: "Mnafunga saa", type: "time", def: "20:00" }, { key: "comm", label: "Kamisheni ya kawaida (%)", type: "number", def: 30 }, { key: "prodComm", label: "Kamisheni ya bidhaa (%)", type: "number", def: 0 }],
    aptForm, aptSave, aptView, aptStatus, toCounter, addLine, pay, svcForm, svcSave, styForm, stySave, prodForm, prodSave, cliView, cliDebt, payComm,
  });
})();
