/* VIPENGELE VYA HIARI — vimeletwa kutoka mfumo wa Wadai (E.E.MSANGO), 2026-11-16.
   Kila kimoja kinafanya kazi tu kwa duka lililowashiwa kipengele chake kwenye Kiwanda (optF). */

function optF(k) { return typeof has === "function" && has(k); }

/* ---------- 📁 MAUZO KWA FOLDA (kipengele "mauzoFolda") ---------- */
function renderSalesFolders() {
  if (!UI.salesStore) UI.salesStore = "dukani";
  if (!UI.salesView) UI.salesView = "day";
  if (!UI.saleForm) UI.saleForm = { store: UI.salesStore, customer: "", date: todayStr(), _day: todayStr(), rows: [{ id: uid(), itemName: "", price: "", qty: "" }] };
  const f = UI.saleForm;
  // Fomu iliyofunguliwa jana (tablet iliachwa wazi usiku, au rasimu iliyorudishwa) isiandike mauzo ya leo kwa tarehe ya jana —
  // hiyo ndiyo ilikuwa inafanya mauzo mapya kuingia kwenye faili la zamani la mteja.
  if (f._day !== todayStr()) { f.date = todayStr(); f._day = todayStr(); }
  const grandTotal = f.rows.reduce((s, r) => s + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);
  const salesInStore = STATE.sales.filter((s) => (s.store || "dukani") === UI.salesStore && !s.archived);
  const salesByDay = {};
  salesInStore.forEach((s) => { (salesByDay[s.date] = salesByDay[s.date] || []).push(s); });
  const days = Object.keys(salesByDay).sort((a, b) => (a < b ? 1 : -1));
  const salesByCustomer = {};
  salesInStore.forEach((s) => { const c = s.customer && s.customer.trim() ? s.customer.trim() : "Walk-in Customer"; (salesByCustomer[c] = salesByCustomer[c] || []).push(s); });
  const custQ = (UI.custSearch || "").trim().toLowerCase();
  // mteja aliyeuziwa karibuni anakaa juu (orodha inaonyesha 25 kwanza — mteja mpya asifichwe chini)
  const lastAt = (c) => salesByCustomer[c].reduce((m, x) => Math.max(m, x.createdAt || Date.parse((x.date || "1970-01-01") + "T12:00:00")), 0);
  const customers = Object.keys(salesByCustomer).filter((c) => !custQ || c.toLowerCase().includes(custQ)).sort((a, b) => lastAt(b) - lastAt(a) || a.localeCompare(b));

  return `
  <div class="mode-toggle" style="max-width:320px">
    <button class="mode-btn ${UI.salesStore === "dukani" ? "active" : ""}" onclick="setSalesStore('dukani')">🏪 Dukani</button>
    <button class="mode-btn ${UI.salesStore === "godown" ? "active" : ""}" onclick="setSalesStore('godown')">🏭 Godown</button>
  </div>

  <div class="panel" style="margin-top:12px">
    <h3>➕ Record a Sale — ${UI.salesStore === "godown" ? "Godown" : "Dukani"}</h3>
    <input id="sl-customer" class="field" placeholder="Customer name (optional)" value="${esc(f.customer)}" oninput="setSaleField('customer',this.value)">
    <label class="due-label">📅 Date of sale</label>
    <input id="sl-date" class="field" type="date" value="${esc(f.date)}" oninput="setSaleField('date',this.value)">
    <div class="pick-box">
      <input id="sp-q" class="field" type="search" autocomplete="off" placeholder="🔍 Search item… (tap a box to add it)" value="${esc((UI.salePick || {}).q || "")}" oninput="(UI.salePick || (UI.salePick = { q: '', cat: 'All' })).q = this.value; refreshSalePick()">
      <div class="pick-chips">${["All", ...[...new Set(salePickItems(f).all.map((it) => it.category || "Other"))].sort()].map((c) => `<button type="button" class="chip-btn ${((UI.salePick || {}).cat || "All") === c ? "active" : ""}" onclick="setSalePickCat('${esc(c)}')">${esc(c)}</button>`).join("")}</div>
      <div class="pick-grid" id="sp-grid">${salePickTiles(f)}</div>
    </div>
    <div class="items-block" style="margin-top:10px">
      <div class="item-row item-row-head" style="grid-template-columns:1.4fr .9fr .6fr .9fr auto">
        <span>Item</span><span>Price</span><span>Qty</span><span>Total</span><span></span>
      </div>
      ${f.rows.map((r) => {
        const lineTotal = (Number(r.price) || 0) * (Number(r.qty) || 0);
        return `
        <div class="item-row" style="grid-template-columns:1.4fr .9fr .6fr .9fr auto">
          <input list="product-datalist" id="slr-name-${r.id}" class="field field-sm" placeholder="Type item name" value="${esc(r.itemName)}" oninput="setSaleRow('${r.id}','itemName',this.value)" onchange="onSaleItemChange('${r.id}')">
          <input id="slr-price-${r.id}" class="field field-sm" type="text" inputmode="decimal" placeholder="Selling price" value="${esc(r.price)}" oninput="this.value=sanitizeNum(this.value);setSaleRow('${r.id}','price',this.value)">
          <input id="slr-qty-${r.id}" class="field field-sm" type="text" inputmode="numeric" placeholder="Qty" value="${esc(r.qty)}" oninput="this.value=sanitizeNum(this.value);setSaleRow('${r.id}','qty',this.value)">
          <span class="item-line-total" id="lt-${r.id}">${fmt(lineTotal)}</span>
          ${f.rows.length > 1 ? `<button class="icon-btn" onclick="removeSaleRow('${r.id}')">🗑️</button>` : `<span></span>`}
        </div>
        <div id="slh-${r.id}" style="font-size:10.5px;color:#8290a4;margin:-4px 0 6px 2px">${saleRowHint(f, r)}</div>`;
      }).join("")}
      <button class="add-row-btn" onclick="addSaleRow()">＋ Add Item</button>
      <div class="grand-total-row"><span>Grand Total</span><span id="gt-sale">${fmt(grandTotal)}</span></div>
    </div>
    ${UI.saleMsg ? `<p class="settings-msg ${UI.saleMsg.ok ? "ok" : "err"}">${esc(UI.saleMsg.text)}</p>` : ""}
    <button class="btn btn-primary" style="margin-top:10px" onclick="submitSale()">Record Sale</button>
  </div>

  <div class="panel" style="margin-top:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px">
      <h3 style="margin:0">Sales — ${UI.salesStore === "godown" ? "Godown" : "Dukani"}</h3>
      <div class="mode-toggle" style="max-width:220px;margin:0">
        <button class="mode-btn ${UI.salesView === "day" ? "active" : ""}" onclick="UI.salesView='day';rerender();">📅 By Day</button>
        <button class="mode-btn ${UI.salesView === "customer" ? "active" : ""}" onclick="UI.salesView='customer';rerender();">👤 By Customer</button>
      </div>
    </div>
    ${UI.salesView === "customer" ? `<input id="cust-search-input" type="search" autocomplete="off" class="field field-sm" style="max-width:280px;margin-bottom:12px" placeholder="🔍 Tafuta mteja…" value="${esc(UI.custSearch || "")}" oninput="UI.custSearch=this.value;softRerender();">` : ""}
    ${(UI.salesView === "day" ? (
      days.length === 0 ? `<p class="empty-note">No sales recorded yet.</p>` : (window.__files = [], days.slice(0, UI.salesDaysShown || 10).map((day, dn) => {
        const list = salesByDay[day];
        // FOLDA YA SIKU: wateja wote wa tarehe hii, kila mteja faili lake
        const byC = {}; list.forEach((x) => { const c = fileCust(x) || "Walk-in Customer"; (byC[c] = byC[c] || []).push(x); });
        const cs = Object.keys(byC).sort((a, b) => Math.max(...byC[b].map((x) => x.createdAt || 0)) - Math.max(...byC[a].map((x) => x.createdAt || 0)));
        const di = window.__files.push({ date: day, store: UI.salesStore, first: dn === 0 }) - 1;
        const dkey = "D|" + day, dopen = UI.fileOpen && dkey in UI.fileOpen ? UI.fileOpen[dkey] : dn === 0;
        return `
        <div style="border:1px solid var(--line);border-radius:8px;margin-bottom:10px;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;background:var(--paper-alt);cursor:pointer" onclick="toggleSaleFile(${di},'D')">
            <strong style="font-size:13.5px">${dopen ? "▾" : "▸"} 🗂️ ${esc(rcDate(day))} <span style="font-weight:400;color:#8290a4">· wateja ${cs.length} · bidhaa ${list.length}</span></strong>
            <span style="display:flex;align-items:center;gap:6px" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-primary" onclick="pdfSaleFile(${di})">📄 PDF ya siku</button>
              <button class="btn btn-sm btn-ghost" style="color:#b91c1c" onclick="deleteSaleFile(${di})">🗑️ Futa siku nzima</button>
            </span>
          </div>
          ${dopen ? cs.map((c) => {
            const fl = byC[c], i = window.__files.push({ cust: c, date: day, store: UI.salesStore, first: false }) - 1;
            const key = c + "|" + day, open = UI.fileOpen && key in UI.fileOpen ? UI.fileOpen[key] : false;
            return `<div style="border-top:1px solid var(--line)">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px 8px 24px;cursor:pointer" onclick="toggleSaleFile(${i})">
                <span style="font-size:13px">${open ? "▾" : "▸"} 📁 👤 <b>${esc(c)}</b> <span style="color:#8290a4">· bidhaa ${fl.length}</span></span>
                <span style="display:flex;align-items:center;gap:6px" onclick="event.stopPropagation()">
                  <b style="color:var(--green);margin-right:4px">${fmt(fl.reduce((a, x) => a + x.total, 0))}</b>
                  <button class="btn btn-sm btn-ghost" onclick="printSaleFile(${i})">🖨️ Print</button>
                  <button class="btn btn-sm btn-ghost" onclick="pdfSaleFile(${i})">📄 PDF</button>
                  <button class="btn btn-sm btn-ghost" style="color:#b91c1c" onclick="deleteSaleFile(${i})">🗑️</button>
                </span>
              </div>
              ${open ? `<table class="recent-table"><tbody>${fl.map((x) => renderSaleRow(x)).join("")}</tbody></table>` : ""}
            </div>`;
          }).join("") : ""}
        </div>`;
      }).join("")) + (days.length > (UI.salesDaysShown || 10) ? `<button class="btn btn-ghost" style="width:100%;margin-top:4px" onclick="UI.salesDaysShown=(UI.salesDaysShown||10)+10;rerender();">⬇️ Onyesha siku 10 zaidi (${days.length - (UI.salesDaysShown || 10)} zimebaki)</button>` : "")
    ) : (
      customers.length === 0 ? `<p class="empty-note">${custQ ? "Hakuna mteja anayelingana na \"" + esc(UI.custSearch) + "\"." : "No sales recorded yet."}</p>` : (window.__files = [], customers.slice(0, UI.custShown || 25).map((cust) => {
        const list = salesByCustomer[cust];
        // FAILI: kila siku ya mauzo ni faili lake — mauzo ya juzi hayachanganyiki na ya leo
        const byDay = {}; list.forEach((x) => (byDay[x.date || ""] = byDay[x.date || ""] || []).push(x));
        const fdays = Object.keys(byDay).sort((a, b) => (a < b ? 1 : -1));
        return `
        <div style="border:1px solid var(--line);border-radius:8px;margin-bottom:10px;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--paper-alt)">
            <strong style="font-size:13px">👤 ${esc(cust)} <span style="font-weight:400;color:#8290a4">(faili ${fdays.length})</span></strong>
          </div>
          ${fdays.map((d, n) => {
            const fl = byDay[d], i = window.__files.push({ cust, store: UI.salesStore, date: d, first: n === 0 }) - 1;
            const key = cust + "|" + d, open = UI.fileOpen && key in UI.fileOpen ? UI.fileOpen[key] : n === 0;
            return `<div style="border-top:1px solid var(--line)">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;cursor:pointer" onclick="toggleSaleFile(${i})">
                <span style="font-size:13px">${open ? "▾" : "▸"} 📁 <b>${esc(rcDate(d))}</b> <span style="color:#8290a4">· bidhaa ${fl.length}</span></span>
                <span style="display:flex;align-items:center;gap:6px" onclick="event.stopPropagation()">
                  <button class="btn btn-sm btn-ghost" onclick="printSaleFile(${i})">🖨️ Print</button>
                  <button class="btn btn-sm btn-primary" onclick="pdfSaleFile(${i})">📄 PDF</button>
                  <button class="btn btn-sm btn-ghost" style="color:#b91c1c" onclick="deleteSaleFile(${i})">🗑️ Futa faili</button>
                </span>
              </div>
              ${open ? `<table class="recent-table"><tbody>${fl.map((x) => renderSaleRow(x)).join("")}</tbody></table>` : ""}
            </div>`;
          }).join("")}
        </div>`;
      }).join("") + (customers.length > (UI.custShown || 25) ? `<button class="btn btn-ghost" style="width:100%;margin-top:4px" onclick="UI.custShown=(UI.custShown||25)+25;rerender();">⬇️ Onyesha wateja 25 zaidi (${customers.length - (UI.custShown || 25)} wamebaki) — au tafuta jina juu</button>` : ""))
    )) + (optF("futaKabisa") ? oldDeletedNote() : deletedFilesBlock())}
  </div>`;
}

