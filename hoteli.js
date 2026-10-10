/* =====================================================================
   PAKITI: HOTELI & LODGE  · hoteli.js v1
   Ramani ya vyumba, booking (ratiba ya siku 14), check-in / check-out,
   folio ya mgeni (malazi + huduma + malipo), usafi, wageni, ripoti.
   ===================================================================== */
(function () {
  const H = { start: null, floor: "", q: "" };
  PK.htl = H;
  const types = () => list("rtype").sort((a, b) => (a.rate || 0) - (b.rate || 0));
  const rooms = () => list("room").sort((a, b) => String(a.no).localeCompare(String(b.no), undefined, { numeric: true }));
  const bks = (pred) => list("bk", pred);
  const typeOf = (r) => get(r && r.type) || { name: "—", rate: 0 };
  const nights = (b) => Math.max(1, daysBetween(b.from, b.to));
  const folio = (b) => {
    const nn = Math.max(nights(b), b.status === "in" ? daysBetween(b.from, today()) : 0);
    const room = nn * (Number(b.rate) || 0), extras = (b.charges || []).reduce((s, c) => s + (Number(c.amt) || 0), 0), paid = (b.payments || []).reduce((s, p) => s + (Number(p.amt) || 0), 0);
    return { n: nn, room, extras, total: room + extras, paid, bal: room + extras - paid };
  };
  const inHouse = (roomId) => bks((b) => b.status === "in" && b.room === roomId)[0];
  const arriving = (roomId) => bks((b) => b.status === "booked" && b.room === roomId && b.from <= today())[0];
  const overlaps = (roomId, from, to, skip) => bks((b) => b.id !== skip && b.room === roomId && (b.status === "in" || b.status === "booked") && b.from < to && from < b.to);
  const roomState = (r) => {
    const g = inHouse(r.id);
    if (g) return g.to <= today() ? ["wn", "Anaondoka leo", g] : ["ac", "Ana mgeni", g];
    if (r.status === "matengenezo") return ["bd", "Matengenezo", null];
    if (r.status === "usafi") return ["in", "Usafi", null];
    const a = arriving(r.id); if (a) return ["wn", "Anafika leo", a];
    return ["ok", "Wazi", null];
  };
  const SRC = [["walkin", "Walk-in"], ["simu", "Simu/WhatsApp"], ["booking", "Booking.com"], ["airbnb", "Airbnb"], ["wakala", "Wakala/Kampuni"], ["mwingine", "Mwingine"]];

  /* ---------- VYUMBA ---------- */
  function pageVyumba() {
    const R = rooms();
    if (!R.length) return `<div class="card" style="max-width:620px"><h3>Karibu! Tuanze kwa kupanga vyumba</h3>
      <p class="mu sm" style="margin:0">1) Ongeza aina za vyumba na bei (mf. Single 35,000 · Double 50,000 · Deluxe 80,000). 2) Ongeza vyumba vyenyewe — unaweza kuongeza mfululizo kama 101–110 kwa mara moja.</p>
      ${roleOk(["meneja"]) ? `<div class="row"><button class="btn p" onclick="PK.pack.setupRooms()">⚙️ Panga vyumba</button></div>` : `<p class="mu sm">Mwombe meneja apange vyumba.</p>`}</div>`;
    const st = R.map((r) => [r, roomState(r)]);
    const occ = st.filter(([, s]) => s[0] === "ac" || s[1] === "Anaondoka leo").length;
    const arr = bks((b) => b.status === "booked" && b.from === today()).length, dep = bks((b) => b.status === "in" && b.to <= today()).length, dirty = R.filter((r) => r.status === "usafi").length;
    const floors = [...new Set(R.map((r) => r.floor || ""))].sort();
    const legend = [["ok", "Wazi"], ["ac", "Ana mgeni"], ["wn", "Anafika / anaondoka leo"], ["in", "Usafi"], ["bd", "Matengenezo"]];
    return `<div class="kpis">${kpi("Vyumba vyenye wageni", occ + " / " + R.length, true)}${kpi("Occupancy", Math.round((occ / R.length) * 100) + "%")}${kpi("Wanaofika leo", n0(arr))}${kpi("Wanaoondoka leo", n0(dep))}${kpi("Vinahitaji usafi", n0(dirty))}</div>
      <div class="row between"><div class="chips">${legend.map(([c, l]) => `<span class="pill ${c}">${l}</span>`).join("")}</div>
        ${floors.length > 1 ? `<div class="chips"><button class="chip ${!H.floor ? "on" : ""}" onclick="PK.htl.floor='';render()">Zote</button>${floors.map((f) => `<button class="chip ${H.floor === f ? "on" : ""}" onclick="PK.htl.floor='${esc(f)}';render()">${f ? "Ghorofa " + esc(f) : "—"}</button>`).join("")}</div>` : ""}</div>
      ${floors.filter((f) => !H.floor || f === H.floor).map((f) => `${floors.length > 1 ? `<h4 class="mu">${f ? "Ghorofa " + esc(f) : "Vyumba"}</h4>` : ""}
        <div class="tiles">${st.filter(([r]) => (r.floor || "") === f).map(([r, s]) => `<button class="tile ${s[0]}" onclick="PK.pack.roomClick('${r.id}')">
          <small>${esc(typeOf(r).name)}</small><b>${esc(r.no)}</b><small><span class="pill ${s[0]}">${s[1]}</span></small>
          ${s[2] ? `<small><b style="font-size:13px;font-family:var(--fb)">${esc(s[2].guest)}</b><br>${s[2].status === "in" ? "hadi " + fdate(s[2].to) : "siku " + nights(s[2])}${s[2].status === "in" && folio(s[2]).bal > 0 ? ` · <span style="color:var(--bd)">deni ${n0(folio(s[2]).bal)}</span>` : ""}</small>` : `<small>${n0(typeOf(r).rate)}/usiku</small>`}</button>`).join("")}</div>`).join("")}`;
  }
  function roomClick(id) {
    const r = get(id), [c, label, b] = roomState(r);
    if (b && b.status === "in") return openFolio(b.id);
    const canEdit = roleOk(["meneja", "mapokezi"]);
    modal(`${mhead("Chumba " + r.no + " · " + typeOf(r).name)}<p class="sm" style="margin:0"><span class="pill ${c}">${label}</span> · ${tzs(typeOf(r).rate)} kwa usiku</p>
      ${b ? `<div class="card flat"><b>${esc(b.guest)}</b><span class="sm mu">${fdate(b.from)} → ${fdate(b.to)} · ${esc(b.phone || "")}</span><button class="btn p" onclick="PK.pack.checkinForm('${b.id}')">🛎️ Check-in sasa</button></div>` : ""}
      <div style="display:grid;gap:6px">
        ${!b && c === "ok" && canEdit ? `<button class="btn p" onclick="PK.pack.checkinForm('',{room:'${id}'})">🛎️ Mgeni wa sasa (walk-in)</button><button class="btn" onclick="PK.pack.bookForm('',{room:'${id}'})">📅 Booking ya baadaye</button>` : ""}
        ${r.status === "usafi" ? `<button class="btn p" onclick="patch('${id}',{status:'',cleanedAt:Date.now(),cleanedBy:PK.user.name});closeModal();toast('✨ Kiko safi')">✨ Usafi umekamilika</button>` : ""}
        ${r.status !== "usafi" && !inHouse(id) ? `<button class="btn" onclick="patch('${id}',{status:'usafi'});closeModal()">🧹 Kinahitaji usafi</button>` : ""}
        ${r.status === "matengenezo" ? `<button class="btn" onclick="patch('${id}',{status:''});closeModal()">✅ Matengenezo yamekwisha</button>` : !inHouse(id) ? `<button class="btn d" onclick="PK.pack.maintForm('${id}')">🔧 Weka matengenezo</button>` : ""}
      </div>${r.note ? `<p class="mu sm" style="margin:0">📝 ${esc(r.note)}</p>` : ""}`);
  }
  function maintForm(id) { modal(`${mhead("Matengenezo")}<label class="l">Tatizo<input id="mt-n" class="f" placeholder="mf. AC haifanyi kazi"></label><button class="btn p" onclick="patch('${id}',{status:'matengenezo',note:val('mt-n')});closeModal()">Hifadhi</button>`); }

  /* panga aina za vyumba na vyumba */
  function setupRooms() {
    const T = types();
    modal(`${mhead("Panga vyumba")}
      <h4>Aina za vyumba</h4>${T.length ? `<table class="t"><tbody>${T.map((t) => `<tr><td><b>${esc(t.name)}</b><br><small class="mu">${esc(t.desc || "")}</small></td><td class="r num">${n0(t.rate)}</td><td class="r">${rooms().filter((r) => r.type === t.id).length} vyumba</td><td class="r"><button class="btn s" onclick="PK.pack.typeForm('${t.id}')">✎</button></td></tr>`).join("")}</tbody></table>` : `<p class="mu sm" style="margin:0">Bado hakuna.</p>`}
      <button class="btn" onclick="PK.pack.typeForm()">＋ Aina ya chumba</button>
      <h4>Ongeza vyumba</h4>${T.length ? `<div class="form"><label class="l">Kuanzia namba<input id="sr-a" class="f" placeholder="101"></label><label class="l">Hadi namba (si lazima)<input id="sr-b" class="f" placeholder="110"></label>
        <label class="l">Aina<select id="sr-t" class="f">${opt(T.map((t) => [t.id, t.name]))}</select></label><label class="l">Ghorofa<input id="sr-f" class="f" placeholder="1"></label></div>
        <button class="btn p" onclick="PK.pack.addRooms()">＋ Ongeza</button>` : `<p class="mu sm" style="margin:0">Ongeza aina kwanza.</p>`}
      ${rooms().length ? `<h4>Vyumba (${rooms().length})</h4><div class="chips">${rooms().map((r) => `<button class="chip" onclick="PK.pack.roomEdit('${r.id}')">${esc(r.no)} · ${esc(typeOf(r).name)}</button>`).join("")}</div>` : ""}`, true);
  }
  function typeForm(id) {
    const t = id ? get(id) : { name: "", rate: "", desc: "" };
    modal(`${mhead(id ? "Aina ya chumba" : "Aina mpya")}<div class="form"><label class="l">Jina<input id="tf-n" class="f" value="${esc(t.name)}" placeholder="mf. Deluxe"></label><label class="l">Bei kwa usiku<input id="tf-r" class="f" inputmode="numeric" value="${esc(t.rate)}"></label>
      <label class="l" style="grid-column:1/-1">Maelezo<input id="tf-d" class="f" value="${esc(t.desc || "")}" placeholder="mf. Kitanda 6x6, AC, TV, kifungua kinywa"></label></div>
      <div class="row between">${id ? `<button class="btn" onclick="PK.pack.setupRooms()">← Rudi</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.typeSave('${id || ""}')">Hifadhi</button></div>`);
  }
  function typeSave(id) {
    const d = { name: val("tf-n"), rate: num(val("tf-r")), desc: val("tf-d") }; if (!d.name || !d.rate) return toast("Andika jina na bei");
    if (id) patch(id, d); else save({ id: newId("rtype"), t: "rtype", ...d }); setupRooms();
  }
  function addRooms() {
    const a = val("sr-a"), b = val("sr-b") || a, t = val("sr-t"), f = val("sr-f"); if (!a) return toast("Andika namba ya chumba");
    const nums = /^\d+$/.test(a) && /^\d+$/.test(b) && +b >= +a && +b - +a < 200 ? Array.from({ length: +b - +a + 1 }, (_, i) => String(+a + i)) : [a];
    const have = new Set(rooms().map((r) => String(r.no))); let n = 0;
    nums.forEach((no) => { if (!have.has(no)) { save({ id: newId("room"), t: "room", no, type: t, floor: f, status: "" }); n++; } });
    toast("✅ Vyumba " + n + " vimeongezwa"); setupRooms();
  }
  function roomEdit(id) {
    const r = get(id);
    modal(`${mhead("Chumba " + r.no)}<div class="form"><label class="l">Namba<input id="re-n" class="f" value="${esc(r.no)}"></label><label class="l">Aina<select id="re-t" class="f">${opt(types().map((t) => [t.id, t.name]), r.type)}</select></label><label class="l">Ghorofa<input id="re-f" class="f" value="${esc(r.floor || "")}"></label></div>
      <div class="row between"><button class="btn d" onclick="${inHouse(id) || bks((b) => b.room === id).length ? "toast('Chumba kina booking — huwezi kukifuta')" : `delDoc('${id}');PK.pack.setupRooms()`}">Futa</button><span class="row"><button class="btn" onclick="PK.pack.setupRooms()">← Rudi</button><button class="btn p" onclick="patch('${id}',{no:val('re-n'),type:val('re-t'),floor:val('re-f')});PK.pack.setupRooms()">Hifadhi</button></span></div>`);
  }

  /* ---------- BOOKING ---------- */
  function freeRooms(from, to, skip) { return rooms().filter((r) => r.status !== "matengenezo" && !overlaps(r.id, from, to, skip).length); }
  function bookForm(id, pre) {
    const b = id ? get(id) : { guest: "", phone: "", room: "", from: today(), to: addDays(today(), 1), adults: 1, source: "simu", notes: "", rate: "", ...(pre || {}) };
    PK._bf = { id, room: b.room };
    const drawRooms = () => {
      const from = val("bf-from") || b.from, to = val("bf-to") || b.to, cur = PK._bf.room;
      const fr = to > from ? freeRooms(from, to, id) : [];
      const el = document.getElementById("bf-room"); if (!el) return;
      if (!fr.find((r) => r.id === cur)) PK._bf.room = fr[0] ? fr[0].id : "";
      el.innerHTML = fr.length ? fr.map((r) => `<option value="${r.id}" ${r.id === cur ? "selected" : ""}>${esc(r.no)} · ${esc(typeOf(r).name)} · ${n0(typeOf(r).rate)}</option>`).join("") : `<option value="">— hakuna chumba wazi —</option>`;
      document.getElementById("bf-n").textContent = to > from ? daysBetween(from, to) + " usiku" : "tarehe si sahihi";
    };
    PK._bf.draw = drawRooms;
    modal(`${mhead(id ? "Badilisha booking" : "Booking mpya")}<div class="form">
      <label class="l">Jina la mgeni<input id="bf-g" class="f" value="${esc(b.guest)}" list="bf-gl"><datalist id="bf-gl">${list("guest").map((g) => `<option value="${esc(g.name)}">`).join("")}</datalist></label>
      <label class="l">Simu<input id="bf-p" class="f" inputmode="tel" value="${esc(b.phone || "")}"></label>
      <label class="l">Kuingia<input id="bf-from" class="f" type="date" value="${b.from}" onchange="PK._bf.draw()"></label>
      <label class="l">Kutoka<input id="bf-to" class="f" type="date" value="${b.to}" onchange="PK._bf.draw()"></label>
      <label class="l">Chumba (<span id="bf-n"></span>)<select id="bf-room" class="f" onchange="PK._bf.room=this.value"></select></label>
      <label class="l">Bei kwa usiku (acha wazi = bei ya chumba)<input id="bf-rate" class="f" inputmode="numeric" value="${esc(b.rate || "")}"></label>
      <label class="l">Wageni<input id="bf-ad" class="f" inputmode="numeric" value="${esc(b.adults || 1)}"></label>
      <label class="l">Chanzo<select id="bf-src" class="f">${opt(SRC, b.source)}</select></label>
      <label class="l" style="grid-column:1/-1">Maelezo<input id="bf-no" class="f" value="${esc(b.notes || "")}" placeholder="mf. anafika saa 4 usiku, anataka kitanda cha ziada"></label>
      ${id ? "" : `<label class="l">Malipo ya awali (deposit)<input id="bf-dep" class="f" inputmode="numeric" placeholder="0"></label><label class="l">Njia<select id="bf-dm" class="f">${opt(METHODS.filter((m) => m[0] !== "credit"), "mpesa")}</select></label>`}</div>
      <div class="row between">${id ? `<button class="btn d" onclick="PK.pack.cancelBk('${id}')">Ghairi booking</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.bookSave()">Hifadhi booking</button></div>`, true, drawRooms);
  }
  function bookFields() {
    const room = val("bf-room"), from = val("bf-from"), to = val("bf-to");
    if (!val("bf-g")) return toast("Andika jina la mgeni"), null;
    if (!(to > from)) return toast("Tarehe ya kutoka iwe baada ya kuingia"), null;
    if (!room) return toast("Hakuna chumba wazi kwa tarehe hizo"), null;
    return { guest: val("bf-g"), phone: val("bf-p"), room, from, to, rate: num(val("bf-rate")) || typeOf(get(room)).rate, adults: num(val("bf-ad")) || 1, source: val("bf-src"), notes: val("bf-no") };
  }
  function bookSave() {
    const d = bookFields(); if (!d) return; const id = PK._bf.id;
    if (overlaps(d.room, d.from, d.to, id).length) return toast("Chumba hicho kina booking nyingine kwa tarehe hizo");
    if (id) { patch(id, d); closeModal(); return toast("✅ Booking imesasishwa"); }
    const dep = num(val("bf-dep")), dm = val("bf-dm"), nid = newId("bk");
    save({ id: nid, t: "bk", ...d, status: "booked", charges: [], payments: dep ? [{ amt: dep, method: dm, day: today(), by: PK.user.name, what: "Deposit" }] : [], createdAt: Date.now() });
    if (dep) payTx(nid, d, dep, dm, "Deposit");
    upsertGuest(d); closeModal(); toast("✅ Booking imehifadhiwa — chumba " + get(d.room).no);
  }
  function cancelBk(id) { confirmBox("Ghairi booking hii?", () => { archive(id, { status: "cancel", cancelBy: PK.user.name }); toast("Booking imeghairiwa"); }, "Ghairi"); }
  function payTx(bk, b, amt, method, what) { save({ id: newId("pay"), t: "pay", k: "tx", bk, guest: b.guest, room: b.room, amt, method, what: what || "Malipo" }); }
  function upsertGuest(d, extra) {
    const g = list("guest", (x) => x.name.toLowerCase() === d.guest.toLowerCase() || (d.phone && x.phone === d.phone))[0];
    const p = { name: d.guest, phone: d.phone || (g && g.phone) || "", ...(extra || {}) };
    if (g) patch(g.id, p); else save({ id: newId("guest"), t: "guest", visits: 0, ...p });
  }
  function pageBooking() {
    const R = rooms(); if (!R.length) return pageVyumba();
    const start = H.start || addDays(today(), -1), N = 14, days = Array.from({ length: N }, (_, i) => addDays(start, i)), end = addDays(start, N);
    const B = bks((b) => b.from < end && b.to > start);
    const past = txList("stay", (b) => b.from < end && b.to > start);
    const all = B.concat(past);
    const wd = ["Jtt", "Jnn", "Jtn", "Alh", "Ijm", "Jms", "Jpl"];
    const cols = `90px repeat(${N}, minmax(44px,1fr))`;
    const arrivals = bks((b) => b.status === "booked" && b.from <= today()).sort((a, b) => a.from.localeCompare(b.from));
    const upcoming = bks((b) => b.status === "booked" && b.from > today()).sort((a, b) => a.from.localeCompare(b.from)).slice(0, 12);
    return `${arrivals.length ? `<div class="card"><h3>🛎️ Wanaotarajiwa kufika (${arrivals.length})</h3>${arrivals.map((b) => `<div class="row between"><span><b>${esc(b.guest)}</b> · chumba ${esc((get(b.room) || {}).no)} · ${nights(b)} usiku ${b.from < today() ? '<span class="pill bd">wamechelewa</span>' : ""}</span><span class="row"><button class="btn s" onclick="PK.pack.bookForm('${b.id}')">✎</button><button class="btn s p" onclick="PK.pack.checkinForm('${b.id}')">Check-in</button></span></div>`).join("")}</div>` : ""}
      <div class="row between"><div class="row"><button class="btn s" onclick="PK.htl.start='${addDays(start, -7)}';render()">◀ Wiki</button><button class="btn s" onclick="PK.htl.start=null;render()">Leo</button><button class="btn s" onclick="PK.htl.start='${addDays(start, 7)}';render()">Wiki ▶</button></div><span class="mu sm">${fdate(start)} – ${fdate(addDays(end, -1))}</span></div>
      <div class="cal" style="min-width:0"><div style="min-width:${90 + N * 44}px">
        <div class="cal-h" style="grid-template-columns:${cols}"><div>Chumba</div>${days.map((d) => `<div style="${d === today() ? "color:var(--ac)" : ""}">${wd[new Date(d + "T12:00").getDay() === 0 ? 6 : new Date(d + "T12:00").getDay() - 1]}<br>${d.slice(8)}</div>`).join("")}</div>
        ${R.map((r) => { const mine = all.filter((b) => b.room === r.id);
          return `<div class="cal-r" style="grid-template-columns:${cols};position:relative"><div>${esc(r.no)}<br><small>${esc(typeOf(r).name)}</small></div>${days.map((d) => `<div style="cursor:pointer;${d === today() ? "background:color-mix(in srgb,var(--ac) 6%,transparent)" : ""}" onclick="PK.pack.bookForm('',{room:'${r.id}',from:'${d}',to:'${addDays(d, 1)}'})" title="Booking ${esc(r.no)} ${d}"></div>`).join("")}
            ${mine.map((b) => { const s = Math.max(0, daysBetween(start, b.from)), e = Math.min(N, daysBetween(start, b.to)); if (e <= 0 || s >= N) return "";
              const cls = b.t === "stay" ? "mu" : b.status === "in" ? "" : "wn";
              return `<button class="ev ${cls}" style="position:absolute;top:4px;bottom:4px;left:calc(90px + (100% - 90px) * ${s / N} + 2px);width:calc((100% - 90px) * ${(e - s) / N} - 4px);overflow:hidden;white-space:nowrap;text-overflow:ellipsis" onclick="event.stopPropagation();PK.pack.bkClick('${b.id}')">${esc(b.guest)}</button>`; }).join("")}</div>`; }).join("")}
      </div></div>
      <p class="mu xs" style="margin:0">Bonyeza kisanduku kitupu kuweka booking. <span class="pill wn">booking</span> <span class="pill ac">ana mgeni</span> <span class="pill">ameondoka</span></p>
      ${upcoming.length ? `<div class="card"><h3>Booking zijazo</h3><table class="t"><tbody>${upcoming.map((b) => `<tr class="click" onclick="PK.pack.bookForm('${b.id}')"><td>${fdate(b.from)}</td><td><b>${esc(b.guest)}</b><br><small class="mu">${esc(b.phone || "")} · ${esc((SRC.find((s) => s[0] === b.source) || [, ""])[1])}</small></td><td>Chumba ${esc((get(b.room) || {}).no)}</td><td>${nights(b)} usiku</td><td class="r num">${n0(nights(b) * b.rate)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  }
  function bkClick(id) { const b = get(id); if (!b) return; if (b.t === "stay") return openFolio(id); if (b.status === "in") return openFolio(id); bookForm(id); }

  /* ---------- CHECK-IN ---------- */
  function checkinForm(bkId, pre) {
    const b = bkId ? get(bkId) : { guest: "", phone: "", room: "", from: today(), to: addDays(today(), 1), adults: 1, source: "walkin", rate: "", ...(pre || {}) };
    const g = list("guest", (x) => x.name === b.guest)[0] || {};
    const fr = freeRooms(today(), b.to > today() ? b.to : addDays(today(), 1), bkId);
    modal(`${mhead(bkId ? "Check-in · " + b.guest : "Mgeni mpya (walk-in)")}<div class="form">
      <label class="l">Jina kamili<input id="ci-g" class="f" value="${esc(b.guest)}"></label><label class="l">Simu<input id="ci-p" class="f" inputmode="tel" value="${esc(b.phone || g.phone || "")}"></label>
      <label class="l">Kitambulisho (NIDA / Pasipoti)<input id="ci-id" class="f" value="${esc(g.idNo || "")}"></label><label class="l">Uraia<input id="ci-nat" class="f" value="${esc(g.nat || "Mtanzania")}"></label>
      <label class="l">Anakotoka<input id="ci-from" class="f" value="${esc(g.home || "")}" placeholder="mf. Dar es Salaam"></label><label class="l">Gari (namba)<input id="ci-car" class="f" value=""></label>
      <label class="l">Chumba<select id="ci-room" class="f">${opt(fr.map((r) => [r.id, r.no + " · " + typeOf(r).name + " · " + n0(typeOf(r).rate)]), b.room)}</select></label>
      <label class="l">Usiku<input id="ci-n" class="f" inputmode="numeric" value="${Math.max(1, daysBetween(today(), b.to))}"></label>
      <label class="l">Bei kwa usiku<input id="ci-rate" class="f" inputmode="numeric" value="${esc(b.rate || "")}" placeholder="bei ya chumba"></label><label class="l">Wageni<input id="ci-ad" class="f" inputmode="numeric" value="${esc(b.adults || 1)}"></label>
      <label class="l">Analipa sasa<input id="ci-pay" class="f" inputmode="numeric" placeholder="0"></label><label class="l">Njia<select id="ci-m" class="f">${opt(METHODS.filter((m) => m[0] !== "credit"), "cash")}</select></label></div>
      ${b.payments && b.payments.length ? `<p class="okm" style="margin:0">Tayari amelipa ${tzs(b.payments.reduce((s, p) => s + p.amt, 0))} (deposit)</p>` : ""}
      <button class="btn p big" onclick="PK.pack.checkin('${bkId || ""}')">🛎️ Mpe chumba</button>`, true);
  }
  function checkin(bkId) {
    const room = val("ci-room"), n = Math.max(1, num(val("ci-n"))), guest = val("ci-g");
    if (!guest) return toast("Andika jina la mgeni"); if (!room) return toast("Hakuna chumba wazi");
    const to = addDays(today(), n);
    if (overlaps(room, today(), to, bkId).length) return toast("Chumba kina booking ndani ya siku hizo — punguza usiku au chagua kingine");
    const d = { guest, phone: val("ci-p"), room, from: today(), to, rate: num(val("ci-rate")) || typeOf(get(room)).rate, adults: num(val("ci-ad")) || 1, idNo: val("ci-id"), nat: val("ci-nat"), home: val("ci-from"), car: val("ci-car"), status: "in", checkinAt: Date.now(), checkinBy: PK.user.name };
    const pay = num(val("ci-pay")), m = val("ci-m"); let id = bkId;
    if (bkId) { const b = get(bkId); patch(bkId, { ...d, payments: (b.payments || []).concat(pay ? [{ amt: pay, method: m, day: today(), by: PK.user.name, what: "Malipo" }] : []) }); }
    else { id = newId("bk"); save({ id, t: "bk", source: "walkin", ...d, charges: [], payments: pay ? [{ amt: pay, method: m, day: today(), by: PK.user.name, what: "Malipo" }] : [], createdAt: Date.now() }); }
    if (pay) payTx(id, d, pay, m);
    upsertGuest(d, { idNo: d.idNo, nat: d.nat, home: d.home, lastVisit: today() });
    patch(room, { status: "" });
    closeModal(); toast("✅ " + guest + " amepewa chumba " + get(room).no);
  }

  /* ---------- FOLIO / BILI ---------- */
  function openFolio(id) {
    const b = get(id); if (!b) return; const f = folio(b), r = get(b.room) || {}, closed = b.t === "stay";
    modal(`${mhead("Folio · " + b.guest)}
      <div class="row between sm"><span>Chumba <b>${esc(r.no || "?")}</b> · ${esc(typeOf(r).name)}</span><span>${fdate(b.from)} → ${fdate(b.to)} ${!closed && b.to < today() ? '<span class="pill bd">amezidi muda</span>' : ""}</span></div>
      <div class="tw"><table class="t"><tbody>
        <tr><td>Malazi · ${f.n} usiku × ${n0(b.rate)}</td><td class="r num">${n0(f.room)}</td></tr>
        ${(b.charges || []).map((c, i) => `<tr><td>${esc(c.name)} <small class="mu">${fdate(c.day)}</small></td><td class="r num">${n0(c.amt)} ${closed ? "" : `<button class="btn g s" onclick="PK.pack.delCharge('${id}',${i})" aria-label="Ondoa">✕</button>`}</td></tr>`).join("")}
        <tr><td><b>Jumla</b></td><td class="r num"><b>${n0(f.total)}</b></td></tr>
        ${(b.payments || []).map((p) => `<tr><td class="mu">Malipo · ${esc(methodName(p.method))} · ${fdate(p.day)}</td><td class="r num" style="color:var(--ok)">−${n0(p.amt)}</td></tr>`).join("")}
        <tr><td><b>${f.bal > 0 ? "Anadaiwa" : f.bal < 0 ? "Chenji/ziada" : "Salio"}</b></td><td class="r num"><b style="color:${f.bal > 0 ? "var(--bd)" : "var(--ok)"}">${n0(Math.abs(f.bal))}</b></td></tr></tbody></table></div>
      ${closed ? `<button class="btn" onclick="PK.pack.folioReceipt('${id}')">🧾 Risiti</button>` : `
      <div class="row" style="flex-wrap:nowrap"><input id="fc-n" class="f" list="fc-l" placeholder="Huduma (mf. Chakula, Laundry, Vinywaji)"><datalist id="fc-l">${["Chakula", "Vinywaji", "Laundry", "Kitanda cha ziada", "Usafiri", "Simu", "Minibar"].map((x) => `<option value="${x}">`).join("")}</datalist><input id="fc-a" class="f" style="max-width:120px" inputmode="numeric" placeholder="Kiasi"><button class="btn" onclick="PK.pack.addCharge('${id}')">＋</button></div>
      <div class="row"><button class="btn" onclick="PK.pack.payForm('${id}')">💵 Pokea malipo</button><button class="btn" onclick="PK.pack.extendForm('${id}')">📅 Ongeza siku</button><button class="btn" onclick="PK.pack.moveForm('${id}')">🔁 Hamisha chumba</button><button class="btn" onclick="PK.pack.folioReceipt('${id}')">🧾 Risiti</button></div>
      <button class="btn p big" onclick="PK.pack.checkout('${id}')">🚪 Check-out</button>`}`, true);
  }
  function addCharge(id) { const b = get(id), n = val("fc-n"), a = num(val("fc-a")); if (!n || !a) return toast("Andika huduma na kiasi"); patch(id, { charges: (b.charges || []).concat([{ name: n, amt: a, day: today(), by: PK.user.name }]) }); save({ id: newId("chg"), t: "chg", k: "tx", bk: id, name: n, amt: a, room: b.room }); openFolio(id); }
  function delCharge(id, i) { if (!roleOk(["meneja"])) return toast("Meneja tu anaweza kuondoa"); const b = get(id), c = (b.charges || []).slice(); c.splice(i, 1); patch(id, { charges: c }); openFolio(id); }
  function payForm(id) {
    const b = get(id), f = folio(b);
    checkout({ total: Math.max(0, f.bal), title: "Malipo · " + b.guest, onPay: (p) => {
      const amt = p.method === "cash" && p.change ? p.paid : p.paid; if (!amt) return;
      patch(id, { payments: (b.payments || []).concat([{ amt, method: p.method, day: today(), by: PK.user.name, ref: p.ref }]) }); payTx(id, b, amt, p.method); toast("✅ Malipo " + tzs(amt)); setTimeout(() => openFolio(id), 50);
    } });
    setTimeout(() => { const t = document.querySelector(".pk-md .total span:last-child"); if (t && !f.bal) t.textContent = "—"; }, 0);
  }
  function extendForm(id) {
    const b = get(id);
    modal(`${mhead("Ongeza siku · " + b.guest)}<label class="l">Tarehe mpya ya kutoka<input id="ex-to" class="f" type="date" value="${addDays(b.to, 1)}"></label><button class="btn p" onclick="PK.pack.extend('${id}')">Hifadhi</button>`);
  }
  function extend(id) { const b = get(id), to = val("ex-to"); if (!(to > b.from)) return toast("Tarehe si sahihi"); if (overlaps(b.room, b.from, to, id).length) return toast("Chumba kina booking nyingine — hamisha chumba"); patch(id, { to }); openFolio(id); }
  function moveForm(id) {
    const b = get(id), fr = freeRooms(today(), b.to, id).filter((r) => r.id !== b.room);
    modal(`${mhead("Hamisha chumba")}<label class="l">Chumba kipya<select id="mv-r" class="f">${opt(fr.map((r) => [r.id, r.no + " · " + typeOf(r).name + " · " + n0(typeOf(r).rate)]))}</select></label><label class="row sm"><input id="mv-rate" type="checkbox"> Tumia bei ya chumba kipya</label>
      <button class="btn p" onclick="PK.pack.move('${id}')">Hamisha</button>`);
  }
  function move(id) { const b = get(id), r = val("mv-r"); if (!r) return toast("Hakuna chumba wazi"); const p = { room: r, moves: (b.moves || []).concat([{ from: b.room, day: today() }]) }; if (val("mv-rate")) p.rate = typeOf(get(r)).rate; patch(b.room, { status: "usafi" }); patch(id, p); openFolio(id); }
  function checkoutStay(id) {
    const b = get(id), f = folio(b);
    const done = () => {
      const fresh = get(id), ff = folio(fresh);
      archive(id, { t: "stay", status: "out", to: today() > fresh.from ? today() : addDays(fresh.from, 1), bookedTo: fresh.to, actualOut: today(), checkoutAt: Date.now(), total: ff.total, paidTotal: ff.paid, balance: ff.bal, nightsBilled: ff.n });
      patch(b.room, { status: "usafi" });
      const g = list("guest", (x) => x.name === b.guest)[0]; if (g) patch(g.id, { visits: (g.visits || 0) + 1, spent: (g.spent || 0) + ff.total, lastVisit: today() });
      closeModal(); toast("🚪 " + b.guest + " ameondoka · chumba " + (get(b.room) || {}).no + " kimewekwa usafi");
    };
    if (f.bal > 0) {
      if (!roleOk(["meneja"])) return checkout({ total: f.bal, title: "Lipa kabla ya kuondoka", onPay: (p) => { patch(id, { payments: (b.payments || []).concat([{ amt: p.paid, method: p.method, day: today(), by: PK.user.name }]) }); payTx(id, b, p.paid, p.method); setTimeout(done, 30); } });
      return confirmBox(`Mgeni anadaiwa ${tzs(f.bal)}. Aondoke na deni? (Chagua "Hapana" kupokea malipo kwanza)`, done, "Ndiyo, aondoke na deni");
    }
    confirmBox(`Check-out ${b.guest} kutoka chumba ${(get(b.room) || {}).no}?`, done, "Check-out");
  }
  function folioReceipt(id) {
    const b = get(id), f = folio(b);
    receipt({ title: "BILI YA MGENI", no: (get(b.room) || {}).no ? "Chumba " + get(b.room).no : "", customer: b.guest, phone: b.phone,
      items: [{ name: `Malazi ${f.n} usiku (${fdate(b.from)}–${fdate(b.to)})`, qty: f.n, price: b.rate }].concat((b.charges || []).map((c) => ({ name: c.name, qty: 1, price: c.amt }))),
      total: f.total, paid: f.paid, balance: f.bal > 0 ? f.bal : 0 });
  }
  function pageBili() {
    const I = bks((b) => b.status === "in").sort((a, b) => folio(b).bal - folio(a).bal);
    const owed = I.reduce((s, b) => s + Math.max(0, folio(b).bal), 0), closedDebt = txList("stay", (s) => s.balance > 0);
    return `<div class="kpis">${kpi("Bili wazi", n0(I.length))}${kpi("Wageni wanadaiwa", tzs(owed), owed > 0)}${kpi("Malipo leo", tzs(txList("pay", (p) => p.day === today()).reduce((s, p) => s + p.amt, 0)))}</div>
      ${I.length ? `<div class="tw"><table class="t"><thead><tr><th>Chumba</th><th>Mgeni</th><th>Muda</th><th class="r">Jumla</th><th class="r">Amelipa</th><th class="r">Salio</th></tr></thead><tbody>
      ${I.map((b) => { const f = folio(b); return `<tr class="click" onclick="PK.pack.openFolio('${b.id}')"><td><b>${esc((get(b.room) || {}).no)}</b></td><td>${esc(b.guest)}</td><td>${fdate(b.from)} → ${fdate(b.to)}${b.to < today() ? ' <span class="pill bd">amezidi</span>' : b.to === today() ? ' <span class="pill wn">leo</span>' : ""}</td><td class="r num">${n0(f.total)}</td><td class="r num">${n0(f.paid)}</td><td class="r"><span class="pill ${f.bal > 0 ? "bd" : "ok"}">${n0(f.bal)}</span></td></tr>`; }).join("")}</tbody></table></div>` : empty("Hakuna mgeni aliye ndani kwa sasa.")}
      ${closedDebt.length ? `<div class="card"><h3>Waliondoka na deni</h3><table class="t"><tbody>${closedDebt.map((s) => `<tr class="click" onclick="PK.pack.openFolio('${s.id}')"><td>${fdate(s.actualOut)}</td><td>${esc(s.guest)}</td><td>${esc(s.phone || "")}</td><td class="r num">${n0(s.balance)}</td><td class="r"><button class="btn s" onclick="event.stopPropagation();PK.pack.settleOld('${s.id}')">Pokea</button></td></tr>`).join("")}</tbody></table></div>` : ""}`;
  }
  function settleOld(id) {
    const s = get(id);
    checkout({ total: s.balance, title: "Deni la " + s.guest, onPay: (p) => { patch(id, { balance: s.balance - p.paid, payments: (s.payments || []).concat([{ amt: p.paid, method: p.method, day: today(), by: PK.user.name }]) }); payTx(id, s, p.paid, p.method, "Deni"); toast("✅ Imepokelewa"); } });
  }

  /* ---------- WAGENI ---------- */
  function pageWageni() {
    const I = bks((b) => b.status === "in");
    const G = list("guest", (g) => match(g.name + " " + (g.phone || "") + " " + (g.idNo || ""), PK.q)).sort((a, b) => (b.lastVisit || "").localeCompare(a.lastVisit || "")).slice(0, 80);
    return `<div class="card"><h3>Walio ndani sasa (${I.length})</h3>${I.length ? `<div class="tw"><table class="t"><thead><tr><th>Chumba</th><th>Mgeni</th><th>Simu</th><th>Kitambulisho</th><th>Anaondoka</th></tr></thead><tbody>${I.map((b) => `<tr class="click" onclick="PK.pack.openFolio('${b.id}')"><td><b>${esc((get(b.room) || {}).no)}</b></td><td>${esc(b.guest)} <small class="mu">(${b.adults || 1})</small></td><td>${esc(b.phone || "")}</td><td>${esc(b.idNo || "—")} <small class="mu">${esc(b.nat || "")}</small></td><td>${fdate(b.to)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="mu sm" style="margin:0">Hakuna.</p>`}
      <button class="btn s" style="justify-self:start" onclick="PK.pack.register()">⬇️ Daftari la wageni (CSV)</button></div>
      <div class="row between"><h3>Kumbukumbu za wageni</h3>${searchBox("Jina, simu, kitambulisho…")}</div>
      ${G.length ? `<div class="tw"><table class="t"><thead><tr><th>Mgeni</th><th>Simu</th><th>Uraia</th><th class="r">Ziara</th><th class="r">Ametumia</th><th>Mwisho</th></tr></thead><tbody>${G.map((g) => `<tr><td><b>${esc(g.name)}</b>${(g.visits || 0) >= 3 ? ' <span class="pill ac">⭐ wa kudumu</span>' : ""}</td><td>${esc(g.phone || "")}</td><td>${esc(g.nat || "")}</td><td class="r">${g.visits || 0}</td><td class="r num">${n0(g.spent || 0)}</td><td>${fdate(g.lastVisit)}</td></tr>`).join("")}</tbody></table></div>` : empty("Wageni wataonekana hapa baada ya check-in.")}`;
  }
  function register() {
    const rows = bks((b) => b.status === "in").concat(txList("stay")).sort((a, b) => a.from.localeCompare(b.from));
    downloadCSV("daftari-la-wageni", [["Kuingia", "Kutoka", "Chumba", "Jina", "Simu", "Kitambulisho", "Uraia", "Anakotoka", "Gari", "Wageni"]].concat(rows.map((b) => [b.from, b.actualOut || b.to, (get(b.room) || {}).no, b.guest, b.phone, b.idNo, b.nat, b.home, b.car, b.adults])));
  }

  /* ---------- USAFI ---------- */
  function pageUsafi() {
    const D = rooms().filter((r) => r.status === "usafi"), M = rooms().filter((r) => r.status === "matengenezo"), dep = bks((b) => b.status === "in" && b.to <= today());
    return `<div class="kpis">${kpi("Vinahitaji usafi", n0(D.length), D.length > 0)}${kpi("Wanaoondoka leo", n0(dep.length))}${kpi("Matengenezo", n0(M.length))}</div>
      <div class="tiles">${D.map((r) => `<button class="tile in" onclick="patch('${r.id}',{status:'',cleanedAt:Date.now(),cleanedBy:PK.user.name});toast('✨ ${esc(r.no)} kiko safi')"><small>${esc(typeOf(r).name)}</small><b>${esc(r.no)}</b><small>Bonyeza ukimaliza ✨</small></button>`).join("") || `<p class="mu">Vyumba vyote viko safi. ✨</p>`}</div>
      ${dep.length ? `<h4>Vitakavyohitaji usafi leo</h4><div class="chips">${dep.map((b) => `<span class="chip">${esc((get(b.room) || {}).no)} · ${esc(b.guest)}</span>`).join("")}</div>` : ""}
      ${M.length ? `<h4>Matengenezo</h4><table class="t"><tbody>${M.map((r) => `<tr><td><b>${esc(r.no)}</b></td><td>${esc(r.note || "")}</td><td class="r"><button class="btn s" onclick="patch('${r.id}',{status:''})">Imekamilika</button></td></tr>`).join("")}</tbody></table>` : ""}`;
  }

  /* ---------- RIPOTI ---------- */
  function occOn(d) { const all = bks((b) => b.status === "in").concat(txList("stay")); return all.filter((b) => b.from <= d && d < b.to).length; }
  function pageRipoti() {
    const R = rooms().length || 1, P = txList("pay", (p) => inRange(p.day)), rev = P.reduce((s, p) => s + p.amt, 0);
    const n = rangeDays(), from = rangeFrom(), dlist = Array.from({ length: n }, (_, i) => addDays(from, i)).filter((d) => d <= today());
    const roomNights = dlist.reduce((s, d) => s + occOn(d), 0), occPct = dlist.length ? Math.round((roomNights / (R * dlist.length)) * 100) : 0;
    const stays = txList("stay", (s) => inRange(s.actualOut || s.day)), roomRev = stays.reduce((s, b) => s + (b.nightsBilled || nights(b)) * b.rate, 0), roomN = stays.reduce((s, b) => s + (b.nightsBilled || nights(b)), 0);
    const extras = groupSum(txList("chg", (c) => inRange(c.day)), (c) => c.name, (c) => c.amt);
    const src = groupSum(stays, (s) => (SRC.find((x) => x[0] === s.source) || [, "—"])[1], (s) => s.total || 0);
    const series = Array.from({ length: 14 }, (_, i) => { const d = addDays(today(), i - 13); return { label: d.slice(8), value: Math.round((occOn(d) / R) * 100) }; });
    return `<div class="row between">${rangeChips()}<button class="btn s" onclick="downloadCSV('malipo-'+PK.range,[['Tarehe','Mgeni','Chumba','Njia','Kiasi']].concat(txList('pay',p=>inRange(p.day)).map(p=>[p.day,p.guest,(get(p.room)||{}).no,methodName(p.method),p.amt])))">⬇️ CSV</button></div>
      <div class="kpis">${kpi("Mapato (malipo)", tzs(rev), true)}${kpi("Occupancy", occPct + "%")}${kpi("ADR (wastani/usiku)", tzs(roomN ? roomRev / roomN : 0))}${kpi("RevPAR", tzs(dlist.length ? roomRev / (R * dlist.length) : 0))}${kpi("Wageni walioondoka", n0(stays.length))}</div>
      <div class="card"><h3>Occupancy % (siku 14)</h3>${bars(series, (v) => v + "%")}</div>
      <div class="grid2"><div class="card"><h3>Njia za malipo</h3><table class="t"><tbody>${groupSum(P, (p) => methodName(p.method), (p) => p.amt).map((m) => `<tr><td>${esc(m.key)}</td><td class="r num">${n0(m.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div>
        <div class="card"><h3>Wageni walitoka wapi (booking)</h3><table class="t"><tbody>${src.map((m) => `<tr><td>${esc(m.key)}</td><td class="r">${m.count}</td><td class="r num">${n0(m.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>
        <h3>Huduma za ziada</h3><table class="t"><tbody>${extras.map((m) => `<tr><td>${esc(m.key)}</td><td class="r num">${n0(m.value)}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table></div></div>`;
  }

  registerPack({
    id: "hoteli", name: "Hoteli & Lodge", theme: "dhahabu", home: "vyumba",
    roles: [["meneja", "Meneja"], ["mapokezi", "Mapokezi"], ["usafi", "Usafi"]],
    pages: [
      { id: "vyumba", label: "Vyumba", icon: "🛏️", roles: ["meneja", "mapokezi"], render: pageVyumba, actions: () => `${roleOk(["meneja"]) ? `<button class="btn s" onclick="PK.pack.setupRooms()">⚙️ Panga</button>` : ""}<button class="btn p s" onclick="PK.pack.checkinForm()">🛎️ Walk-in</button>` },
      { id: "booking", label: "Booking", icon: "📅", roles: ["meneja", "mapokezi"], render: pageBooking, actions: () => `<button class="btn p s" onclick="PK.pack.bookForm()">＋ Booking</button>`, badge: () => bks((b) => b.status === "booked" && b.from <= today()).length || "" },
      { id: "bili", label: "Bili", icon: "🧾", roles: ["meneja", "mapokezi"], render: pageBili },
      { id: "wageni", label: "Wageni", icon: "🧳", roles: ["meneja", "mapokezi"], render: pageWageni },
      { id: "usafi", label: "Usafi", icon: "🧹", roles: ["meneja", "mapokezi", "usafi"], render: pageUsafi, badge: () => rooms().filter((r) => r.status === "usafi").length || "" },
      { id: "ripoti", label: "Ripoti", icon: "📊", roles: ["meneja"], render: pageRipoti },
    ],
    settings: [{ key: "checkoutTime", label: "Muda wa check-out", type: "text", def: "10:00" }],
    roomClick, maintForm, setupRooms, typeForm, typeSave, addRooms, roomEdit, bookForm, bookSave, cancelBk, bkClick, checkinForm, checkin,
    openFolio, addCharge, delCharge, payForm, extendForm, extend, moveForm, move, checkout: checkoutStay, folioReceipt, settleOld, register,
  });
})();
