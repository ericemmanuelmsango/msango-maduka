/* =====================================================================
   🔒 HIFADHI SALAMA YA ORODHA (v2 · 2026-11-18) — inasomwa na index.html (Wadai), pos.html (POS), kiwanda.html
   TATIZO LA ZAMANI: kila badiliko liliandika ORODHA NZIMA upya (mf. mauzo yote ~2 MB + stock yote ~1 MB kwa
   kila mauzo moja). Vifaa viwili vikihifadhi karibu wakati mmoja — au kifaa kilichokuwa offline kikirudi
   mtandaoni — kimoja kilifuta kazi ya kingine: mauzo, malipo na madeni yalipotea. Na kila mauzo yalipakia
   MB nyingi, ndiyo maana mfumo ulikuwa mzito sana.
   SASA: msingi (f__0, f__1…) unabaki kama ulivyo, na kila rekodi iliyoongezwa / kubadilishwa / kufutwa
   inaandikwa kwenye hati yake ndogo:  r_<orodha>_<id> → { f, id, seq, rec }  au  { f, id, seq, del: true }.
   Orodha kamili = msingi + hati hizo (kwa id). Kifaa kinaandika TU kilichobadilika, kwa hiyo hakiwezi
   kufuta kazi ya kifaa kingine, na mauzo moja ni ~1 KB badala ya MB 3.
   Hati ndogo zikizidi, kifaa kimoja kinaziunganisha kwenye msingi (ssFullWrites) na kuzifuta.
   ===================================================================== */
const SS_FIELDS = ["entries", "products", "stockItems", "stockMovements", "sales", "deliveries"];
const SS_BATCH = 450;                 // Firestore: shughuli 500 kwa batch moja
const SS_PART_LIMIT = 400000;      // herufi; nafasi ya kutosha chini ya 1 MiB hata kwa herufi za bytes nyingi
let _ssSeq = 0;
function ssSeq() { _ssSeq = Math.max(_ssSeq + 1, Date.now() * 1000); return _ssSeq; }
function ssDocId(f, id) {
  if (id == null) return null;
  const s = String(id);
  return s !== "." && s !== ".." && /^[A-Za-z0-9_.:+\-]{1,300}$/.test(s) ? "r_" + f + "_" + s : null;
}
function ssIsBaseDoc(docId) { return /^(entries|products|stockItems|stockMovements|sales|deliveries)__\d+$/.test(docId); }
function ssIsOverlay(docId, d) { return docId.startsWith("r_") && !!d && SS_FIELDS.includes(d.f); }
function ssHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + "." + str.length; }
/* Kifaa cha toleo la zamani kimebadilisha rekodi kwenye msingi BAADA ya hati ndogo kuandikwa (rekodi ya msingi si ile
   ambayo hati ndogo ilijengwa juu yake). Usimfute yeyote: chukua hati ndogo, na kwa orodha za ndani (malipo, madeni,
   bidhaa za ankara…) unganisha vipengele vya pande zote mbili. */