/* ---------- FAILI ZA MAUZO (owner's request, 2026-11-03) ----------
   Kwenye "By Customer", mauzo ya mteja yanakaa kwenye faili moja kwa kila siku (tarehe ya mauzo).
   Kila faili lina Print, PDF na "Futa faili". Kufuta faili kunaliondoa kwenye orodha ya Sales tu:
   rekodi zinabaki (ripoti na faida haziharibiki) na stock haiguswi; linaweza kurudishwa. */
const fileCust = (s) => (s.customer && s.customer.trim() ? s.customer.trim() : "");
function saleFileList(f, deleted) {
  const target = f.cust === "Walk-in Customer" ? "" : f.cust;
  return STATE.sales.filter((s) => (s.store || "dukani") === f.store && (s.date || "") === f.date && (f.cust == null || fileCust(s) === target) && (deleted ? s.archived && s.fileDeleted : !s.archived));
}
function toggleSaleFile(i, kind) {
  const f = (window.__files || [])[i]; if (!f) return;
  const key = kind === "D" ? "D|" + f.date : f.cust + "|" + f.date; UI.fileOpen = UI.fileOpen || {};
  UI.fileOpen[key] = !(key in UI.fileOpen ? UI.fileOpen[key] : f.first); rerender();
}
function printSaleFile(i) {
  const f = (window.__files || [])[i]; if (!f) return;
  const items = saleFileList(f, f.deleted); if (!items.length) return;
  UI.customerReceipt = { customer: f.cust, store: f.store, items }; rerender();
}
async function pdfSaleFile(i) {
  const f = (window.__files || [])[i]; if (!f) return;
  const items = saleFileList(f, f.deleted); if (!items.length) return;
  try {
    await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
  } catch (e) { alert("Imeshindikana kupakua PDF — angalia internet kisha jaribu tena."); return; }
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const sh = rcShop(), tz = (n) => _NF0.format(Math.round(n));
  const whole = f.cust == null, total = items.reduce((a, x) => a + x.total, 0);
  doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.text(sh.name || "", 105, 18, { align: "center" }); doc.setFont(undefined, "normal");
  doc.setFontSize(9.5); let y = 24;
  [sh.line, sh.phone ? "Simu: " + sh.phone : "", sh.address].filter(Boolean).forEach((t) => { doc.text(t, 105, y, { align: "center" }); y += 5; });
  doc.setDrawColor(200); doc.line(14, y, 196, y); y += 8;
  doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.text(whole ? "MAUZO YA SIKU" : "ANKARA YA MAUZO", 14, y); doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.text(whole ? "Wateja: " + new Set(items.map((x) => fileCust(x) || "Walk-in Customer")).size + "   |   Jumla: TSh " + tz(total) : "Mteja: " + f.cust, 14, y + 7);
  doc.text("Tarehe: " + rcDate(f.date), 196, y + 7, { align: "right" });
  doc.text((f.store === "godown" ? "Godown" : "Dukani"), 196, y + 13, { align: "right" });
  const head = { fillColor: [15, 31, 61], textColor: 255, fontStyle: "bold" }, foot = { fillColor: [235, 239, 245], textColor: 20, fontStyle: "bold" };
  const table = (startY, list, label) => doc.autoTable({ startY, theme: "grid", headStyles: head, footStyles: foot,
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    didParseCell: (d) => { if ((d.section === "head" || d.section === "foot") && d.column.index >= 2) d.cell.styles.halign = "right"; },
    head: [["#", "Bidhaa", "Idadi", "Bei (TSh)", "Jumla (TSh)"]],
    body: list.map((x, n) => [n + 1, x.itemName, x.qty, tz(x.sellPrice), tz(x.total)]),
    foot: [["", label, list.reduce((a, x) => a + x.qty, 0), "", "TSh " + tz(list.reduce((a, x) => a + x.total, 0))]] });
  const below = (g) => (doc.lastAutoTable ? doc.lastAutoTable.finalY : 60) + g;
  if (!whole) table(y + 18, items, "JUMLA");
  else {
    const byC = {}; items.forEach((x) => { const c = fileCust(x) || "Walk-in Customer"; (byC[c] = byC[c] || []).push(x); });
    let cy = y + 20;
    Object.keys(byC).sort((p, q) => p.localeCompare(q)).forEach((c) => {
      if (cy > 265) { doc.addPage(); cy = 18; }
      doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.text("Mteja: " + c, 14, cy); doc.setFont(undefined, "normal");
      table(cy + 2, byC[c], "Jumla ya " + c); cy = below(10);
    });
    if (cy > 275) { doc.addPage(); cy = 18; }
    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.text("JUMLA YA SIKU: TSh " + tz(total), 196, cy, { align: "right" }); doc.setFont(undefined, "normal");
  }
  let fy = below(whole ? 18 : 10); if (fy > 285) { doc.addPage(); fy = 18; }
  doc.setFontSize(9); doc.setTextColor(110); doc.text("Imetolewa: " + new Date().toLocaleString("en-GB"), 14, fy); doc.setTextColor(0);
  const n = doc.getNumberOfPages(); for (let k = 1; k <= n; k++) { doc.setPage(k); doc.setFontSize(8); doc.setTextColor(150); doc.text("Ukurasa " + k + " / " + n, 196, 290, { align: "right" }); doc.setTextColor(0); }
  const safe = whole ? "Siku" : (f.cust.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Mteja");
  doc.save("Mauzo-" + safe + "-" + f.date + ".pdf");
}
/* ---------- KUFUTA KABISA (owner's request, 2026-11-05) ----------
   Mauzo ya wateja yakifutwa kwenye Sales au Reports yanaondoka KABISA: hakuna "Rudisha", hakuna History,
   hayaonekani kwenye ripoti, PDF wala dashboard. Stock HAIRUDI (bidhaa zilishauzwa) — kwa hiyo harakati
   ya stock inabaki ikiwa imefichwa, na kwa mauzo ya POS inabaki itemId/qty tu (bila mteja, bei wala jina). */
function confirmPermanent(what) {
  const v = prompt(`FUTA KABISA ${what}?\n\nHayatarudi tena na hayataonekana popote (Sales, Reports, History, PDF).\nStock haitarudi.\n\nAndika FUTA kuthibitisha:`);
  return v != null && v.trim().toUpperCase() === "FUTA";
}
function purgeSalesForever(lines) {
  const ids = new Set(), posIds = new Set();
  lines.forEach((x) => { if (x.pos) posIds.add(String(x.id).split("#")[0]); else ids.add(x.id); });
  if (ids.size) {
    const mv = new Set(STATE.sales.filter((x) => ids.has(x.id) && x.movementId).map((x) => x.movementId));
    if (mv.size) { STATE.stockMovements = STATE.stockMovements.map((m) => (mv.has(m.id) ? { ...m, hidden: true } : m)); saveStockMovements(); }
    STATE.sales = STATE.sales.filter((x) => !ids.has(x.id));
    saveSales();
  }
  posIds.forEach((id) => {
    const ps = (STATE.posSales || []).find((x) => x.id === id); if (!ps || !colRef) return;
    // inabaki itemId + qty tu ili stock isirudi; taarifa zote za mteja na mauzo zinaondoka
    colRef.doc("possale_" + id).set({ id, store: ps.store || "dukani", date: ps.date || "", createdAt: ps.createdAt || 0, deleted: true, purged: true,
      items: (ps.items || []).map((i) => ({ itemId: i.itemId, qty: Number(i.qty) || 0 })) }).catch(onSaveError);
  });
}
function deleteSaleFile(i) {
  const f = (window.__files || [])[i]; if (!f) return;
  const list = saleFileList(f); if (!list.length) return;
  const what = f.cust == null ? `mauzo YOTE ya siku ${rcDate(f.date)} (wateja ${new Set(list.map((x) => fileCust(x))).size}, bidhaa ${list.length})` : `faili la ${f.cust} la ${rcDate(f.date)} (bidhaa ${list.length})`;
  if (!optF("futaKabisa")) {   // bila "futaKabisa": faili linafichwa tu na linaweza kurudishwa (🗑️ Faili zilizofutwa)
    if (!confirm("Futa " + what + "?\n\nStock haiguswi. Unaweza kulirudisha kutoka 🗑️ Faili zilizofutwa.")) return;
    const ids = new Set(list.map((x) => x.id)), at = Date.now();
    STATE.sales = STATE.sales.map((s) => (ids.has(s.id) ? { ...s, archived: true, archivedDate: todayStr(), fileDeleted: true, fileDeletedAt: at } : s));
    saveSales(); return rerender();
  }
  if (!confirmPermanent(what)) return;
  purgeSalesForever(list); rerender();
}
function restoreSaleFile(i) {
  const f = (window.__dfiles || [])[i]; if (!f) return;
  const ids = new Set(saleFileList(f, true).map((x) => x.id));
  STATE.sales = STATE.sales.map((s) => { if (!ids.has(s.id)) return s; const c = { ...s }; delete c.archived; delete c.archivedDate; delete c.fileDeleted; delete c.fileDeletedAt; return c; });
  saveSales(); rerender();
}
// faili zilizofutwa zamani (kabla ya kufuta-kabisa) — kitufe kimoja cha kuzifuta kabisa, hakuna kurudisha
function oldDeletedNote() {
  const del = STATE.sales.filter((s) => s.archived && s.fileDeleted);
  if (!del.length) return "";
  return `<div style="margin-top:12px;font-size:12.5px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="color:#8290a4">Kuna faili ${new Set(del.map((s) => (s.date || "") + "|" + fileCust(s))).size} zilizofutwa zamani bado zimehifadhiwa.</span>
    <button class="btn btn-sm btn-ghost" style="color:#b91c1c" onclick="purgeOldDeleted()">🗑️ Zifute kabisa</button></div>`;
}
function purgeOldDeleted() {
  const del = STATE.sales.filter((s) => s.archived && s.fileDeleted);
  if (!del.length || !confirmPermanent(`faili zote ${del.length} zilizofutwa zamani`)) return;
  purgeSalesForever(del); rerender();
}
function deletedFilesBlock() {
  const del = STATE.sales.filter((s) => (s.store || "dukani") === UI.salesStore && s.archived && s.fileDeleted);
  if (!del.length) return "";
  const g = {}; del.forEach((s) => { const d = s.date || ""; const c = fileCust(s) || "Walk-in Customer"; ((g[d] = g[d] || {})[c] = g[d][c] || []).push(s); });
  const days = Object.keys(g).sort((a, b) => (a < b ? 1 : -1));
  window.__dfiles = [];
  const nFiles = days.reduce((a, d) => a + Object.keys(g[d]).length, 0);
  return `<div style="margin-top:12px"><button class="btn btn-sm btn-ghost" onclick="UI.showDelFiles=!UI.showDelFiles;rerender();">🗑️ Faili zilizofutwa (${nFiles}) ${UI.showDelFiles ? "▾" : "▸"}</button>
    ${UI.showDelFiles ? days.slice(0, 30).map((d) => { const di = window.__dfiles.push({ date: d, store: UI.salesStore, deleted: true }) - 1;
      return `<div style="border:1px solid var(--line);border-radius:8px;margin-top:8px;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;background:var(--paper-alt);font-size:13px"><b>🗂️ ${esc(rcDate(d))}</b>
          <button class="btn btn-sm btn-primary" onclick="restoreSaleFile(${di})">↩️ Rudisha siku nzima</button></div>
        ${Object.keys(g[d]).map((c) => { const i = window.__dfiles.push({ cust: c, date: d, store: UI.salesStore, deleted: true }) - 1; const t = g[d][c].reduce((a, x) => a + x.total, 0);
          return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 10px 7px 22px;border-top:1px solid var(--line);font-size:13px">
          <span>📁 ${esc(c)} <span style="color:#8290a4">· bidhaa ${g[d][c].length} · ${fmt(t)}</span></span>
          <button class="btn btn-sm btn-ghost" onclick="restoreSaleFile(${i})">↩️ Rudisha</button></div>`; }).join("")}</div>`; }).join("") : ""}</div>`;
}

/* ---------- RIPOTI KWA SIKU: folda ya kila tarehe -> faili la kila mteja, na FAIDA/HASARA (owner's request, 2026-11-03)
   Kila siku: mauzo, gharama ya bidhaa, faida ghafi, matumizi ya siku na faida halisi. Kila mteja: mauzo na faida yake.
   PDF ya siku nzima au ya mteja mmoja (na faida). "Hamishia History" kwa siku nzima au mteja mmoja wa siku hiyo. */
function plDayFolders(sales, effBuy, showHist) {
  window.__rpf = [];
  if (!sales.length) return `<p class="empty-note">${showHist ? "Hakuna kitu kwenye History kwa kipindi hiki." : "Hakuna mauzo kwenye kipindi hiki."}</p>`;
  const byD = {}; sales.forEach((x) => (byD[x.date] = byD[x.date] || []).push(x));
  const days = Object.keys(byD).sort((a, b) => (a < b ? 1 : -1));
  const money = (n) => `<span style="font-weight:700;color:${n >= 0 ? "var(--green)" : "#dc2636"}">${n < 0 ? "−" : ""}${fmt(Math.abs(n))}</span>`;
  const sum = (l, f) => l.reduce((a, x) => a + f(x), 0);
  window.__rpf = [];
  let tT = 0, tP = 0, tE = 0;
  const html = days.map((d, dn) => {
    const list = byD[d], rev = sum(list, (x) => x.total), pr = sum(list, repProfit), exp = showHist ? 0 : expensesIn(d, d).reduce((a, x) => a + x.amount, 0);
    tT += rev; tP += pr; tE += exp;
    const byC = {}; list.forEach((x) => (byC[repCust(x)] = byC[repCust(x)] || []).push(x));
    const cs = Object.keys(byC).sort((a, b) => sum(byC[b], (x) => x.total) - sum(byC[a], (x) => x.total));
    const di = window.__rpf.push({ date: d }) - 1, dkey = "RD|" + d;
    const dopen = UI.rpOpen && dkey in UI.rpOpen ? UI.rpOpen[dkey] : dn === 0;
    const unknown = list.some((x) => effBuy(x) == null);
    return `<div style="border:1px solid var(--line);border-radius:8px;margin-bottom:10px;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;background:var(--paper-alt);cursor:pointer" onclick="toggleRepFolder(${di},'D',${dn === 0})">
        <strong style="font-size:13.5px">${dopen ? "▾" : "▸"} 🗂️ ${esc(rcDate(d))} <span style="font-weight:400;color:#8290a4">· wateja ${cs.length} · bidhaa ${list.length}</span></strong>
        <span class="no-print" style="display:flex;gap:6px" onclick="event.stopPropagation()">
          <button class="btn btn-sm btn-primary" onclick="pdfRepFolder(${di})">📄 PDF ya siku</button>
          ${repFolderBtn(di, showHist, false)}
        </span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;padding:8px 12px;font-size:12px;border-top:1px solid var(--line)">
        <div>Mauzo<br><b>${fmt(rev)}</b></div><div>Gharama ya bidhaa<br><b>${fmt(rev - pr)}</b></div><div>Faida ghafi<br>${money(pr)}${unknown ? `<span title="Baadhi ya bidhaa hazina bei ya kununulia" style="color:#b8862f"> *</span>` : ""}</div>
        ${showHist ? "" : `<div>Matumizi<br><b>${fmt(exp)}</b></div><div>${pr - exp >= 0 ? "Faida halisi" : "Hasara halisi"}<br>${money(pr - exp)}</div>`}
      </div>
      ${dopen ? cs.map((c) => {
        const fl = byC[c], i = window.__rpf.push({ date: d, cust: c }) - 1, key = c + "|" + d;
        const open = UI.rpOpen && key in UI.rpOpen ? UI.rpOpen[key] : false;
        return `<div style="border-top:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px 8px 24px;cursor:pointer" onclick="toggleRepFolder(${i},'C',false)">
            <span style="font-size:13px">${open ? "▾" : "▸"} 📁 👤 <b>${esc(c)}</b> <span style="color:#8290a4">· bidhaa ${fl.length}</span></span>
            <span style="display:flex;align-items:center;gap:8px;font-size:12.5px" onclick="event.stopPropagation()">
              <span>Mauzo <b>${fmt(sum(fl, (x) => x.total))}</b></span><span>Faida ${money(sum(fl, repProfit))}</span>
              <button class="btn btn-sm btn-ghost no-print" onclick="pdfRepFolder(${i})">📄 PDF</button>
              ${repFolderBtn(i, showHist, true)}
            </span>
          </div>
          ${open ? `<table class="recent-table" style="width:100%;font-size:12px"><thead><tr><th style="text-align:left;padding:5px 6px 5px 24px;color:#8290a4">Bidhaa</th><th style="text-align:right;padding:5px 6px;color:#8290a4">Idadi × Bei</th><th style="text-align:right;padding:5px 6px;color:#8290a4">Bei ya kununua</th><th style="text-align:right;padding:5px 6px;color:#8290a4">Jumla</th><th style="text-align:right;padding:5px 6px;color:#8290a4">Faida</th></tr></thead><tbody>
            ${fl.map((x) => { const b = effBuy(x); return `<tr style="background:var(--paper-alt,#f6f8fb)"><td style="padding:5px 6px 5px 24px">${esc(x.itemName)}${x.pos ? ` <span style="color:#8290a4">· POS</span>` : ""}</td><td style="padding:5px 6px;text-align:right">${x.qty} × ${fmt(x.sellPrice)}</td><td style="padding:5px 6px;text-align:right">${b != null ? fmt(b) : "—"}</td><td style="padding:5px 6px;text-align:right">${fmt(x.total)}</td><td style="padding:5px 6px;text-align:right">${b != null ? money((x.sellPrice - b) * x.qty) : `${money(x.total)}<span style="color:#b8862f"> *</span>`}</td></tr>`; }).join("")}
          </tbody></table>` : ""}
        </div>`;
      }).join("") : ""}
    </div>`;
  }).join("");
  return html + `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;padding:10px 12px;border:2px solid var(--line);border-radius:8px;font-size:12.5px">
    <div>JUMLA ya mauzo<br><b>${fmt(tT)}</b></div><div>Gharama ya bidhaa<br><b>${fmt(tT - tP)}</b></div><div>Faida ghafi<br>${money(tP)}</div>${showHist ? "" : `<div>Matumizi (siku zenye mauzo)<br><b>${fmt(tE)}</b></div><div>${tP - tE >= 0 ? "Faida halisi" : "Hasara halisi"}<br>${money(tP - tE)}</div>`}</div>`;
}
// bila "futaKabisa": kitufe ni 🗄️ History (au ↩️ Rudisha ukiwa History); nacho kikiwashwa: 🗑️ Futa kabisa
function repFolderBtn(i, hist, small) {
  if (optF("futaKabisa")) return small ? `<button class="btn btn-sm btn-ghost no-print" style="color:#b91c1c" title="Futa kabisa" onclick="purgeRepFolder(${i})">🗑️</button>`
    : `<button class="btn btn-sm btn-ghost" style="color:#b91c1c" onclick="purgeRepFolder(${i})">🗑️ Futa kabisa</button>`;
  return hist ? `<button class="btn btn-sm btn-ghost no-print" title="Rudisha kwenye ripoti" onclick="restoreRepFolder(${i})">↩️${small ? "" : " Rudisha"}</button>`
    : `<button class="btn btn-sm btn-ghost no-print" title="Hamishia History" onclick="archiveRepFolder(${i})">🗄️${small ? "" : " History"}</button>`;
}
function toggleRepFolder(i, kind, first) {
  const f = (window.__rpf || [])[i]; if (!f) return;
  const key = kind === "D" ? "RD|" + f.date : f.cust + "|" + f.date; UI.rpOpen = UI.rpOpen || {};
  UI.rpOpen[key] = !(key in UI.rpOpen ? UI.rpOpen[key] : first); rerender();
}
function repFolderLines(f, hist) {
  return reportLines().filter((x) => x.date === f.date && (f.cust == null || repCust(x) === f.cust) && repArchived(x) === !!hist);
}
function purgeRepFolder(i) {
  const f = (window.__rpf || [])[i]; if (!f) return;
  const lines = reportLinesAll().filter((x) => x.date === f.date && (f.cust == null || repCust(x) === f.cust));
  if (!lines.length) return;
  const what = f.cust == null ? `mauzo YOTE ya ${rcDate(f.date)} (bidhaa ${lines.length})` : `mauzo ya ${f.cust} ya ${rcDate(f.date)} (bidhaa ${lines.length})`;
  if (!confirmPermanent(what)) return;
  purgeSalesForever(lines); rerender();
}
function archiveRepFolder(i) {
  const f = (window.__rpf || [])[i]; if (!f) return;
  const what = f.cust == null ? "mauzo yote ya " + rcDate(f.date) : "mauzo ya " + f.cust + " ya " + rcDate(f.date);
  if (!confirm("Hamishia History " + what + "?\nHayafutwi kabisa na stock haiguswi. Unaweza kuyarudisha kutoka 🗄️ History.")) return;
  STATE.settings.repArch = { ...(STATE.settings.repArch || {}), [f.cust == null ? "d:" + f.date : "cd:" + f.cust + "|" + f.date]: Date.now() };
  saveSettings(); rerender();
}
function restoreRepFolder(i) {
  const f = (window.__rpf || [])[i]; if (!f) return;
  const A = { ...(STATE.settings.repArch || {}) };
  if (f.cust == null) { delete A["d:" + f.date]; Object.keys(A).forEach((k) => { if (k.startsWith("cd:") && k.endsWith("|" + f.date)) delete A[k]; }); }
  else {
    delete A["cd:" + f.cust + "|" + f.date];
    if (A["d:" + f.date]) {        // siku nzima ilihamishwa: rudisha mteja huyu tu, wengine wabaki History
      const t = A["d:" + f.date]; delete A["d:" + f.date];
      [...new Set(reportLines().filter((x) => x.date === f.date).map(repCust))].filter((c) => c !== f.cust).forEach((c) => (A["cd:" + c + "|" + f.date] = t));
    }
    if (A["c:" + f.cust]) alert("Mteja " + f.cust + " amehamishiwa History kwa ujumla - rudisha kutoka mwonekano wa 👤 Kwa Mteja.");
  }
  STATE.settings.repArch = A; saveSettings(); rerender();
}
async function pdfRepFolder(i) {
  const f = (window.__rpf || [])[i]; if (!f) return;
  const lines = repFolderLines(f, !!UI.plHistory).sort((a, b) => (a.ts || 0) - (b.ts || 0)); if (!lines.length) return;
  try {
    await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
  } catch (e) { alert("Imeshindikana kupakua PDF — angalia internet kisha jaribu tena."); return; }
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
  const tz = (n) => "TSh " + _NF0.format(Math.round(n)), sg = (n) => (n < 0 ? "-" : "") + tz(Math.abs(n));
  const whole = f.cust == null, rev = lines.reduce((a, x) => a + x.total, 0), pr = lines.reduce((a, x) => a + repProfit(x), 0);
  const exp = whole && !UI.plHistory ? expensesIn(f.date, f.date).reduce((a, x) => a + x.amount, 0) : 0;
  const head = { fillColor: [15, 31, 61], textColor: 255, fontStyle: "bold" }, foot = { fillColor: [235, 239, 245], textColor: 20, fontStyle: "bold" };
  const right = (d, cols) => { if ((d.section === "head" || d.section === "foot") && cols.includes(d.column.index)) d.cell.styles.halign = "right"; };
  doc.setFontSize(15); doc.text(repShopName(), 14, 16);
  doc.setFontSize(11); doc.text("Ripoti ya Mauzo na Faida - " + rcDate(f.date) + (whole ? "" : " - " + f.cust), 14, 23);
  doc.setFontSize(9); doc.setTextColor(110); doc.text("Imetolewa: " + new Date().toLocaleString("en-GB"), 14, 29); doc.setTextColor(0);
  const sumRows = [["Mauzo", tz(rev)], ["Gharama ya bidhaa", tz(rev - pr)], ["Faida ghafi", sg(pr)]];
  if (whole) sumRows.push(["Matumizi ya siku", tz(exp)], [pr - exp >= 0 ? "FAIDA HALISI" : "HASARA HALISI", sg(pr - exp)]);
  doc.autoTable({ startY: 33, theme: "grid", headStyles: head, columnStyles: { 1: { halign: "right" } }, head: [["Muhtasari", "Kiasi"]], body: sumRows,
    didParseCell: (d) => { right(d, [1]); if (d.section === "body" && d.row.index === sumRows.length - 1) d.cell.styles.fontStyle = "bold"; } });
  const byC = {}; lines.forEach((x) => (byC[repCust(x)] = byC[repCust(x)] || []).push(x));
  Object.keys(byC).sort((a, b) => a.localeCompare(b)).forEach((c) => {
    const l = byC[c]; let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 40) + 10; if (y > 265) { doc.addPage(); y = 18; }
    doc.setFontSize(10.5); doc.setFont(undefined, "bold"); doc.text("Mteja: " + c, 14, y); doc.setFont(undefined, "normal");
    doc.autoTable({ startY: y + 2, theme: "striped", headStyles: { ...head, fillColor: [60, 80, 110] }, footStyles: foot, styles: { fontSize: 8.5 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } }, didParseCell: (d) => right(d, [1, 2, 3, 4, 5]),
      head: [["Bidhaa", "Idadi", "Bei", "Bei ya kununua", "Jumla", "Faida"]],
      body: l.map((x) => { const b = repEffBuy(x); return [x.itemName, x.qty, tz(x.sellPrice), b != null ? tz(b) : "-", tz(x.total), sg(repProfit(x)) + (b == null ? " *" : "")]; }),
      foot: [["Jumla ya " + c, l.reduce((a, x) => a + x.qty, 0), "", "", tz(l.reduce((a, x) => a + x.total, 0)), sg(l.reduce((a, x) => a + repProfit(x), 0))]] });
  });
  if (lines.some((x) => repEffBuy(x) == null)) { doc.setFontSize(8); doc.setTextColor(150, 100, 0); doc.text("* Bidhaa haina bei ya kununulia, kwa hiyo faida yake si sahihi.", 14, (doc.lastAutoTable ? doc.lastAutoTable.finalY : 40) + 6); doc.setTextColor(0); }
  const n = doc.getNumberOfPages(); for (let k = 1; k <= n; k++) { doc.setPage(k); doc.setFontSize(8); doc.setTextColor(150); doc.text("Ukurasa " + k + " / " + n, 196, 290, { align: "right" }); doc.setTextColor(0); }
  const safe = whole ? "Siku" : (f.cust.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Mteja");
  doc.save("Ripoti-" + safe + "-" + f.date + ".pdf");
}
/* ---------- KILA BIDHAA: tafuta bidhaa -> uone iliuziwa nani na nani (owner's request, 2026-11-06) ----------
   Kila bidhaa: idadi iliyouzwa, wateja wangapi, mauzo na faida. Ukifungua: kila mteja, mara ngapi, idadi, jumla na tarehe.
   "Tarehe zote" inatafuta mauzo yote (pamoja na yaliyo History), si tarehe ulizochagua juu tu. */
