/* =====================================================================
   PAKITI: BOUTIQUE & MAVAZI  · boutique.js v1
   Mitindo yenye saizi × rangi (stock ya kila mchanganyiko), kaunta,
   pointi za wateja, salio la kubadilisha (store credit), marejesho na
   kubadilisha (exchange), punguzo la msimu, ripoti za saizi/rangi.
   ===================================================================== */
(function () {
  const BT = { cart: [], q: "", cat: "", cust: "", ret: null };
  PK.bt = BT;
  const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
  const vk = (size, color) => slug(size) + "__" + slug(color);
  const styles = () => list("style").sort((a, b) => a.name.localeCompare(b.name));
  const custs = () => list("cust").sort((a, b) => a.name.localeCompare(b.name));
  const qOf = (s, size, color) => Number((s.v || {})[vk(size, color)]) || 0;
  const total = (s) => Object.values(s.v || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const priceOf = (s) => Math.round((Number(s.price) || 0) * (1 - (Number(s.disc) || 0) / 100));
  const ptsRate = () => Number(S("ptsPer", 1000)) || 1000, ptsVal = () => Number(S("ptsVal", 10)) || 0;
  const SIZES = { nguo: ["XS", "S", "M", "L", "XL", "XXL"], viatu: ["36", "37", "38", "39", "40", "41", "42", "43", "44"], suruali: ["28", "30", "32", "34", "36", "38"], moja: ["Moja"] };

  /* ---------- UZA ---------- */
  function pick(id) {
    const s = get(id); const sz = s.sizes || [], cl = s.colors || [];
    if (sz.length === 1 && cl.length === 1) return addLine(s, sz[0], cl[0]);
    modal(`${mhead(s.name + " · " + tzs(priceOf(s)))}<p class="mu sm" style="margin:0">Chagua saizi na rangi (namba = zilizopo).</p>
      <div class="tw"><table class="t"><thead><tr><th></th>${sz.map((z) => `<th class="r">${esc(z)}</th>`).join("")}</tr></thead><tbody>${cl.map((c) => `<tr><td><b>${esc(c)}</b></td>${sz.map((z) => { const q = qOf(s, z, c); return `<td class="r">${q > 0 ? `<button class="btn s ${q <= 1 ? "" : "p"}" style="min-width:44px" onclick="PK.pack.addV('${id}',${JSON.stringify(z).replace(/"/g, "&quot;")},${JSON.stringify(c).replace(/"/g, "&quot;")})">${q}</button>` : `<span class="mu">—</span>`}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`, true);
  }
  function addLine(s, size, color) {
    const have = qOf(s, size, color), inCart = BT.cart.filter((l) => l.style === s.id && l.size === size && l.color === color).reduce((a, l) => a + l.qty, 0);
    if (inCart + 1 > have) return toast("Imeisha: " + size + " / " + color);
    const l = BT.cart.find((x) => x.style === s.id && x.size === size && x.color === color);
    if (l) l.qty++; else BT.cart.push({ style: s.id, key: vk(size, color), name: s.name, size, color, price: priceOf(s), full: Number(s.price) || 0, cost: Number(s.cost) || 0, qty: 1, cat: s.cat || "" });
    closeModal(); render();
  }
  function pageUza() {
    const S2 = styles(), q = BT.q, cats = [...new Set(S2.map((s) => s.cat).filter(Boolean))];
    const shown = S2.filter((s) => (q ? match(s.name + " " + (s.cat || "") + " " + (s.brand || "") + " " + (s.code || ""), q) : !BT.cat || s.cat === BT.cat));
    const sub = BT.cart.reduce((a, l) => a + l.qty * l.price, 0), c = BT.cust && get(BT.cust);
    return `<div class="split"><div style="display:grid;gap:10px;min-width:0">
      <input id="bt-q" class="f" style="font-size:17px;padding:12px 14px" placeholder="Tafuta mtindo, kundi, brand…" value="${esc(q)}" oninput="PK.bt.q=this.value;soft()">
      ${cats.length && !q ? `<div class="chips"><button class="chip ${!BT.cat ? "on" : ""}" onclick="PK.bt.cat='';render()">Zote</button>${cats.map((x) => `<button class="chip ${BT.cat === x ? "on" : ""}" onclick="PK.bt.cat='${esc(x)}';render()">${esc(x)}</button>`).join("")}</div>` : ""}
      ${S2.length ? `<div class="prods">${shown.map((s) => { const t = total(s); return `<button class="prod ${t <= 0 ? "out" : ""}" onclick="PK.pack.pick('${s.id}')" style="${s.color ? `border-top:4px solid ${esc(s.color)}` : ""}"><b>${esc(s.name)}</b><span>${s.disc ? `<s class="mu" style="font-weight:400">${n0(s.price)}</s> ` : ""}${n0(priceOf(s))}</span><small>${t} vipande · ${(s.sizes || []).length} saizi · ${(s.colors || []).length} rangi${s.disc ? ` · <b style="color:var(--bd)">-${s.disc}%</b>` : ""}</small></button>`; }).join("")}</div>`
        : empty("Bado hakuna mitindo.", roleOk(["meneja"]) ? `<button class="btn p" onclick="go('mavazi')">＋ Ongeza mavazi</button>` : "")}
    </div>
    <div class="card sticky"><h3>Mauzo</h3>
      <label class="l">Mteja (kwa pointi)<select id="bt-cust" class="f" onchange="PK.bt.cust=this.value;render()"><option value="">— mteja wa kawaida —</option>${opt(custs().map((x) => [x.id, x.name + (x.phone ? " · " + x.phone : "")]), BT.cust)}</select></label>
      ${c ? `<div class="row between sm"><span>⭐ Pointi <b>${n0(c.points || 0)}</b>${c.credit ? ` · Salio <b>${tzs(c.credit)}</b>` : ""}</span><button class="btn g s" onclick="PK.pack.custForm()">＋ mpya</button></div>` : `<button class="btn g s" style="justify-self:start" onclick="PK.pack.custForm()">＋ Sajili mteja mpya</button>`}
      ${BT.cart.length ? `<div class="cart">${BT.cart.map((l, i) => `<div class="cline"><span><b>${esc(l.name)}</b><br><small class="mu">${esc(l.size)} · ${esc(l.color)}${l.price < l.full ? " · punguzo" : ""}</small></span><div style="text-align:right"><b class="num">${n0(l.qty * l.price)}</b><div class="q"><button onclick="PK.pack.qty(${i},-1)">−</button><span class="num" style="min-width:20px;text-align:center">${l.qty}</span><button onclick="PK.pack.qty(${i},1)">＋</button></div></div></div>`).join("")}</div>` : `<p class="mu sm" style="margin:0">Bonyeza mtindo, kisha saizi na rangi.</p>`}
      ${BT.cart.length && c && (c.points || 0) >= 1 && ptsVal() ? `<label class="row sm"><input id="bt-use" type="checkbox" ${BT.usePts ? "checked" : ""} onchange="PK.bt.usePts=this.checked;render()"> Tumia pointi (${n0(c.points)} = ${tzs(c.points * ptsVal())})</label>` : ""}
      ${BT.cart.length && c && c.credit ? `<label class="row sm"><input id="bt-cr" type="checkbox" ${BT.useCr ? "checked" : ""} onchange="PK.bt.useCr=this.checked;render()"> Tumia salio la kubadilisha (${tzs(c.credit)})</label>` : ""}
      ${BT.cart.length && roleOk(["meneja"]) ? `<label class="l">Punguzo la ziada<input id="bt-disc" class="f" inputmode="numeric" value="${BT.disc || ""}" oninput="PK.bt.disc=num(this.value);soft()"></label>` : ""}
      ${(() => { const t = totals(); return `${t.off ? `<div class="row between sm"><span>Makato (pointi/salio/punguzo)</span><b class="num">−${n0(t.off)}</b></div>` : ""}<div class="total"><span>Jumla</span><span class="num">${n0(t.due)}</span></div>`; })()}
      <button class="btn p big" onclick="PK.pack.pay()" ${BT.cart.length ? "" : "disabled"}>💳 Lipa</button>
      ${BT.cart.length ? `<div class="mbar"><span>${BT.cart.reduce((a, l) => a + l.qty, 0)} vipande · <span class="num">${n0(totals().due)}</span></span><button class="btn p" onclick="PK.pack.pay()">💳 Lipa</button></div>` : ""}</div></div>`;
  }
  function totals() {
    const sub = BT.cart.reduce((a, l) => a + l.qty * l.price, 0), c = BT.cust && get(BT.cust), disc = Math.min(BT.disc || 0, sub);
    let left = sub - disc, pts = 0, cr = 0;
    if (c && BT.usePts && ptsVal()) { pts = Math.min(c.points || 0, Math.floor(left / ptsVal())); left -= pts * ptsVal(); }
    if (c && BT.useCr) { cr = Math.min(c.credit || 0, left); left -= cr; }
    return { sub, disc, pts, ptsMoney: pts * ptsVal(), cr, due: left, off: sub - left };
  }
  function qty(i, d) { const l = BT.cart[i], s = get(l.style); if (d > 0 && l.qty + 1 > qOf(s, l.size, l.color)) return toast("Hakuna zaidi"); l.qty += d; if (l.qty <= 0) BT.cart.splice(i, 1); render(); }
  function pay() {
    if (!BT.cart.length) return; const t = totals(), c = BT.cust && get(BT.cust);
    if (t.due <= 0) return finish(t, { method: "credit-store", paid: 0, change: 0, balance: 0 });
    checkout({ total: t.due, title: "Malipo" + (c ? " · " + c.name : ""), customer: c ? c.name : "", phone: c ? c.phone : "", onPay: (p) => finish(t, p) });
  }
  async function finish(t, p) {
    const lines = BT.cart.map((l) => ({ ...l })), c = BT.cust && get(BT.cust);
    BT.cart = []; BT.disc = 0; BT.usePts = false; BT.useCr = false;
    const no = await nextNo("sale"), earned = c ? Math.floor(t.due / ptsRate()) : 0;
    save({ id: newId("sale"), t: "sale", k: "tx", no, items: lines, sub: t.sub, discount: t.disc, ptsUsed: t.pts, ptsMoney: t.ptsMoney, creditUsed: t.cr, total: t.due, ...p, cust: c ? c.id : "", custName: c ? c.name : "", earned, seller: PK.user.name, time: Date.now() });
    lines.forEach((l) => bump(l.style, "v." + l.key, -l.qty));
    if (c) patch(c.id, { points: (c.points || 0) - t.pts + earned, credit: (c.credit || 0) - t.cr, spent: (c.spent || 0) + t.due, visits: (c.visits || 0) + 1, last: today() });
    BT.cust = "";
    receipt({ title: "RISITI", no, items: lines.map((l) => ({ name: `${l.name} (${l.size}/${l.color})`, qty: l.qty, price: l.price })), discount: t.disc + t.ptsMoney + t.cr, total: t.due, paid: p.paid, method: methodName(p.method), change: p.change, customer: c ? c.name : "", phone: c ? c.phone : "",
      notes: c ? [`⭐ Pointi: +${earned} (sasa ${(c.points || 0) - t.pts + earned})`].concat(t.cr ? ["Salio lililotumika: " + n0(t.cr)] : []) : [], });
  }
  function custForm(id) {
    const c = id ? get(id) : { name: "", phone: "", bday: "" };
    modal(`${mhead(id ? "Mteja" : "Mteja mpya")}<div class="form"><label class="l">Jina<input id="cu-n" class="f" value="${esc(c.name)}"></label><label class="l">Simu<input id="cu-p" class="f" inputmode="tel" value="${esc(c.phone || "")}"></label><label class="l">Siku ya kuzaliwa<input id="cu-b" class="f" type="date" value="${esc(c.bday || "")}"></label><label class="l">Saizi anazopenda<input id="cu-s" class="f" value="${esc(c.sizes || "")}" placeholder="mf. M, viatu 39"></label></div>
      ${id ? `<p class="sm" style="margin:0">⭐ ${n0(c.points || 0)} pointi · salio ${tzs(c.credit || 0)} · ametumia ${tzs(c.spent || 0)}</p>` : ""}<button class="btn p" onclick="PK.pack.custSave('${id || ""}')">Hifadhi</button>`);
  }
  function custSave(id) {
    const d = { name: val("cu-n"), phone: val("cu-p"), bday: val("cu-b"), sizes: val("cu-s") }; if (!d.name) return toast("Andika jina");
    if (!id && d.phone && custs().find((c) => c.phone === d.phone)) return toast("Simu hii imeshasajiliwa");
    if (id) patch(id, d); else { const nid = newId("cust"); save({ id: nid, t: "cust", ...d, points: 0, credit: 0, spent: 0, visits: 0, since: today() }); BT.cust = nid; }
    closeModal();
  }

  /* ---------- MAVAZI ---------- */
  function styleForm(id) {
    const s = id ? get(id) : { name: "", cat: "", brand: "", price: "", cost: "", sizes: SIZES.nguo.slice(1, 5), colors: ["Nyeusi"], disc: 0, color: "" };
    modal(`${mhead(id ? "Badilisha mtindo" : "Mtindo mpya")}<div class="form">
      <label class="l" style="grid-column:1/-1">Jina<input id="sf-n" class="f" value="${esc(s.name)}" placeholder="mf. Gauni la Ankara"></label>
      <label class="l">Kundi<input id="sf-c" class="f" list="sf-cl" value="${esc(s.cat || "")}"><datalist id="sf-cl">${["Magauni", "Mashati", "Suruali", "Sketi", "Viatu", "Mikoba", "Suti", "Watoto", "Vitenge"].map((x) => `<option value="${x}">`).join("")}</datalist></label>
      <label class="l">Brand<input id="sf-b" class="f" value="${esc(s.brand || "")}"></label>
      <label class="l">Bei<input id="sf-p" class="f" inputmode="numeric" value="${esc(s.price)}"></label><label class="l">Gharama<input id="sf-k" class="f" inputmode="numeric" value="${esc(s.cost || "")}"></label>
      <label class="l">Punguzo la msimu %<input id="sf-d" class="f" inputmode="numeric" value="${esc(s.disc || "")}" placeholder="0"></label><label class="l">Barcode/SKU<input id="sf-code" class="f" value="${esc(s.code || "")}"></label>
      <label class="l" style="grid-column:1/-1">Saizi (tenganisha kwa koma)<input id="sf-s" class="f" value="${esc((s.sizes || []).join(", "))}"></label>
      <div class="chips" style="grid-column:1/-1">${Object.entries(SIZES).map(([k, v]) => `<button class="chip" onclick="document.getElementById('sf-s').value='${v.join(", ")}'">${k}</button>`).join("")}</div>
      <label class="l" style="grid-column:1/-1">Rangi (tenganisha kwa koma)<input id="sf-r" class="f" value="${esc((s.colors || []).join(", "))}" placeholder="Nyeusi, Nyekundu, Bluu"></label></div>
      ${id ? "" : `<p class="mu xs" style="margin:0">Baada ya kuhifadhi utaweka idadi ya kila saizi × rangi.</p>`}
      <div class="row between">${id ? `<button class="btn d" onclick="${total(s) ? "toast('Ina stock — haiwezi kufutwa')" : `delDoc('${id}');closeModal()`}">Futa</button>` : "<span></span>"}<button class="btn p" onclick="PK.pack.styleSave('${id || ""}')">Hifadhi</button></div>`, true);
  }
  function styleSave(id) {
    const sp = (x) => x.split(",").map((y) => y.trim()).filter(Boolean);
    const d = { name: val("sf-n"), cat: val("sf-c"), brand: val("sf-b"), price: num(val("sf-p")), cost: num(val("sf-k")), disc: num(val("sf-d")), code: val("sf-code"), sizes: sp(val("sf-s")), colors: sp(val("sf-r")) };
    if (!d.name || !d.price) return toast("Andika jina na bei"); if (!d.sizes.length) d.sizes = ["Moja"]; if (!d.colors.length) d.colors = ["Moja"];
    if (id) { patch(id, d); closeModal(); } else { const nid = newId("style"); save({ id: nid, t: "style", ...d, v: {} }); stockForm(nid); }
  }
  function stockForm(id) {
    const s = get(id);
    modal(`${mhead("Stock · " + s.name)}<p class="mu sm" style="margin:0">Andika idadi <b>inayoongezwa</b> kwa kila saizi × rangi (mzigo mpya). Iliyopo inaonekana kwa kijivu.</p>
      <div class="tw"><table class="t"><thead><tr><th></th>${s.sizes.map((z) => `<th class="r">${esc(z)}</th>`).join("")}</tr></thead><tbody>${s.colors.map((c, ci) => `<tr><td><b>${esc(c)}</b></td>${s.sizes.map((z, zi) => `<td class="r"><input id="sq-${ci}-${zi}" class="f" style="width:58px;padding:6px;text-align:right" inputmode="numeric" placeholder="${qOf(s, z, c)}"></td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <label class="l">Gharama kwa kipande (mzigo huu)<input id="sq-cost" class="f" inputmode="numeric" value="${esc(s.cost || "")}"></label>
      <button class="btn p" onclick="PK.pack.stockSave('${id}')">✅ Ingiza stock</button>`, true);
  }
  function stockSave(id) {
    const s = get(id); let n = 0, cost = num(val("sq-cost")); const lines = [];
    s.colors.forEach((c, ci) => s.sizes.forEach((z, zi) => { const q = num(val(`sq-${ci}-${zi}`)); if (q) { bump(id, "v." + vk(z, c), q); n += q; lines.push({ size: z, color: c, q }); } }));
    if (n) { save({ id: newId("rcv"), t: "rcv", k: "tx", style: id, name: s.name, lines, qty: n, value: n * (cost || s.cost || 0) }); if (cost) patch(id, { cost }); }
    closeModal(); toast("✅ Vipande " + n + " vimeingizwa");
  }
  function pageMavazi() {
    const S2 = styles().filter((s) => match(s.name + " " + (s.cat || "") + " " + (s.brand || ""), PK.q));
    const pcs = styles().reduce((a, s) => a + total(s), 0), value = styles().reduce((a, s) => a + total(s) * (Number(s.cost) || 0), 0);
    return `<div class="kpis">${kpi("Mitindo", n0(styles().length))}${kpi("Vipande stoo", n0(pcs), true)}${kpi("Thamani (gharama)", tzs(value))}${kpi("Iko kwenye punguzo", n0(styles().filter((s) => s.disc).length))}</div>
      ${searchBox("Tafuta mtindo…")}
      ${S2.length ? `<div style="display:grid;gap:12px">${S2.map((s) => `<div class="card flat"><div class="row between"><span><b>${esc(s.name)}</b> <span class="mu sm">${esc(s.cat || "")} ${s.brand ? "· " + esc(s.brand) : ""}</span> ${s.disc ? `<span class="pill bd">-${s.disc}%</span>` : ""}</span><span class="row"><b class="num">${n0(priceOf(s))}</b><button class="btn s" onclick="PK.pack.stockForm('${s.id}')">＋ Stock</button><button class="btn s" onclick="PK.pack.styleForm('${s.id}')">✎</button></span></div>
        <div class="tw"><table class="t" style="font-size:13px"><thead><tr><th></th>${s.sizes.map((z) => `<th class="r">${esc(z)}</th>`).join("")}<th class="r">Jumla</th></tr></thead><tbody>${s.colors.map((c) => { const row = s.sizes.map((z) => qOf(s, z, c)); return `<tr><td>${esc(c)}</td>${row.map((q) => `<td class="r"><span class="${q <= 0 ? "mu" : q <= 1 ? "" : ""}" style="${q <= 0 ? "" : q <= 1 ? "color:#a86400;font-weight:800" : "font-weight:700"}">${q || "·"}</span></td>`).join("")}<td class="r num">${row.reduce((a, b) => a + b, 0)}</td></tr>`; }).join("")}</tbody></table></div></div>`).join("")}</div>` : empty("Ongeza mtindo wa kwanza (mf. gauni lenye saizi S–XL na rangi 3).")}`;
  }

  /* ---------- WATEJA ---------- */
  function pageWateja() {
    const C = custs().filter((c) => match(c.name + " " + (c.phone || ""), PK.q)).sort((a, b) => (b.spent || 0) - (a.spent || 0));
    const md = today().slice(5), bd = custs().filter((c) => c.bday && c.bday.slice(5) === md);
    return `<div class="kpis">${kpi("Wateja waliosajiliwa", n0(custs().length), true)}${kpi("Pointi zinazodaiwa", n0(custs().reduce((a, c) => a + (c.points || 0), 0)))}${kpi("Thamani ya pointi", tzs(custs().reduce((a, c) => a + (c.points || 0), 0) * ptsVal()))}${kpi("Salio la kubadilisha", tzs(custs().reduce((a, c) => a + (c.credit || 0), 0)))}</div>
      <p class="mu sm" style="margin:0">Kanuni: kila ${tzs(ptsRate())} = pointi 1 · pointi 1 = ${tzs(ptsVal())} (badilisha kwenye Mipangilio).</p>
      ${bd.length ? `<div class="card flat">🎂 Leo ni siku ya kuzaliwa ya ${bd.map((c) => `<b>${esc(c.name)}</b> ${c.phone ? `<a class="btn s" target="_blank" href="https://wa.me/${String(c.phone).replace(/\D/g, "").replace(/^0/, "255")}?text=${encodeURIComponent("Heri ya siku ya kuzaliwa " + c.name + "! 🎉 " + SHOP.name + " inakupa zawadi ya punguzo ukitutembelea wiki hii.")}">📲</a>` : ""}`).join(", ")}</div>` : ""}
      <div class="row between">${searchBox("Tafuta mteja…")}<button class="btn p s" onclick="PK.pack.custForm()">＋ Mteja</button></div>
      ${C.length ? `<div class="tw"><table class="t"><thead><tr><th>Mteja</th><th>Simu</th><th class="r">Pointi</th><th class="r">Salio</th><th class="r">Ametumia</th><th>Mwisho</th></tr></thead><tbody>${C.map((c) => `<tr class="click" onclick="PK.pack.custForm('${c.id}')"><td><b>${esc(c.name)}</b>${(c.spent || 0) >= 500000 ? ' <span class="pill ac">💎 VIP</span>' : ""}<br><small class="mu">${esc(c.sizes || "")}</small></td><td>${esc(c.phone || "")}</td><td class="r num">${n0(c.points || 0)}</td><td class="r num">${n0(c.credit || 0)}</td><td class="r num">${n0(c.spent || 0)}</td><td>${fdate(c.last)}</td></tr>`).join("")}</tbody></table></div>` : empty("Sajili wateja ili wapate pointi kila wanaponunua.")}`;
  }

  /* ---------- MAREJESHO / KUBADILISHA ---------- */
  function pageMarejesho() {
    const R = BT.ret && get(BT.ret), days = Number(S("retDays", 7)) || 7;
    const recent = txList("ret").sort((a, b) => b.at - a.at).slice(0, 15);
    return `<div class="card" style="max-width:720px"><h3>Rudisha au badilisha</h3><p class="mu sm" style="margin:0">Andika namba ya risiti. Mfumo unarudisha vipande stoo, kisha unachagua: kumrudishia pesa au kumpa salio (store credit) la kununua kingine. Muda wa kurudisha: siku ${days}.</p>
      <div class="row"><input id="rt-no" class="f" style="max-width:180px" inputmode="numeric" placeholder="Risiti #"><button class="btn p" onclick="PK.pack.findSale()">Tafuta</button></div>
      ${R ? (() => { const old = daysBetween(R.day, today()) > days, done = txList("ret", (x) => x.sale === R.id).flatMap((x) => x.items);
        return `<div class="row between"><b>Risiti #${R.no} · ${fdate(R.day)} · ${esc(R.custName || "mteja wa kawaida")}</b>${old ? `<span class="pill bd">imepita siku ${days}</span>` : ""}</div>
        <div class="tw"><table class="t"><tbody>${R.items.map((l, i) => { const back = done.filter((d) => d.key === l.key && d.style === l.style).reduce((a, d) => a + d.qty, 0), can = l.qty - back;
          return `<tr><td>${esc(l.name)} <small class="mu">${esc(l.size)}/${esc(l.color)}</small></td><td class="r num">${n0(l.price)}</td><td class="r">${can > 0 ? `<input id="rq-${i}" class="f" style="width:64px;padding:6px" inputmode="numeric" placeholder="0" max="${can}"> / ${can}` : '<span class="mu">imerudishwa</span>'}</td></tr>`; }).join("")}</tbody></table></div>
        <label class="l">Sababu<input id="rt-why" class="f" placeholder="mf. saizi haikumtosha, kasoro"></label>
        <div class="row">${R.cust ? `<button class="btn p" onclick="PK.pack.doReturn('credit')">💳 Mpe salio (exchange)</button>` : ""}<button class="btn ${R.cust ? "" : "p"}" onclick="PK.pack.doReturn('refund')">💵 Mrudishie pesa</button>${old && !roleOk(["meneja"]) ? `<span class="err sm">Meneja tu anaweza kupitisha muda.</span>` : ""}</div>`; })() : ""}</div>
      ${recent.length ? `<div class="card"><h3>Marejesho ya karibuni</h3><table class="t"><tbody>${recent.map((r) => `<tr><td>${fdate(r.day)}</td><td>Risiti #${r.no}</td><td>${r.items.map((i) => esc(i.name) + " ×" + i.qty).join(", ")}</td><td>${r.mode === "credit" ? '<span class="pill in">salio</span>' : '<span class="pill wn">pesa</span>'}</td><td class="r num">${n0(r.amount)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  }
  function findSale() { const n = num(val("rt-no")), s = txList("sale", (x) => Number(x.no) === n)[0]; if (!s) return toast("Risiti #" + n + " haikupatikana (siku 31 zilizopita)"); BT.ret = s.id; render(); }
  function doReturn(mode) {
    const R = get(BT.ret), days = Number(S("retDays", 7)) || 7; if (daysBetween(R.day, today()) > days && !roleOk(["meneja"])) return toast("Muda umepita — meneja tu");
    const items = R.items.map((l, i) => ({ ...l, qty: Math.min(num(val("rq-" + i)), l.qty) })).filter((l) => l.qty > 0); if (!items.length) return toast("Andika idadi ya kurudisha");
    const ratio = R.sub ? R.total / R.sub : 1, amount = Math.round(items.reduce((a, l) => a + l.qty * l.price, 0) * ratio);
    items.forEach((l) => bump(l.style, "v." + l.key, l.qty));
    save({ id: newId("ret"), t: "ret", k: "tx", sale: R.id, no: R.no, items, amount, mode, why: val("rt-why"), cust: R.cust, by: PK.user.name });
    if (mode === "credit" && R.cust && get(R.cust)) { const c = get(R.cust); patch(c.id, { credit: (c.credit || 0) + amount }); BT.cust = c.id; BT.useCr = true; toast("✅ Salio " + tzs(amount) + " limewekwa — chagua kipya kwenye Uza"); BT.ret = null; go("uza"); }
    else { toast("✅ Mrudishie " + tzs(amount)); BT.ret = null; render(); }
  }

  /* ---------- RIPOTI ---------- */
  function pageRipoti() {
    const R = txList("sale", (s) => inRange(s.day)), rets = txList("ret", (r) => inRange(r.day) && r.mode === "refund"), L = R.flatMap((s) => s.items);
    const net = R.reduce((a, s) => a + s.total + (s.creditUsed || 0), 0) - rets.reduce((a, r) => a + r.amount, 0), cost = L.reduce((a, l) => a + l.qty * (l.cost || 0), 0);
    const g = (kf) => groupSum(L, kf, (l) => l.qty).slice(0, 10);
    const tbl = (rows, unit) => `<table class="t"><tbody>${rows.map((x) => `<tr><td>${esc(x.key)}</td><td class="r num">${n0(x.value)} ${unit || ""}</td></tr>`).join("") || `<tr><td class="mu">—</td></tr>`}</tbody></table>`;
    const dead = styles().filter((s) => total(s) > 0 && !txList("sale").some((x) => x.items.some((l) => l.style === s.id))).slice(0, 10);
    return `<div class="row between">${rangeChips()}<button class="btn s" onclick="downloadCSV('mauzo-'+PK.range,[['Tarehe','Risiti','Mtindo','Saizi','Rangi','Idadi','Bei','Mteja']].concat(txList('sale',s=>inRange(s.day)).flatMap(s=>s.items.map(l=>[s.day,s.no,l.name,l.size,l.color,l.qty,l.price,s.custName]))))">⬇️ CSV</button></div>
      <div class="kpis">${kpi("Mauzo halisi", tzs(net), true)}${kpi("Faida ghafi", tzs(net - cost))}${kpi("Vipande vilivyouzwa", n0(L.reduce((a, l) => a + l.qty, 0)))}${kpi("Marejesho (pesa)", tzs(rets.reduce((a, r) => a + r.amount, 0)))}</div>
      <div class="card"><h3>Mauzo kwa siku (siku 14)</h3>${bars(dailySeries(txList("sale"), 14, (s) => s.total))}</div>
      <div class="grid2"><div class="card"><h3>Mitindo inayouzika</h3>${tbl(g((l) => l.name), "pcs")}<h3>Kwa kundi</h3>${tbl(groupSum(L, (l) => l.cat || "—", (l) => l.qty * l.price), "")}</div>
        <div class="card"><h3>Saizi zinazotoka zaidi</h3>${tbl(g((l) => l.size), "pcs")}<h3>Rangi zinazopendwa</h3>${tbl(g((l) => l.color), "pcs")}</div></div>
      ${dead.length ? `<div class="card"><h3>💤 Hazijauzika siku 31 (fikiria punguzo)</h3><div class="chips">${dead.map((s) => `<button class="chip" onclick="PK.pack.styleForm('${s.id}')">${esc(s.name)} · ${total(s)} pcs</button>`).join("")}</div></div>` : ""}`;
  }

  registerPack({
    id: "boutique", name: "Boutique", theme: "waridi", home: "uza",
    money: (inR) => { const R = txList("sale", (s) => inR(s.day)), ret = txList("ret", (r) => inR(r.day) && r.mode === "refund"); return { rev: R.reduce((a, s) => a + s.total + (s.creditUsed || 0), 0) - ret.reduce((a, r) => a + r.amount, 0), cost: R.reduce((a, s) => a + s.items.reduce((b, l) => b + l.qty * (l.cost || 0), 0), 0) }; },
    roles: [["meneja", "Meneja"], ["muuzaji", "Muuzaji"]],
    pages: [
      { id: "uza", label: "Uza", icon: "🛍️", roles: ["meneja", "muuzaji"], render: pageUza },
      { id: "mavazi", label: "Mavazi", icon: "👗", roles: ["meneja", "muuzaji"], render: pageMavazi, actions: () => roleOk(["meneja"]) ? `<button class="btn p s" onclick="PK.pack.styleForm()">＋ Mtindo</button>` : "" },
      { id: "wateja", label: "Wateja", icon: "⭐", roles: ["meneja", "muuzaji"], render: pageWateja },
      { id: "marejesho", label: "Marejesho", icon: "🔁", roles: ["meneja", "muuzaji"], render: pageMarejesho },
      { id: "ripoti", label: "Ripoti", icon: "📊", roles: ["meneja"], render: pageRipoti },
    ],
    settings: [{ key: "ptsPer", label: "Pointi 1 kwa kila (TSh)", type: "number", def: 1000 }, { key: "ptsVal", label: "Thamani ya pointi 1 (TSh)", type: "number", def: 10 }, { key: "retDays", label: "Siku za kurudisha bidhaa", type: "number", def: 7 }],
    onScan: (code) => { const s = styles().find((x) => x.code && x.code === code); if (!s) return toast("SKU haijasajiliwa"); if (PK.page !== "uza") go("uza"); pick(s.id); },
    pick, addV: (id, z, c) => addLine(get(id), z, c), qty, pay, custForm, custSave, styleForm, styleSave, stockForm, stockSave, findSale, doReturn,
  });
})();