function ssUnion(rec, other) {
  const out = { ...other, ...rec };
  Object.keys(other).forEach((k) => {
    if (Array.isArray(rec[k]) && Array.isArray(other[k])) {
      const key = (x) => (x && typeof x === "object" && x.id != null ? "i:" + x.id : "j:" + JSON.stringify(x));
      const seen = new Set(rec[k].map(key)), arr = rec[k].slice();
      other[k].forEach((x) => { const kk = key(x); if (!seen.has(kk)) { seen.add(kk); arr.push(x); } });
      out[k] = arr;
    }
  });
  return out;
}
/* docs = { docId: data } (hati zote za duka). Inarudisha { list, overlays, parts, seqOf } */
function ssMerge(docs, f, fallbackBase) {
  const pre = f + "__", parts = [];
  for (const id in docs) if (id.startsWith(pre) && /__\d+$/.test(id) && docs[id]) parts.push(docs[id]);
  parts.sort((a, b) => a.part - b.part);
  let base = [], oldItems = null;
  if (parts.length) {
    const n = parts[0].of, use = parts.filter((p) => p.of === n);
    base = [].concat(...use.map((p) => p.items || []));
    if (use.some((p) => !p.v2)) oldItems = new Set([].concat(...use.filter((p) => !p.v2).map((p) => p.items || [])));
  }
  else if (Array.isArray(fallbackBase)) { base = fallbackBase; oldItems = new Set(fallbackBase); }
  const opre = "r_" + f + "_", ov = [];
  for (const id in docs) if (id.startsWith(opre)) { const d = docs[id]; if (d && d.f === f && d.id != null) ov.push(d); }
  const seqOf = new Map();
  if (!ov.length) return { list: base, overlays: 0, parts: parts.length, seqOf };
  ov.sort((a, b) => (a.seq || 0) - (b.seq || 0));
  const by = new Map();
  ov.forEach((d) => { by.set(String(d.id), d); seqOf.set(String(d.id), d.seq || 0); });
  const list = [], used = new Set();
  for (const x of base) {
    const k = x && x.id != null ? String(x.id) : null, o = k != null ? by.get(k) : null;
    if (!o) { list.push(x); continue; }
    if (used.has(k)) continue;
    used.add(k);
    if (o.del || !o.rec) continue;
    // msingi wa toleo la zamani umebadilika baada ya hati ndogo → unganisha, usifiche kazi ya kifaa cha zamani
    const clash = oldItems && oldItems.has(x) && o.bb !== undefined && o.bb !== ssHash(JSON.stringify(x));
    list.push(clash ? ssUnion(o.rec, x) : o.rec);
  }
  for (const d of ov) { const k = String(d.id); if (!used.has(k)) { used.add(k); if (!d.del && d.rec) list.push(d.rec); } }
  return { list, overlays: ov.length, parts: parts.length, seqOf };
}
/* hash ya rekodi za msingi (kwa id) — inahifadhiwa kwenye hati ndogo (bb) ili kugundua mabadiliko ya kifaa cha zamani */
function ssBaseHashes(docs, f, ids, fallbackBase) {
  const want = new Set(ids.map(String)), out = new Map(), pre = f + "__", parts = [];
  for (const id in docs) if (id.startsWith(pre) && /__\d+$/.test(id) && docs[id]) parts.push(docs[id]);
  const items = parts.length ? [].concat(...parts.map((p) => p.items || [])) : (fallbackBase || []);
  for (const x of items) { const k = x && x.id != null ? String(x.id) : null; if (k != null && want.has(k) && !out.has(k)) out.set(k, ssHash(JSON.stringify(x))); }
  return out;
}
/* Picha ya orodha kama ilivyo cloud: id → JSON (kwa kulinganisha kabla ya kuhifadhi) */
function ssIndex(list, js) {
  const map = new Map(), dup = new Set(), noId = [];
  for (const x of list || []) {
    const j = js ? js(x) : JSON.stringify(x);
    if (!x || typeof x !== "object" || x.id == null) { noId.push(j); continue; }
    const k = String(x.id);
    if (map.has(k)) { dup.add(k); map.set(k, map.get(k) + "\u0001" + j); } else map.set(k, j);
  }
  return { map, dup, noId };
}
/* Tofauti kati ya cloud (before = ssIndex) na orodha mpya. null = haiwezekani kwa rekodi moja moja → andika yote. */
function ssDiff(f, before, list) {
  const after = ssIndex(list);
  if (after.noId.length || before.noId.length) {
    if (after.noId.slice().sort().join("\u0002") !== before.noId.slice().sort().join("\u0002")) return null;
  }
  const ops = [];
  for (const [k, j] of after.map) {
    if (before.map.get(k) === j) continue;
    if (after.dup.has(k) || before.dup.has(k) || !ssDocId(f, k)) return null;
    ops.push({ id: k, rec: JSON.parse(j) });
  }
  for (const k of before.map.keys()) if (!after.map.has(k)) { if (before.dup.has(k) || !ssDocId(f, k)) return null; ops.push({ id: k, del: true }); }
  ops.after = after;       // picha mpya ya cloud baada ya kuandika haya
  return ops;
}
/* ops → maandishi [aina, ref, data] ya hati ndogo */
function ssOverlayWrites(col, f, ops, seqOf, baseHash) {
  return ops.map((op) => {
    const seq = (seqOf && seqOf.get(op.id)) || ssSeq(), d = op.del ? { f, id: op.id, seq, del: true, at: Date.now() } : { f, id: op.id, seq, rec: op.rec };
    const bb = baseHash && baseHash.get(String(op.id));
    if (bb) d.bb = bb;
    return ["set", col.doc(ssDocId(f, op.id)), d];
  });
}
function ssChunk(list) {
  const chunks = [[]]; let size = 0;
  (list || []).forEach((item) => {
    const len = JSON.stringify(item).length + 1;
    if (size + len > SS_PART_LIMIT && chunks[chunks.length - 1].length) { chunks.push([]); size = 0; }
    chunks[chunks.length - 1].push(item); size += len;
  });
  return chunks;
}
/* Andika orodha NZIMA kwenye msingi (v2:true) na ufute hati ndogo zake zote — kwa mabadiliko makubwa na compaction */
function ssFullWrites(col, f, list, docs, extraIds) {
  const chunks = ssChunk(list), w = [], gone = new Set();
  chunks.forEach((items, i) => w.push(["set", col.doc(f + "__" + i), { part: i, of: chunks.length, items, v2: true }]));
  Object.keys(docs || {}).forEach((id) => {
    if (id.startsWith(f + "__") && /__\d+$/.test(id) && Number(id.slice(f.length + 2)) >= chunks.length) w.push(["del", col.doc(id)]);
    else if (id.startsWith("r_" + f + "_") && docs[id] && docs[id].f === f) { gone.add(id); w.push(["del", col.doc(id)]); }
  });
  (extraIds || []).forEach((id) => { if (!gone.has(id)) w.push(["del", col.doc(id)]); });   // hati ndogo zilizotumwa na kifaa hiki, bado hazijarudi
  return w;
}
/* Tuma maandishi. Yakitosha batch moja (≤450) → batch MOJA (yote au hakuna). Yakizidi: kwanza yote ya kuandika,
   na ya KUFUTA (hati ndogo) baada ya hayo kufika cloud — ili msingi usibaki bila data ikiwa batch moja imekataliwa. */