function rpWords(q) { return String(q || "").toLowerCase().split(/\s+/).filter(Boolean); }
function rpMatch(text, words) { const t = String(text || "").toLowerCase(); return words.every((w) => t.includes(w)); }
function rpMoney(n) { return `<span style="font-weight:700;color:${n >= 0 ? "var(--green)" : "#dc2636"}">${n < 0 ? "−" : ""}${fmt(Math.abs(n))}</span>`; }
function rpPill(t) { return `<span class="rp-pill">${t}</span>`; }
function plItemView(salesInRange, effBuy, showHist) {
  const words = rpWords(UI.rpItemQ);
  const src = UI.rpItemAll ? reportLines() : salesInRange;
  const groups = {};
  src.forEach((x) => {
    const k = x.itemId || "n:" + String(x.itemName || "").trim().toLowerCase();
    const g = (groups[k] = groups[k] || { k, name: x.itemName || "—", list: [], lastTs: 0 });
    g.list.push(x);
    if ((x.ts || 0) >= g.lastTs) { g.lastTs = x.ts || 0; g.name = x.itemName || g.name; }
  });
  let rows = Object.values(groups).map((g) => ({
    ...g, qty: g.list.reduce((a, x) => a + x.qty, 0), total: g.list.reduce((a, x) => a + x.total, 0),
    profit: g.list.reduce((a, x) => a + repProfit(x), 0), custs: new Set(g.list.map(repCust)).size,
  }));
  if (words.length) rows = rows.filter((r) => rpMatch(r.name, words));
  rows.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  window.__rpItems = rows.map((r) => r.k);
  const openK = rows.length === 1 ? rows[0].k : UI.rpItemOpen;
  const bar = `<div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    <input id="rp-item-q" type="search" autocomplete="off" class="field field-sm" style="flex:1;min-width:200px;max-width:360px" placeholder="🔍 Tafuta bidhaa (mf. tairi, cheni, bulb)..." value="${esc(UI.rpItemQ || "")}" oninput="UI.rpItemQ=this.value;UI.rpItemOpen=null;softRerender();">
    <label style="font-size:12.5px;display:flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" ${UI.rpItemAll ? "checked" : ""} onchange="UI.rpItemAll=this.checked;rerender();"> Tarehe zote</label>
    <span style="font-size:11.5px;color:#8290a4">${UI.rpItemAll ? "Mauzo yote tangu mwanzo" : "Kwenye tarehe ulizochagua juu"}</span>
  </div>`;
  if (!rows.length) return bar + `<p class="empty-note">${words.length ? "Hakuna bidhaa inayoitwa \"" + esc(UI.rpItemQ) + "\" iliyouzwa " + (UI.rpItemAll ? "." : "kwenye tarehe hizi. Jaribu kuweka ✔ Tarehe zote.") : "Hakuna mauzo kwenye kipindi hiki."}</p>`;
  const th = (t, r) => `<th style="text-align:${r ? "right" : "left"};font-size:10.5px;color:#8290a4;padding:6px">${t}</th>`;
  const body = rows.map((r, i) => {
    const open = openK === r.k;
    let inner = "";
    if (open) {
      const byC = {};
      r.list.forEach((x) => { const c = repCust(x); const o = (byC[c] = byC[c] || { c, qty: 0, total: 0, days: new Set(), last: "" }); o.qty += x.qty; o.total += x.total; o.days.add(x.date); if (x.date > o.last) o.last = x.date; });
      const cs = Object.values(byC).sort((a, b) => b.qty - a.qty || (a.last < b.last ? 1 : -1));
      inner = `<tr><td colspan="5" style="padding:0 0 8px 0;background:var(--paper-alt,#f6f8fb)">
        <div class="rp-sub" style="padding:8px 10px 4px 22px;font-size:12px">👥 <b>${esc(r.name)}</b> imeuziwa wateja <b>${cs.length}</b>:</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr>
          <th style="text-align:left;padding:4px 6px 4px 22px;color:#8290a4">Mteja</th><th style="text-align:right;padding:4px 6px;color:#8290a4">Idadi</th><th style="text-align:right;padding:4px 6px;color:#8290a4">Jumla</th><th style="text-align:left;padding:4px 6px;color:#8290a4">Tarehe</th></tr></thead><tbody>
        ${cs.map((o) => { const ds = [...o.days].sort().reverse(); return `<tr style="border-top:1px solid var(--line)">
          <td style="padding:6px 6px 6px 22px">👤 <b>${esc(o.c)}</b>${ds.length > 1 ? ` <span style="color:#8290a4">· mara ${ds.length}</span>` : ""}</td>
          <td style="padding:6px;text-align:right;font-weight:700">${o.qty}</td>
          <td style="padding:6px;text-align:right">${fmt(o.total)}</td>
          <td style="padding:6px">${ds.slice(0, 5).map((d) => rpPill(esc(rcDate(d)))).join("")}${ds.length > 5 ? rpPill("+" + (ds.length - 5)) : ""}</td></tr>`; }).join("")}
        </tbody></table></td></tr>`;
    }
    const cq = {}; r.list.forEach((x) => { const c = repCust(x); cq[c] = (cq[c] || 0) + x.qty; });
    const cl = Object.keys(cq).sort((a, b) => cq[b] - cq[a]);
    const chips = cl.slice(0, 12).map((c) => `<span class="rp-cchip">👤 ${esc(c)} <b>×${cq[c]}</b></span>`).join("") + (cl.length > 12 ? `<span class="rp-cchip">+${cl.length - 12} wengine</span>` : "");
    return `<tr class="${open ? "rp-open" : ""}" style="cursor:pointer" onclick="rpItemToggle(${i})">
      <td style="padding:8px 6px">${open ? "▾" : "▸"} 📦 <b style="font-size:13.5px">${esc(r.name)}</b>${open ? "" : `<div style="margin-top:4px">${chips}</div>`}</td>
      <td style="padding:8px 6px;text-align:right;font-weight:700">${r.qty}</td>
      <td style="padding:8px 6px;text-align:right">${r.custs}</td>
      <td style="padding:8px 6px;text-align:right">${fmt(r.total)}</td>
      <td style="padding:8px 6px;text-align:right">${rpMoney(r.profit)}</td></tr>${inner}`;
  }).join("");
  const sQ = rows.reduce((a, r) => a + r.qty, 0), sT = rows.reduce((a, r) => a + r.total, 0), sP = rows.reduce((a, r) => a + r.profit, 0);
  return bar + `<div style="overflow-x:auto"><table class="recent-table" style="width:100%;min-width:460px">
    <thead><tr>${th("Bidhaa")}${th("Idadi", 1)}${th("Wateja", 1)}${th("Mauzo", 1)}${th("Faida", 1)}</tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr style="border-top:2px solid var(--line)"><td style="padding:8px 6px;font-weight:800">JUMLA · bidhaa ${rows.length}</td><td style="padding:8px 6px;text-align:right;font-weight:800">${sQ}</td><td></td><td style="padding:8px 6px;text-align:right;font-weight:800">${fmt(sT)}</td><td style="padding:8px 6px;text-align:right">${rpMoney(sP)}</td></tr></tfoot>
  </table></div>`;
}
function rpItemToggle(i) { const k = (window.__rpItems || [])[i]; if (k == null) return; UI.rpItemOpen = UI.rpItemOpen === k ? null : k; rerender(); }

