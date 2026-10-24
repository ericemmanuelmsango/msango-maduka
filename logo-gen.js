/* =====================================================================
   ✨ KITENGENEZA-LOGO (Kiwanda) — logo 30 za kuchagua, papo hapo, bila mtandao wala AI.
   Inatumia jina la duka + aina ya biashara: aikoni za sekta hiyo × miundo × rangi.
   logoIdeas(name, industry, color, seed) → [{id, svg}]   ·   logoToPng(svg) → Promise<dataURL>
   ===================================================================== */
(function () {
  /* ---------- aikoni (kisanduku 100×100). "f" = kujaza, "s" = mstari ---------- */
  const GEAR = "89.5,43.7 97.8,45.5 97.8,54.5 89.5,56.3 85.6,68.2 91.3,74.4 86.0,81.7 78.3,78.3 68.2,85.6 69.1,94.1 60.5,96.8 56.3,89.5 43.7,89.5 39.5,96.8 30.9,94.1 31.8,85.6 21.7,78.3 14.0,81.7 8.7,74.4 14.4,68.2 10.5,56.3 2.2,54.5 2.2,45.5 10.5,43.7 14.4,31.8 8.7,25.6 14.0,18.3 21.7,21.7 31.8,14.4 30.9,5.9 39.5,3.2 43.7,10.5 56.3,10.5 60.5,3.2 69.1,5.9 68.2,14.4 78.3,21.7 86.0,18.3 91.3,25.6 85.6,31.8";
  const I = {
    gear: (c, b) => `<polygon points="${GEAR}" fill="${c}"/><circle cx="50" cy="50" r="18" fill="${b}"/>`,
    nut: (c, b) => `<polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="${c}"/><circle cx="50" cy="50" r="20" fill="${b}"/>`,
    piston: (c, b) => `<rect x="18" y="6" width="64" height="40" rx="9" fill="${c}"/><rect x="18" y="16" width="64" height="4" fill="${b}"/><rect x="18" y="24" width="64" height="4" fill="${b}"/><polygon points="43,44 57,44 55,80 45,80" fill="${c}"/><circle cx="50" cy="84" r="12" fill="none" stroke="${c}" stroke-width="7"/>`,
    wrench: (c) => `<path d="M66 8a22 22 0 0 0-20 30L10 74a8 8 0 0 0 12 12l36-36a22 22 0 0 0 30-20l-13 13-12-3-3-12z" fill="${c}"/>`,
    bolt: (c) => `<polygon points="56,4 18,56 46,56 40,96 82,40 54,40" fill="${c}"/>`,
    tyre: (c, b) => `<circle cx="50" cy="50" r="44" fill="${c}"/><circle cx="50" cy="50" r="26" fill="${b}"/><circle cx="50" cy="50" r="12" fill="${c}"/>`,
    scissors: (c) => `<g fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"><circle cx="26" cy="74" r="13"/><circle cx="74" cy="74" r="13"/><path d="M35 64L78 10M65 64L22 10"/></g>`,
    comb: (c) => `<rect x="10" y="18" width="80" height="18" rx="6" fill="${c}"/><g stroke="${c}" stroke-width="6" stroke-linecap="round">${[18, 30, 42, 54, 66, 78].map((x) => `<path d="M${x} 36V84"/>`).join("")}</g>`,
    face: (c) => `<path d="M50 8c-20 0-34 16-34 38 0 16 8 30 18 38v10h32V84c10-8 18-22 18-38C84 24 70 8 50 8z" fill="${c}"/>`,
    cross: (c) => `<path d="M38 8h24v30h30v24H62v30H38V62H8V38h30z" fill="${c}"/>`,
    pill: (c, b) => `<g transform="rotate(-40 50 50)"><rect x="12" y="34" width="76" height="32" rx="16" fill="${c}"/><rect x="50" y="34" width="38" height="32" rx="16" fill="${b}" opacity=".55"/></g>`,
    leaf: (c) => `<path d="M88 10C40 10 12 34 12 66c0 10 4 18 10 24 6-22 22-38 44-48-18 14-30 30-36 52 46 0 58-40 58-84z" fill="${c}"/>`,
    cup: (c) => `<path d="M14 36h56v26a24 24 0 0 1-24 24h-8a24 24 0 0 1-24-24z" fill="${c}"/><path d="M70 44h6a12 12 0 0 1 0 24h-8" fill="none" stroke="${c}" stroke-width="7"/><path d="M32 8c-6 8 6 12 0 20M48 8c-6 8 6 12 0 20" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><rect x="10" y="88" width="66" height="6" rx="3" fill="${c}"/>`,
    fork: (c) => `<g fill="${c}"><path d="M24 6h5v26h5V6h5v26h5V6h5v30a12 12 0 0 1-9 12v46h-8V48a12 12 0 0 1-8-12z"/><path d="M72 6c10 0 14 14 14 28 0 10-5 16-10 18v42h-8V52c-5-2-10-8-10-18 0-14 4-28 14-28z"/></g>`,
    flame: (c) => `<path d="M52 4c4 18 30 28 30 56a32 32 0 0 1-64 0c0-14 8-22 14-28 0 10 4 16 10 18-4-18 2-34 10-46z" fill="${c}"/>`,
    key: (c, b) => `<circle cx="30" cy="40" r="24" fill="${c}"/><circle cx="30" cy="40" r="9" fill="${b}"/><path d="M48 54l40 40-8 0-6-6-6 6-6-6 6-6-20-20z" fill="${c}"/>`,
    bed: (c) => `<g fill="${c}"><rect x="8" y="22" width="8" height="64" rx="3"/><rect x="16" y="54" width="76" height="16" rx="4"/><rect x="84" y="62" width="8" height="24" rx="3"/><circle cx="32" cy="44" r="10"/><rect x="46" y="36" width="44" height="16" rx="8"/></g>`,
    star: (c) => `<polygon points="50,6 62,38 96,38 68,58 79,92 50,72 21,92 32,58 4,38 38,38" fill="${c}"/>`,
    house: (c, b) => `<polygon points="50,8 94,46 82,46 82,92 18,92 18,46 6,46" fill="${c}"/><rect x="40" y="62" width="20" height="30" fill="${b}"/>`,
    hanger: (c) => `<path d="M50 30v-6a10 10 0 1 1 10-10M50 30L8 74h84z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`,
    diamond: (c, b) => `<polygon points="22,12 78,12 96,36 50,92 4,36" fill="${c}"/><path d="M4 36h92M22 12l14 24 14-24 14 24 14-24M36 36l14 56 14-56" fill="none" stroke="${b}" stroke-width="3" opacity=".6"/>`,
    dress: (c) => `<path d="M38 6h24l-4 20 10 14-4 8 20 46H16l20-46-4-8 10-14z" fill="${c}"/>`,
    phone: (c, b) => `<rect x="26" y="4" width="48" height="92" rx="10" fill="${c}"/><rect x="32" y="14" width="36" height="62" rx="3" fill="${b}"/><circle cx="50" cy="86" r="4" fill="${b}"/>`,
    signal: (c) => `<g fill="${c}"><rect x="8" y="66" width="16" height="26" rx="3"/><rect x="30" y="48" width="16" height="44" rx="3"/><rect x="52" y="28" width="16" height="64" rx="3"/><rect x="74" y="8" width="16" height="84" rx="3"/></g>`,
    cart: (c) => `<path d="M6 12h14l12 52h50l10-36H26" fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="38" cy="82" r="8" fill="${c}"/><circle cx="76" cy="82" r="8" fill="${c}"/>`,
    basket: (c, b) => `<path d="M8 40h84l-10 48H18z" fill="${c}"/><path d="M28 40L44 10M72 40L56 10" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M34 52v26M50 52v26M66 52v26" stroke="${b}" stroke-width="5"/>`,
    bag: (c, b) => `<rect x="12" y="30" width="76" height="62" rx="8" fill="${c}"/><path d="M34 42V26a16 16 0 0 1 32 0v16" fill="none" stroke="${b}" stroke-width="7"/>`,
    truck: (c, b) => `<rect x="4" y="22" width="58" height="46" rx="4" fill="${c}"/><path d="M62 36h18l14 16v16H62z" fill="${c}"/><rect x="68" y="42" width="12" height="10" fill="${b}"/><circle cx="24" cy="76" r="10" fill="${c}" stroke="${b}" stroke-width="4"/><circle cx="76" cy="76" r="10" fill="${c}" stroke="${b}" stroke-width="4"/>`,
    box: (c, b) => `<polygon points="50,6 92,26 92,74 50,94 8,74 8,26" fill="${c}"/><path d="M8 26l42 20 42-20M50 46v48" fill="none" stroke="${b}" stroke-width="4"/>`,
    arrows: (c) => `<path d="M10 38h62l-14-14M90 62H28l14 14" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
  const BY_IND = {
    spea: ["gear", "nut", "piston", "wrench", "bolt", "tyre"],
    supermarket: ["cart", "basket", "bag", "star", "leaf"],
    hoteli: ["key", "bed", "star", "house"],
    mgahawa: ["cup", "fork", "flame", "star"],
    famasia: ["cross", "pill", "leaf", "star"],
    saluni: ["scissors", "comb", "face", "star"],
    boutique: ["hanger", "diamond", "dress", "bag"],
    simu: ["phone", "signal", "bolt", "star"],
    msambazaji: ["truck", "box", "arrows", "star"],
  };
  /* rangi: [kuu, msisitizo, maandishi juu ya kuu] */
  const PALETTES = [["#12264a", "#c9a227", "#ffffff"], ["#b91c1c", "#111111", "#ffffff"], ["#ea580c", "#1f2937", "#ffffff"], ["#0f766e", "#fbbf24", "#ffffff"],
    ["#166534", "#a3e635", "#ffffff"], ["#6d28d9", "#f472b6", "#ffffff"], ["#1d4ed8", "#38bdf8", "#ffffff"], ["#7f1d1d", "#fde68a", "#ffffff"], ["#111827", "#f59e0b", "#ffffff"], ["#be185d", "#fde047", "#ffffff"]];
  const FONTS = ["Arial Black, Arial, Helvetica, sans-serif", "Georgia, 'Times New Roman', serif", "Impact, 'Arial Narrow', Arial, sans-serif", "Verdana, Arial, sans-serif"];

  const xmlEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const words = (n) => String(n || "").replace(/[^\p{L}\p{N}& ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const initials = (n) => words(n).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";
  const shortName = (n) => { const w = words(n); let s = w[0] || ""; if (w[1] && (s + " " + w[1]).length <= 14) s += " " + w[1]; return s.toUpperCase(); };
  const restName = (n) => { const w = words(n), first = shortName(n).split(" ").length; return w.slice(first).join(" ").toUpperCase(); };
  /* ukubwa wa herufi unaotoshea upana */
  const fit = (t, w, max, k) => Math.max(16, Math.min(max, Math.floor(w / (Math.max(1, t.length) * (k || 0.62)))));
  function hashSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const icon = (k, c, b, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 100})">${I[k](c, b)}</g>`;

  /* ---------- miundo 8 (kila moja 400×400) ---------- */
  const LAYOUTS = {
    badge: (o) => { const t = shortName(o.name); return `<circle cx="200" cy="200" r="190" fill="${o.p}"/><circle cx="200" cy="200" r="172" fill="none" stroke="${o.a}" stroke-width="6"/>${icon(o.ic, o.t, o.p, 130, 70, 140)}<text x="200" y="${o.rest ? 278 : 292}" text-anchor="middle" font-family="${o.f}" font-weight="900" font-size="${fit(t, 280, 54)}" fill="${o.t}">${xmlEsc(t)}</text>${o.rest ? `<text x="200" y="318" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" letter-spacing="3" font-size="${fit(o.rest, 230, 22, 0.75)}" fill="${o.a}">${xmlEsc(o.rest)}</text>` : ""}`; },
    shield: (o) => { const t = shortName(o.name); return `<path d="M200 12L370 66V196C370 300 292 362 200 390 108 362 30 300 30 196V66Z" fill="${o.p}" stroke="${o.a}" stroke-width="10"/>${icon(o.ic, o.a, o.p, 135, 66, 130)}<text x="200" y="262" text-anchor="middle" font-family="${o.f}" font-weight="900" font-size="${fit(t, 250, 50)}" fill="${o.t}">${xmlEsc(t)}</text>${o.rest ? `<text x="200" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" letter-spacing="3" font-size="${fit(o.rest, 200, 20, 0.75)}" fill="${o.a}">${xmlEsc(o.rest)}</text>` : ""}`; },
    hexa: (o) => `<polygon points="200,10 365,105 365,295 200,390 35,295 35,105" fill="${o.a}"/><polygon points="200,38 341,119 341,281 200,362 59,281 59,119" fill="${o.p}"/>${icon(o.ic, o.a, o.p, 150, 84, 100)}<text x="200" y="${o.ini.length > 1 ? 290 : 296}" text-anchor="middle" font-family="${o.f}" font-weight="900" font-size="${o.ini.length > 1 ? 96 : 110}" fill="${o.t}">${xmlEsc(o.ini)}</text>`,
    app: (o) => `<rect x="10" y="10" width="380" height="380" rx="86" fill="${o.p}"/>${icon(o.ic, o.t, o.p, 105, 70, 190)}<text x="200" y="350" text-anchor="middle" font-family="${o.f}" font-weight="900" font-size="${fit(shortName(o.name), 300, 46)}" fill="${o.a}">${xmlEsc(shortName(o.name))}</text>`,
    stack: (o) => { const t = shortName(o.name); return `<rect width="400" height="400" rx="40" fill="#ffffff"/>${icon(o.ic, o.p, "#ffffff", 140, 40, 120)}<text x="200" y="${o.rest ? 250 : 262}" text-anchor="middle" font-family="${o.f}" font-weight="900" font-size="${fit(t, 340, 64)}" fill="${o.p}">${xmlEsc(t)}</text><rect x="120" y="${o.rest ? 270 : 284}" width="160" height="8" rx="4" fill="${o.a}"/>${o.rest ? `<text x="200" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" letter-spacing="4" font-size="${fit(o.rest, 300, 26, 0.8)}" fill="#374151">${xmlEsc(o.rest)}</text>` : ""}`; },
    ring: (o) => `<rect width="400" height="400" rx="40" fill="#ffffff"/><circle cx="200" cy="200" r="170" fill="none" stroke="${o.p}" stroke-width="22"/><circle cx="200" cy="200" r="138" fill="${o.a}" opacity=".18"/><text x="200" y="${o.ini.length > 1 ? 236 : 244}" text-anchor="middle" font-family="${o.f}" font-weight="900" font-size="${o.ini.length > 1 ? 130 : 150}" fill="${o.p}">${xmlEsc(o.ini)}</text>${icon(o.ic, o.a, "#ffffff", 300, 20, 76)}`,
    split: (o) => { const t = shortName(o.name); return `<rect width="400" height="400" rx="40" fill="${o.p}"/><rect y="250" width="400" height="150" rx="0" fill="${o.a}"/><rect y="360" width="400" height="40" rx="0" fill="${o.a}"/>${icon(o.ic, o.t, o.p, 140, 60, 120)}<text x="200" y="${o.rest ? 318 : 340}" text-anchor="middle" font-family="${o.f}" font-weight="900" font-size="${fit(t, 340, 58)}" fill="${o.p}">${xmlEsc(t)}</text>${o.rest ? `<text x="200" y="362" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" letter-spacing="3" font-size="${fit(o.rest, 300, 22, 0.75)}" fill="${o.p}">${xmlEsc(o.rest)}</text>` : ""}`; },
    stamp: (o) => { const t = shortName(o.name); return `<rect width="400" height="400" rx="40" fill="${o.a}"/><rect x="34" y="34" width="332" height="332" rx="26" fill="none" stroke="${o.p}" stroke-width="10" stroke-dasharray="2 14" stroke-linecap="round"/>${icon(o.ic, o.p, o.a, 145, 72, 110)}<text x="200" y="262" text-anchor="middle" font-family="${o.f}" font-weight="900" font-size="${fit(t, 290, 54)}" fill="${o.p}">${xmlEsc(t)}</text><text x="200" y="306" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" letter-spacing="4" font-size="20" fill="${o.p}">${xmlEsc(o.place)}</text>`; },
  };
  const LKEYS = Object.keys(LAYOUTS);

  /** logo 30 (au n) za kuchagua kwa duka hili. seed tofauti → seti mpya. */
  function logoIdeas(name, industry, color, seed, n) {
    n = n || 30;
    const icons = BY_IND[industry] || BY_IND.spea;
    const R = rng(hashSeed((name || "") + "|" + (industry || "") + "|" + (seed || 0)));
    const pals = PALETTES.slice();
    if (/^#[0-9a-f]{6}$/i.test(color || "")) pals.unshift([color, "#f5c518", "#ffffff"]);
    const combos = [];
    LKEYS.forEach((l) => icons.forEach((ic) => combos.push([l, ic])));
    for (let i = combos.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [combos[i], combos[j]] = [combos[j], combos[i]]; }
    // kila muundo uonekane mapema: panga kwa muundo kwa zamu
    const byL = {}; combos.forEach((c) => (byL[c[0]] = byL[c[0]] || []).push(c));
    const order = []; for (let k = 0; order.length < combos.length; k++) LKEYS.forEach((l) => byL[l] && byL[l][k] && order.push(byL[l][k]));
    const out = [];
    for (let i = 0; i < n; i++) {
      const [l, ic] = order[i % order.length];
      const [p, a, t] = pals[(i + Math.floor(R() * 3)) % pals.length];
      const o = { name: name || "Duka", ini: initials(name), rest: restName(name).slice(0, 22), ic, p, a, t, f: FONTS[Math.floor(R() * FONTS.length)], place: "MWANZA" };
      out.push({ id: `${l}-${ic}-${i}`, layout: l, icon: ic, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${LAYOUTS[l](o)}</svg>` });
    }
    return out;
  }
  /** SVG → PNG data URL (256×256), tayari kuwa logo ya mteja */
  function logoToPng(svg, size) {
    size = size || 256;
    return new Promise((ok, bad) => {
      const im = new Image();
      im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = size; c.getContext("2d").drawImage(im, 0, 0, size, size); ok(c.toDataURL("image/png")); };
      im.onerror = () => bad(new Error("Logo haikutengenezeka"));
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  window.logoIdeas = logoIdeas; window.logoToPng = logoToPng; window.LOGO_ICONS_BY_INDUSTRY = BY_IND;
})();