function ssCommit(db, writes) {
  const run = (list) => {
    const jobs = [];
    for (let i = 0; i < list.length; i += SS_BATCH) {
      const b = db.batch();
      list.slice(i, i + SS_BATCH).forEach(([k, r, d, o]) => (k === "del" ? b.delete(r) : o ? b.set(r, d, o) : b.set(r, d)));
      jobs.push(b.commit());
    }
    return Promise.all(jobs);
  };
  if (writes.length <= SS_BATCH) return run(writes);
  return run(writes.filter((w) => w[0] !== "del")).then(() => run(writes.filter((w) => w[0] === "del")));
}
/* Muda wa rekodi mpya: usiwe chini ya "kata" yoyote ya ripoti (History / PDF). Kifaa chenye saa iliyo nyuma
   kingeandika mauzo mapya yenye muda wa "zamani" → yangejificha yenyewe kwenye History / yaliyoondolewa. */
function ssMaxCut(settings) {
  const s = settings || {};
  let m = Number(s.reportClearedAt) || 0;
  Object.values(s.repArch || {}).forEach((v) => { m = Math.max(m, Number(v) || 0); });
  (s.repPurge || []).forEach((p) => { m = Math.max(m, Number(p && p.at) || 0); });
  return m;
}
function ssNow(settings) { return Math.max(Date.now(), ssMaxCut(settings) + 1); }
/* Settings: tuma ufunguo uliobadilika TU (na ufute uliofutwa). Zamani settings nzima ilitumwa kwa merge, hivyo
   ufunguo uliofutwa ndani ya ramani (mf. "Rudisha kutoka History") haukufutika cloud, na kifaa kimoja
   kilirudisha thamani za zamani za vifaa vingine. */
function ssSettingsPatch(before, after) {
  const FV = firebase.firestore.FieldValue, patch = {}, b = before || {}, a = after || {};
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
  const clean = (v) => JSON.parse(JSON.stringify(v));
  Object.keys(a).forEach((k) => {
    if (a[k] === undefined) { if (k in b) patch[k] = FV.delete(); return; }
    if (same(a[k], b[k])) return;
    if (isMap(a[k]) && isMap(b[k])) {
      const sub = {};
      Object.keys(a[k]).forEach((j) => { if (a[k][j] === undefined) { if (j in b[k]) sub[j] = FV.delete(); } else if (!same(a[k][j], b[k][j])) sub[j] = clean(a[k][j]); });
      Object.keys(b[k]).forEach((j) => { if (!(j in a[k])) sub[j] = FV.delete(); });
      if (Object.keys(sub).length) patch[k] = sub;
    } else patch[k] = a[k] === null ? null : clean(a[k]);
  });
  Object.keys(b).forEach((k) => { if (!(k in a)) patch[k] = FV.delete(); });
  return patch;
}