/* ---------- KWA MTEJA: mpangilio mpya (owner's request, 2026-11-06) ----------
   Tafuta mteja; panga kwa mauzo makubwa / A–Z / wa karibuni. Kila mteja: mara alizonunua, bidhaa, mauzo, faida, mara ya mwisho.
   Ukifungua: manunuzi yake kwa tarehe (mpya juu), kila tarehe na bidhaa zake. 🗄️ Hamishia History inabaki. */
function plCustView(sales, effBuy, showHist) {
  const words = rpWords(UI.rpCustQ);
  const sort = UI.rpCustSort || "mauzo";
  const groups = {};
  sales.forEach((x) => (groups[repCust(x)] = groups[repCust(x)] || []).push(x));
  let rows = Object.keys(groups).map((c) => {
    const list = groups[c], days = [...new Set(list.map((x) => x.date))].sort().reverse();
    return { c, list, days, total: list.reduce((a, x) => a + x.total, 0), profit: list.reduce((a, x) => a + repProfit(x), 0), qty: list.reduce((a, x) => a + x.qty, 0), last: days[0] || "", unknown: list.some((x) => effBuy(x) == null) };
  });
  if (words.length) rows = rows.filter((r) => rpMatch(r.c, words));
  const walk = (r) => (r.c === "Mteja wa kawaida" ? 1 : 0);
  rows.sort((a, b) => sort === "az" ? walk(a) - walk(b) || a.c.localeCompare(b.c)
    : sort === "karibuni" ? (a.last < b.last ? 1 : a.last > b.last ? -1 : b.total - a.total)
    : b.total - a.total);
  window.__plKeys = rows.map((r) => r.c);
  const chip = (k, t) => `<button class="chip-btn${sort === k ? " rp-on" : ""}" onclick="UI.rpCustSort='${k}';rerender();">${t}</button>`;
  const bar = `<div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    <input id="rp-cust-q" type="search" autocomplete="off" class="field field-sm" style="flex:1;min-width:180px;max-width:320px" placeholder="🔍 Tafuta mteja..." value="${esc(UI.rpCustQ || "")}" oninput="UI.rpCustQ=this.value;softRerender();">
    <span style="display:flex;gap:4px;flex-wrap:wrap">${chip("mauzo", "💰 Mauzo makubwa")}${chip("az", "🔤 A–Z")}${chip("karibuni", "🕒 Wa karibuni")}</span>
  </div>`;
  if (!rows.length) return bar + `<p class="empty-note">${words.length ? "Hakuna mteja anayeitwa \"" + esc(UI.rpCustQ) + "\" kwenye tarehe hizi." : showHist ? "Hakuna kitu kwenye History kwa kipindi hiki." : "Hakuna mauzo kwenye kipindi hiki."}</p>`;
  const act = (i) => showHist
    ? `<button class="btn btn-sm btn-ghost no-print" title="Rudisha kwenye ripoti" onclick="restoreReportRow('c',${i},event)">↩️</button>`
    : `<button class="btn btn-sm btn-ghost no-print" title="Hamishia History" onclick="archiveReportRow('c',${i},event)">🗄️</button>`;
  const cards = rows.map((r, i) => {
    const open = UI.rpCustOpen === r.c;
    const ini = (r.c.trim()[0] || "?").toUpperCase();
    let inner = "";
    if (open) {
      inner = r.days.map((d) => {
        const dl = r.list.filter((x) => x.date === d);
        return `<div style="border-top:1px solid var(--line);padding:8px 12px 8px 52px">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><b>📅 ${esc(rcDate(d))}</b><span>Jumla <b>${fmt(dl.reduce((a, x) => a + x.total, 0))}</b> · Faida ${rpMoney(dl.reduce((a, x) => a + repProfit(x), 0))}</span></div>
          ${dl.map((x) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:3px 0;color:var(--ink)"><span>• ${esc(x.itemName)}${x.pos ? ` <span style="color:#8290a4">· POS</span>` : ""}</span><span style="white-space:nowrap">${x.qty} × ${fmt(x.sellPrice)} = <b>${fmt(x.total)}</b></span></div>`).join("")}
        </div>`;
      }).join("");
    }
    return `<div class="rp-card">
      <div class="${open ? "rp-open" : ""}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer" onclick="rpCustToggle(${i})">
        <div class="rp-av">${esc(ini)}</div>
        <div style="flex:1;min-width:0">
          <div class="rp-name">${open ? "▾" : "▸"} ${esc(r.c)}</div>
          <div>${rpPill("mara " + r.days.length)}${rpPill("bidhaa " + r.qty)}${rpPill("mwisho " + esc(rcDate(r.last)))}</div>
        </div>
        <div style="text-align:right;font-size:12.5px;flex:none">
          <div><b>${fmt(r.total)}</b></div>
          <div>${rpMoney(r.profit)}${r.unknown ? `<span title="Baadhi ya bidhaa hazina bei ya kununulia" style="color:#b8862f"> *</span>` : ""}</div>
        </div>
        <div style="flex:none" onclick="event.stopPropagation()">${act(i)}</div>
      </div>${inner}
    </div>`;
  }).join("");
  const sT = rows.reduce((a, r) => a + r.total, 0), sP = rows.reduce((a, r) => a + r.profit, 0);
  return bar + cards + `<div style="display:flex;justify-content:space-between;padding:10px 12px;border:2px solid var(--line);border-radius:8px;font-size:12.5px"><b>JUMLA · wateja ${rows.length}</b><span>Mauzo <b>${fmt(sT)}</b> · Faida ${rpMoney(sP)}</span></div>`;
}
function rpCustToggle(i) { const c = (window.__plKeys || [])[i]; if (c == null) return; UI.rpCustOpen = UI.rpCustOpen === c ? null : c; rerender(); }


/* =====================================================================
   📱 VIFAA: kila kifaa kinachotumia mfumo, kiliingia/kilitoka saa ngapi,
   kiko hewani sasa, ubora wa internet yake, na kama kina data
   zinazosubiri kutumwa. Pia onyo la "internet dhaifu - usirefreshi".
   Kila kifaa kinaandika hati moja ndogo (dev_<id>) kila dakika 3.
   ===================================================================== */
let DEV = null;   // kipengele "vifaaNet" — kinaanzishwa tu kwa duka lililowashiwa (devStart)
function devStart() { if (DEV || !optF("vifaaNet") || typeof colRef === "undefined" || !colRef) return; DEV = (function () {
  const APP = typeof SHOP !== "undefined" && SHOP ? (SHOP.name || "Duka") : "Wadai";
  let id; try { id = localStorage.getItem("ee_dev_id"); if (!id) { id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); localStorage.setItem("ee_dev_id", id); } } catch (e) { id = "dtemp" + Math.random().toString(36).slice(2, 7); }
  const ua = navigator.userAgent || "";
  const type = /iPad|Tablet|SM-T|Tab\b/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Simu" : "Kompyuta";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iPhone" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  const st = { list: {}, writeMs: null, lastBeat: 0, hiddenAt: 0 };
  const SKEY = "ee_dev_sessions:" + APP;
  let sessions = []; try { sessions = JSON.parse(localStorage.getItem(SKEY) || "[]"); } catch (e) {}
  function newSession() { sessions.push({ in: Date.now(), out: null }); sessions = sessions.slice(-12); try { localStorage.setItem(SKEY, JSON.stringify(sessions)); } catch (e) {} }
  function endSession() { const s = sessions[sessions.length - 1]; if (s && !s.out) s.out = Date.now(); try { localStorage.setItem(SKEY, JSON.stringify(sessions)); } catch (e) {} }
  newSession();
  const label = () => { try { return localStorage.getItem("ee_dev_label") || ""; } catch (e) { return ""; } };
  function net() { const c = navigator.connection || {}; return { online: navigator.onLine !== false, type: c.effectiveType || null, rtt: c.rtt != null ? c.rtt : null, down: c.downlink != null ? c.downlink : null, writeMs: (st.writeAt && Date.now() - st.writeAt < 240000) ? st.writeMs : null }; }
  function quality(n) {
    if (!n || n.online === false) return "offline";
    if (n.type === "slow-2g" || n.type === "2g" || (n.rtt != null && n.rtt > 900) || (n.writeMs != null && n.writeMs > 5000)) return "dhaifu";
    if (n.type === "3g" || (n.rtt != null && n.rtt > 350) || (n.writeMs != null && n.writeMs > 2000)) return "wastani";
    return "nzuri";
  }
  const ref = () => { const c = colRef; return c ? c.doc("dev_" + id) : null; };
  function beat(extra) {
    const r = ref(); if (!r) return;
    const t0 = Date.now(); st.lastBeat = t0;
    const doc = { kind: "device", id, app: APP, label: label(), type, os, browser: br, user: "" || "", ver: APP_VERSION, lastSeen: t0, online: true, leftAt: null,
      sessionStart: (sessions[sessions.length - 1] || {}).in || t0, sessions, net: net(), pending: !!((UI.sync && UI.sync.pending)), ...(extra || {}) };
    const wasOn = navigator.onLine !== false;   // kasi inapimwa tu ikiwa ilianza na internet (si muda wa kusubiri offline)
    r.set(doc, { merge: true }).then(() => { if (wasOn && navigator.onLine !== false) { st.writeMs = Date.now() - t0; st.writeAt = Date.now(); } }).catch(() => {});
  }
  function leave() { endSession(); beat({ online: false, leftAt: Date.now() }); }
  setInterval(() => { if (document.visibilityState !== "hidden") beat(); }, 180000);
  (function first(n) { if (ref()) beat(); else if (n < 40) setTimeout(() => first(n + 1), 3000); })(0);
  window.addEventListener("online", () => { st.writeMs = null; st.writeAt = 0; try { db.enableNetwork().catch(() => {}); } catch (e) {} beat(); setTimeout(banner, 300); });
  window.addEventListener("offline", () => { st.writeMs = null; banner(); });
  window.addEventListener("pagehide", leave);
  window.addEventListener("beforeunload", (e) => { if ((UI.sync && UI.sync.pending)) { e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { st.hiddenAt = Date.now(); leave(); }
    else { if (Date.now() - st.hiddenAt > 10 * 60000) newSession(); else { const s = sessions[sessions.length - 1]; if (s) s.out = null; } beat(); }
  });
  function load(docs) { const L = {}; Object.keys(docs).forEach((k) => { if (k.startsWith("dev_") && docs[k] && docs[k].kind === "device") L[docs[k].id || k.slice(4)] = docs[k]; }); st.list = L; }

  // ---------- onyo la internet dhaifu (nje ya #app, halifutwi na render)
  function banner() {
    const q = quality(net()); const rawPend = !!((UI.sync && UI.sync.pending));
    if (rawPend) { if (!st.pendSince) st.pendSince = Date.now(); } else st.pendSince = 0;
    const pend = rawPend && Date.now() - st.pendSince > 15000;   // data zimekaa >15s bila kufika (si kila mauzo madogo)
    let b = document.getElementById("dev-net-bar");
    if (q !== "offline" && q !== "dhaifu" && !pend) { if (b) b.remove(); return; }
    if (q !== "offline" && Date.now() - st.lastBeat > 30000) beat();   // pima kasi upya kila 30s wakati kuna tatizo
    if (!b) { b = document.createElement("div"); b.id = "dev-net-bar"; b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9998;padding:7px 12px;font:13px system-ui,sans-serif;text-align:center;color:#111"; document.body.appendChild(b); }
    b.style.background = q === "offline" ? "#fca5a5" : "#fde68a";
    const msg = (q === "offline" ? "📵 Hakuna internet - USIREFRESH. Kazi yako inahifadhiwa kwenye kifaa hiki na itatumwa yenyewe internet ikirudi."
      : q === "dhaifu" ? "📶 Internet dhaifu - USIREFRESH. Kazi yako inahifadhiwa kwenye kifaa hiki na itatumwa yenyewe."
      : "⏳ Data zinachelewa kufika cloud - acha mfumo wazi.") + (pend ? " (⏳ kuna data zinasubiri kutumwa)" : "");
    if (b.dataset.msg !== msg) {
      b.dataset.msg = msg; b.textContent = msg + " ";
      if (q !== "offline") { const k = document.createElement("button"); k.textContent = "🔄 Tuma sasa"; k.style.cssText = "margin-left:6px;border:1px solid #111;background:#fff;border-radius:6px;padding:2px 8px;font:12px system-ui;cursor:pointer"; k.onclick = () => DEV.flush(); b.appendChild(k); }
    }
  }
  setInterval(banner, 5000); setTimeout(banner, 1500);

  // ---------- jopo la Settings
  const T = (t) => t ? new Date(t).toLocaleString("sw-TZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  const ago = (t) => { if (!t) return "—"; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "sasa hivi" : m < 60 ? `dakika ${m} zilizopita` : m < 1440 ? `saa ${Math.round(m / 60)} zilizopita` : `siku ${Math.round(m / 1440)} zilizopita`; };
  const E = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const QL = { nzuri: "🟢 Nzuri", wastani: "🟡 Wastani", dhaifu: "🔴 Dhaifu", offline: "⚫ Hakuna" };
  function panel() {
    const me = id, now = Date.now();
    const rows = Object.values(st.list).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    const isOn = (d) => d.online && now - (d.lastSeen || 0) < 7 * 60000;
    const body = rows.map((d) => {
      const on = isOn(d), q = on ? quality(d.net) : "offline";
      const name = d.label || `${d.type || "Kifaa"} · ${d.os || ""} ${d.browser || ""}`.trim();
      const ses = (d.sessions || []).slice().reverse().slice(0, 8).map((s) => `<div>▸ ${T(s.in)} → ${s.out ? T(s.out) : (on ? "<b>bado yupo</b>" : "—")}</div>`).join("");
      return `<tr style="border-top:1px solid rgba(127,127,127,.2)">
        <td style="padding:8px 6px"><b>${E(name)}</b>${d.id === me ? ' <span style="color:#10b981">(hiki)</span>' : ""}<div style="font-size:11px;opacity:.7">${E(d.app)}${d.user ? " · " + E(d.user) : ""} · ${E(d.ver || "")}</div>
          ${ses ? `<details style="font-size:11px;opacity:.85;margin-top:4px"><summary>Historia ya kuingia/kutoka</summary>${ses}</details>` : ""}</td>
        <td style="padding:8px 6px;white-space:nowrap">${T(d.sessionStart)}</td>
        <td style="padding:8px 6px;white-space:nowrap">${on ? "<b style='color:#10b981'>🟢 Yupo sasa</b>" : "⚪ Alitoka " + T(d.leftAt || d.lastSeen)}<div style="font-size:11px;opacity:.7">alionekana ${ago(d.lastSeen)}</div></td>
        <td style="padding:8px 6px;white-space:nowrap">${on ? QL[q] : "—"}<div style="font-size:11px;opacity:.7">${on ? "" : "mara ya mwisho: "}${d.net && d.net.type ? E(d.net.type) : ""}${d.net && d.net.rtt != null ? " · " + d.net.rtt + "ms" : ""}${d.net && d.net.writeMs != null ? " · kuhifadhi " + (d.net.writeMs / 1000).toFixed(1) + "s" : ""}</div></td>
        <td style="padding:8px 6px;white-space:nowrap">${d.pending ? "⏳ Zinasubiri kutumwa" : "✓ Zimefika"}</td>
        <td style="padding:8px 6px">${d.id === me ? `<button class="btn btn-ghost" style="padding:4px 8px;font-size:12px" onclick="DEV.rename()">✏️ Jina</button>` : `<button class="btn btn-ghost" style="padding:4px 8px;font-size:12px" onclick="DEV.remove('${E(d.id)}')">Ondoa</button>`}</td></tr>`;
    }).join("");
    const myQ = quality(net());
    return `<div class="panel settings-panel" style="margin-top:16px"><h3>📱 Vifaa vinavyotumia mfumo</h3>
      <p style="font-size:12.5px;margin:4px 0 10px">Kifaa hiki: internet ${QL[myQ]}${st.writeMs != null ? " · kuhifadhi kunachukua " + (st.writeMs / 1000).toFixed(1) + "s" : ""} · ${(UI.sync && UI.sync.pending) ? "⏳ kuna data zinasubiri kutumwa" : "✓ data zote zimefika cloud"}
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px;margin-left:6px" onclick="DEV.flush()">🔄 Tuma data sasa</button></p>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="text-align:left;opacity:.7"><th style="padding:6px">Kifaa</th><th style="padding:6px">Aliingia</th><th style="padding:6px">Hali / alitoka</th><th style="padding:6px">Internet</th><th style="padding:6px">Data</th><th></th></tr></thead>
      <tbody>${body || `<tr><td colspan="6" style="padding:10px;opacity:.7">Bado hakuna taarifa - vifaa vitaonekana baada ya kufunguliwa (dakika 1).</td></tr>`}</tbody></table></div>
      <p style="font-size:11.5px;opacity:.7;margin-top:8px">"Yupo sasa" = kimeonekana ndani ya dakika 7. Internet: Nzuri / Wastani / Dhaifu kwa kasi halisi ya kuhifadhi data. Kifaa kikiwa na data "zinasubiri", kisizimwe wala kufuta browser mpaka zifike.</p></div>`;
  }
  function rename() { const v = prompt("Jina la kifaa hiki (mf. Simu ya Juma, Computer ya duka):", label()); if (v == null) return; try { localStorage.setItem("ee_dev_label", v.trim().slice(0, 40)); } catch (e) {} beat(); setTimeout(() => rerender(), 400); }
  function remove(did) { if (!confirm("Ondoa kifaa hiki kwenye orodha? (Kikitumika tena kitaonekana tena.)")) return; const c = colRef; if (c) c.doc("dev_" + did).delete().catch(() => {}); }
  function flush() {
    const el = document.getElementById("dev-flush-msg");
    const done = (m) => alert(m);
    if (navigator.onLine === false) return done("Hakuna internet sasa. Data ziko salama kwenye kifaa hiki na zitatumwa yenyewe internet ikirudi - usifute browser wala app.");
    try { db.enableNetwork().catch(() => {}); } catch (e) {}
    const t = setTimeout(() => done("Bado inatuma (internet ni dhaifu). Acha app wazi - itamaliza yenyewe."), 15000);
    db.waitForPendingWrites().then(() => { clearTimeout(t); beat(); done("✅ Data zote zimefika cloud."); }).catch(() => { clearTimeout(t); done("Imeshindwa kuthibitisha - jaribu tena baadaye."); });
  }
  return { id, load, panel, beat, rename, remove, flush, quality, net };
})(); if (typeof _DOCS !== "undefined" && Object.keys(_DOCS).length) DEV.load(_DOCS); }

/* ---------- ✏️ HARIRI MZIGO ULIOPOKELEWA (kipengele "haririMzigo", 2026-11-17) ----------
   Rekebisha supplier, tarehe, ref, na kwa kila bidhaa: jina, idadi na buying price.
   Stock inafuata: idadi ya "in" ya mzigo huo inabadilika, jina jipya linahamisha stock kwenda
   bidhaa yenye jina hilo (stoo ileile), na buying price mpya inawekwa kwenye stock na Products. */
function openEditDelivery(id) {
  const d = (STATE.deliveries || []).find((x) => x.id === id); if (!d) return;
  UI.editDelivery = { id, supplier: d.supplier || "", date: d.date || todayStr(), ref: d.ref || "", msg: null,
    rows: d.rows.map((r) => ({ key: r.movementId || uid(), name: r.name, qty: String(r.qty), price: r.price != null ? String(r.price) : "" })) };
  rerender();
}
function setEditDelivery(field, value, key) {
  const e = UI.editDelivery; if (!e) return;
  if (key) { const r = e.rows.find((x) => x.key === key); if (r) r[field] = value; } else e[field] = value;
  const el = key && document.getElementById("ed-tot-" + key);
  if (el) { const r = e.rows.find((x) => x.key === key); el.textContent = fmt((Number(r.price) || 0) * (Number(r.qty) || 0)); }
  const all = document.getElementById("ed-total");
  if (all) all.textContent = fmt(e.rows.reduce((s, r) => s + (Number(r.price) || 0) * (Number(r.qty) || 0), 0));
}
function renderEditDeliveryModal() {
  const e = UI.editDelivery; const d = (STATE.deliveries || []).find((x) => x.id === e.id);
  if (!d) { UI.editDelivery = null; return ""; }
  const total = e.rows.reduce((s, r) => s + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);
  const names = [...new Set(STATE.products.filter((p) => !p.deleted).map((p) => p.name))];
  return `
  <div class="modal-overlay">
    <div class="modal-stack" style="max-width:720px">
      <div class="receipt-print" style="padding:20px">
        <h3 style="margin:0 0 4px">✏️ Hariri mzigo — ${d.store === "godown" ? "Godown" : "Dukani"}</h3>
        <p style="font-size:12px;color:#6b7280;margin:0 0 12px">Stock na buying price zitarekebishwa pamoja na mzigo huu.</p>
        <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:8px">
          <input class="field field-sm" placeholder="Supplier" value="${esc(e.supplier)}" oninput="setEditDelivery('supplier',this.value)">
          <input class="field field-sm" type="date" value="${esc(e.date)}" oninput="setEditDelivery('date',this.value)">
          <input class="field field-sm" placeholder="Ref" value="${esc(e.ref)}" oninput="setEditDelivery('ref',this.value)">
        </div>
        <datalist id="ed-names">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
        <table class="recent-table" style="width:100%;margin-top:12px">
          <thead><tr><th style="text-align:left">Bidhaa</th><th style="text-align:right">Idadi</th><th style="text-align:right">Buying price</th><th style="text-align:right">Jumla</th></tr></thead>
          <tbody>${e.rows.map((r) => `<tr>
            <td style="padding:4px"><input class="field field-sm" list="ed-names" style="margin:0" value="${esc(r.name)}" oninput="setEditDelivery('name',this.value,'${r.key}')"></td>
            <td style="padding:4px;width:90px"><input class="field field-sm" type="number" min="0" style="margin:0;text-align:right" value="${esc(r.qty)}" oninput="setEditDelivery('qty',this.value,'${r.key}')"></td>
            <td style="padding:4px;width:120px"><input class="field field-sm" type="number" min="0" style="margin:0;text-align:right" value="${esc(r.price)}" oninput="setEditDelivery('price',this.value,'${r.key}')"></td>
            <td style="padding:4px;text-align:right;font-weight:600" id="ed-tot-${r.key}">${fmt((Number(r.price) || 0) * (Number(r.qty) || 0))}</td>
          </tr>`).join("")}</tbody>
        </table>
        <p style="text-align:right;margin:8px 0 12px">JUMLA: <strong id="ed-total">${fmt(total)}</strong></p>
        ${e.msg ? `<p class="settings-msg err">${esc(e.msg)}</p>` : ""}
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" style="flex:1" onclick="saveEditDelivery()">💾 Hifadhi marekebisho</button>
          <button class="btn btn-ghost" onclick="UI.editDelivery=null;rerender();">Ghairi</button>
        </div>
      </div>
    </div>
  </div>`;
}
function saveEditDelivery() {
  const e = UI.editDelivery; const d = (STATE.deliveries || []).find((x) => x.id === e.id); if (!d) return;
  const store = d.store || "dukani", L = (s) => String(s || "").trim().toLowerCase();
  if (!e.supplier.trim()) { e.msg = "Andika jina la supplier."; return rerender(); }
  for (const r of e.rows) {
    if (!r.name.trim() || !(Number(r.qty) > 0)) { e.msg = "Kila bidhaa iwe na jina na idadi kubwa kuliko 0."; return rerender(); }
    if (r.price !== "" && !(Number(r.price) >= 0)) { e.msg = "Buying price ya " + r.name + " si sahihi."; return rerender(); }
  }
  // hakiki kwanza: stock isiwe chini ya sifuri (kilichouzwa au kuhamishwa hakiwezi kuondolewa)
  const take = {}, give = {};   // itemId → idadi inayoondoka / inayoongezeka
  const plan = e.rows.map((r) => {
    const old = d.rows.find((x) => (x.movementId || "") === r.key) || {};
    const oldItem = old.itemId, oldQty = Number(old.qty) || 0, qty = Number(r.qty);
    const target = storeItems(store).find((it) => L(it.name) === L(r.name));
    const moving = !target || target.id !== oldItem;
    if (oldItem) { take[oldItem] = (take[oldItem] || 0) + (moving ? oldQty : Math.max(0, oldQty - qty)); }
    return { r, old, oldItem, qty, target, moving };
  });
  for (const id of Object.keys(take)) {
    if (take[id] > 0 && qtyOf(id) < take[id]) {
      const it = STATE.stockItems.find((x) => x.id === id) || {};
      e.msg = `Haiwezekani: ${it.name || "bidhaa"} imebaki ${qtyOf(id)} tu, lakini marekebisho yanaondoa ${take[id]} (zingine zimeshauzwa au kuhamishwa).`;
      return rerender();
    }
  }
  const rows = plan.map(({ r, old, qty, target }) => {
    const name = r.name.trim(), price = r.price !== "" ? Number(r.price) : null;
    let item = target;
    if (!item) { item = { id: uid(), name, category: guessCategory(name), lowStockLimit: null, store }; STATE.stockItems.push(item); }
    const movementId = old.movementId && STATE.stockMovements.some((m) => m.id === old.movementId) ? old.movementId : uid();
    if (STATE.stockMovements.some((m) => m.id === movementId)) {
      STATE.stockMovements = STATE.stockMovements.map((m) => (m.id === movementId ? { ...m, itemId: item.id, qty, price, supplier: e.supplier.trim(), date: e.date } : m));
    } else {
      STATE.stockMovements.push({ id: movementId, itemId: item.id, type: "in", qty, supplier: e.supplier.trim(), date: e.date, price, deliveryId: d.id });
    }
    if (price != null) setBuyPriceEverywhere(name, price);
    else if (!productByName(name)) STATE.products.push({ id: uid(), name, price: 0 });
    return { ...old, name, qty, price, total: (price || 0) * qty, itemId: item.id, movementId };
  });
  const total = rows.reduce((s, r) => s + r.total, 0);
  STATE.deliveries = STATE.deliveries.map((x) => (x.id === d.id ? { ...x, supplier: e.supplier.trim(), date: e.date, ref: e.ref.trim(), rows, total, editedAt: Date.now() } : x));
  invalidateStock();
  saveFieldsTogether(["stockItems", "stockMovements", "products", "deliveries"]).catch(() => {});
  UI.editDelivery = null;
  UI.deliveryListMsg = { ok: true, text: "✅ Mzigo umerekebishwa — stock na buying price zimesasishwa." };
  rerender();
}

/* ---------- ✏️ HARIRI BIDHAA YA STOCK — Dukani na Godown (kipengele "haririMzigo") ----------
   Jina (likiwa la bidhaa nyingine ya stoo hiyo, historia inaunganishwa), idadi iliyopo kweli
   (tofauti inaandikwa kama "✏️ Marekebisho ya stock") na buying price (stock + Products). */
const ADJ_LABEL = "✏️ Marekebisho ya stock";
function openEditStock(id) {
  const it = STATE.stockItems.find((x) => x.id === id); if (!it) return;
  const bp = buyPriceOf(it);
  UI.editStock = { id, name: it.name, qty: String(qtyOf(id)), price: bp != null ? String(bp) : "", msg: null };
  rerender();
}
function renderEditStockModal() {
  const e = UI.editStock; const it = STATE.stockItems.find((x) => x.id === e.id);
  if (!it) { UI.editStock = null; return ""; }
  const store = (it.store || "dukani") === "godown" ? "Godown" : "Dukani", now = qtyOf(it.id);
  const names = [...new Set(STATE.products.filter((p) => !p.deleted).map((p) => p.name))];
  return `
  <div class="modal-overlay">
    <div class="modal-stack" style="max-width:460px">
      <div class="receipt-print" style="padding:20px">
        <h3 style="margin:0 0 4px">✏️ ${optF("haririMzigo") ? "Hariri bidhaa" : "Badilisha jina"} — ${store}</h3>
        <p style="font-size:12px;color:#6b7280;margin:0 0 12px">Sasa: <strong>${esc(it.name)}</strong> · ${now} kwenye stock</p>
        <datalist id="es-names">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
        <label style="display:block;font-size:12px;font-weight:600;color:#55657c;margin:8px 0 4px">Jina la bidhaa</label>
        <input class="field" list="es-names" value="${esc(e.name)}" oninput="UI.editStock.name=this.value">
        ${optF("haririMzigo") ? `
        <label style="display:block;font-size:12px;font-weight:600;color:#55657c;margin:8px 0 4px">Idadi iliyopo kweli (${store})</label>
        <input class="field" type="number" min="0" value="${esc(e.qty)}" oninput="UI.editStock.qty=this.value">
        <label style="display:block;font-size:12px;font-weight:600;color:#55657c;margin:8px 0 4px">Buying price (kwa kipande)</label>
        <input class="field" type="number" min="0" value="${esc(e.price)}" oninput="UI.editStock.price=this.value">
        <p style="font-size:11.5px;color:#6b7280;margin:4px 0 12px">Ukibadilisha idadi, tofauti inaandikwa kwenye historia kama "${ADJ_LABEL}". Buying price inabadilika kwa bidhaa hii Dukani, Godown na Products.</p>`
        : `<p style="font-size:11.5px;color:#6b7280;margin:4px 0 12px">Jina jipya linaonekana kwenye stock ya ${store} na mizigo yake. Ukiandika jina la bidhaa iliyopo tayari ${store}, stock zake zinaunganishwa. Kubadilisha jina kila mahali (Dukani + Godown + Products): tumia ✏️ kwenye Products.</p>`}
        ${e.msg ? `<p class="settings-msg err">${esc(e.msg)}</p>` : ""}
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" style="flex:1" onclick="saveEditStock()">💾 Hifadhi</button>
          <button class="btn btn-ghost" onclick="UI.editStock=null;rerender();">Ghairi</button>
        </div>
      </div>
    </div>
  </div>`;
}
function saveEditStock() {
  const e = UI.editStock; const it = STATE.stockItems.find((x) => x.id === e.id); if (!it) return;
  const store = it.store || "dukani", L = (s) => String(s || "").trim().toLowerCase();
  const full = optF("haririMzigo");   // bila kipengele: jina tu
  const name = e.name.trim(), qty = full ? Number(e.qty) : qtyOf(it.id), price = !full || e.price === "" ? null : Number(e.price);
  if (!full) e.qty = String(qty);
  if (!name) { e.msg = "Andika jina la bidhaa."; return rerender(); }
  if (e.qty === "" || !(qty >= 0) || !Number.isInteger(qty)) { e.msg = "Idadi iwe namba kamili, 0 au zaidi."; return rerender(); }
  if (price != null && !(price >= 0)) { e.msg = "Buying price si sahihi."; return rerender(); }
  const diff = qty - qtyOf(it.id);   // tofauti ya bidhaa HII (kabla ya kuunganisha na jina jingine)
  let target = it;
  if (L(name) !== L(it.name)) {
    const other = storeItems(store).find((x) => x.id !== it.id && L(x.name) === L(name));
    if (other) {   // jina hili lipo tayari stoo hii → unganisha historia yote kwenye bidhaa hiyo
      STATE.stockMovements = STATE.stockMovements.map((m) => (m.itemId === it.id ? { ...m, itemId: other.id } : m));
      STATE.stockItems = STATE.stockItems.filter((x) => x.id !== it.id);
      STATE.deliveries = (STATE.deliveries || []).map((d) => (d.rows || []).some((r) => r.itemId === it.id)
        ? { ...d, rows: d.rows.map((r) => (r.itemId === it.id ? { ...r, itemId: other.id, name: other.name } : r)) } : d);
      target = other;
    } else {
      STATE.stockItems = STATE.stockItems.map((x) => (x.id === it.id ? { ...x, name } : x));
      STATE.deliveries = (STATE.deliveries || []).map((d) => (d.rows || []).some((r) => r.itemId === it.id)
        ? { ...d, rows: d.rows.map((r) => (r.itemId === it.id ? { ...r, name } : r)) } : d);
      target = { ...it, name };
    }
    if (!productByName(target.name)) STATE.products.push({ id: uid(), name: target.name, price: 0 });
  }
  invalidateStock();
  if (diff !== 0) STATE.stockMovements.push(diff > 0
    ? { id: uid(), itemId: target.id, type: "in", qty: diff, supplier: ADJ_LABEL, date: todayStr(), price: null, adjust: true }
    : { id: uid(), itemId: target.id, type: "out", qty: -diff, destination: ADJ_LABEL, date: todayStr(), adjust: true });
  if (price != null && price !== buyPriceOf(target)) setBuyPriceEverywhere(target.name, price);
  saveFieldsTogether(["stockItems", "stockMovements", "products", "deliveries"]).catch(() => {});
  UI.editStock = null;
  UI.toastMsg = "✅ " + target.name + " imerekebishwa" + (diff ? ` (${diff > 0 ? "+" : ""}${diff})` : "");
  rerender();
}
