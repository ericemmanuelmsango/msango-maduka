/* 🎬 Maduka ya DEMO — data ya mfano kwa kila aina ya biashara, ili Eric amwonyeshe mteja mfumo
   ukiwa na bidhaa, mauzo na ripoti, bila kufungua mfumo wa mteja halisi. Kiwanda → 🎬 Demo. */
const DEMO_PIN = "1234", DEMO_PW = "demo";
function demoCode(ind) { return "demo-" + ind; }
function demoDay(off) { const d = new Date(Date.now() + (off || 0) * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

async function demoSeed(ind) {
  const now = Date.now(), T = demoDay(0), Y = demoDay(-1), D2 = demoDay(-2);
  const out = {};
  const cfg = (id, t, d) => (out[id] = { id, t, k: "cfg", at: now, by: "Demo", ...d });
  const tx = (id, t, day, d) => (out[id] = { id, t, k: "tx", day, at: now - 3600e3, by: "Demo", ...d });
  const it = (name, price, qty, cost) => ({ name, price, qty, cost: cost || 0 });

  if (ind === "spea") {
    const P = [["BRAKE PAD BOXER", "Brake", 6000, 4200, 14], ["CHAIN SET TVS", "Chain", 25000, 19000, 6], ["PLUG NGK C7HSA", "Electrical", 3000, 2000, 40],
      ["BEARING 6204", "Bearing", 5000, 3500, 18], ["CLUTCH PLATE TVS", "Engine", 9000, 6500, 2], ["OIL CASTROL 1L", "Oil", 12000, 9500, 15],
      ["TAIRI 2.75-17", "Tyre", 45000, 36000, 4], ["BULB HEAD LIGHT 12V", "Electrical", 2500, 1500, 0], ["CABLE CLUTCH", "Cable", 4000, 2600, 12], ["MIRROR SET", "Body", 8000, 5500, 7]];
    const stockItems = P.map((p, i) => ({ id: "i" + i, name: p[0], category: p[1], store: "dukani", lowStockLimit: 3 }));
    const products = P.map((p, i) => ({ id: "p" + i, name: p[0], price: p[2], buyPrice: p[3] }));
    const stockMovements = P.map((p, i) => ({ id: "m" + i, itemId: "i" + i, type: "in", qty: p[4] + 3, price: p[3], date: D2 }));
    const sales = [];
    [[T, 0, 2, "Juma Bodaboda"], [T, 2, 3, ""], [Y, 5, 1, "Peter Garage"], [Y, 1, 1, "Mama Neema"], [D2, 3, 2, ""], [D2, 8, 1, "Juma Bodaboda"]].forEach(([d, i, q, c], k) =>
      sales.push({ id: "s" + k, date: d, itemId: "i" + i, itemName: P[i][0], qty: q, sellPrice: P[i][2], total: q * P[i][2], buyPrice: P[i][3], customer: c, store: "dukani" }));
    const E = (id, name, phone, amt, paid, due) => ({ id, kind: "owed_to_me", name, phone, dueDate: due, dateCreated: D2, archived: false,
      payments: paid ? [{ id: id + "p", amount: paid, date: Y }] : [], charges: [{ id: id + "c", amount: amt, date: D2, note: "Spea" }] });
    out.data = { settings: { appPassword: DEMO_PW, reportsPassword: DEMO_PW } };
    // muundo uleule wa Wadai: kila orodha kwenye hati zake (field__0)
    const lists = { stockItems, products, stockMovements, sales, entries: [E("e1", "Peter Garage", "0754 111 222", 250000, 50000, T), E("e2", "Mama Neema", "0713 222 333", 80000, 0, demoDay(5))], deliveries: [] };
    Object.entries(lists).forEach(([f, items]) => (out[f + "__0"] = { part: 0, of: 1, items }));
    const uid = "u_demo";
    out.pos_settings = { users: [{ id: uid, name: "Demo", role: "owner", active: true, pinHash: await dukaPinHash(uid, DEMO_PIN) }] };
    [[0, 1], [2, 2], [5, 1]].forEach(([i, q], k) => {
      out["possale_d" + k] = { id: "d" + k, no: "R0010" + k, createdAt: now - (k + 1) * 1800e3, date: T, store: "dukani", mode: "rejareja", pay: k === 1 ? "Simu/Benki" : "Cash",
        customer: k === 0 ? "Juma Bodaboda" : "", phone: "", userId: uid, userName: "Demo",
        items: [{ itemId: "i" + i, name: P[i][0], category: P[i][1], qty: q, price: P[i][2], listPrice: P[i][2], buy: P[i][3], lineTotal: q * P[i][2] }],
        total: q * P[i][2], paid: q * P[i][2], deleted: false };
    });
    return out;
  }
  if (ind === "supermarket") {
    [["Sukari 1kg", "Vyakula", 3200, 2800, 40], ["Mafuta ya kupikia 3L", "Vyakula", 15000, 13000, 12], ["Mchele 5kg", "Vyakula", 14000, 12000, 20],
     ["Unga sembe 2kg", "Vyakula", 4200, 3600, 30], ["Sabuni ya unga 1kg", "Usafi", 6500, 5500, 3], ["Maji 1.5L", "Vinywaji", 1200, 900, 48],
     ["Soda 500ml", "Vinywaji", 1000, 750, 0], ["Chumvi 1kg", "Vyakula", 800, 600, 20]].forEach((p, i) =>
      cfg("prod_d" + i, "prod", { name: p[0], code: "", cat: p[1], unit: "pc", price: p[2], cost: p[3], min: 5, sup: "Jumla Traders", qty: p[4] }));
    tx("sale_d1", "sale", T, { items: [it("Sukari 1kg", 3200, 3, 2800), it("Mafuta ya kupikia 3L", 15000, 1, 13000)], total: 24600, customer: "Mama Neema", pay: "Cash" });
    tx("sale_d2", "sale", T, { items: [it("Maji 1.5L", 1200, 6, 900)], total: 7200, customer: "", pay: "Cash" });
    tx("sale_d3", "sale", Y, { items: [it("Mchele 5kg", 14000, 1, 12000)], total: 14000, customer: "", pay: "Simu" });
  } else if (ind === "famasia") {
    [["Panadol 500mg", "Paracetamol", "500mg", "Vidonge", 2000, 1200, false], ["Amoxil 500mg", "Amoxicillin", "500mg", "Kapsuli", 1500, 900, true],
     ["ORS", "Oral rehydration salts", "20.5g", "Pakiti", 500, 300, false], ["Cetrizine 10mg", "Cetirizine", "10mg", "Vidonge", 1000, 600, false],
     ["Metformin 500mg", "Metformin", "500mg", "Vidonge", 3000, 2000, true]].forEach((d, i) => {
      cfg("drug_d" + i, "drug", { name: d[0], generic: d[1], strength: d[2], form: d[3], unit: "kadi", price: d[4], cost: d[5], min: 10, cat: "Dawa", code: "", rx: d[6] });
      cfg("batch_d" + i, "batch", { drug: "drug_d" + i, no: "B" + (2401 + i), exp: demoDay(i === 2 ? 40 : 300 + i * 30), qty: [60, 25, 8, 40, 30][i], cost: d[5], received: D2 });
    });
    tx("sale_d1", "sale", T, { items: [it("Panadol 500mg", 2000, 2, 1200)], total: 4000, customer: "Juma" });
    tx("sale_d2", "sale", Y, { items: [it("ORS", 500, 4, 300), it("Cetrizine 10mg", 1000, 1, 600)], total: 3000, customer: "" });
  } else if (ind === "boutique") {
    const vk = (s, c) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "__" + String(c).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    [["Gauni la kitenge", "Wanawake", 45000, 30000, ["S", "M", "L"], ["Nyekundu", "Bluu"]], ["Suti ya kiume", "Wanaume", 180000, 130000, ["40", "42", "44"], ["Nyeusi"]],
     ["Viatu vya ngozi", "Viatu", 65000, 45000, ["39", "41", "43"], ["Kahawia"]], ["T-shirt ya pamba", "Wanaume", 15000, 9000, ["M", "L", "XL"], ["Nyeupe", "Nyeusi"]]].forEach((s, i) => {
      const v = {}; s[4].forEach((z, a) => s[5].forEach((c, b) => (v[vk(z, c)] = 2 + ((a + b + i) % 4))));
      cfg("style_d" + i, "style", { name: s[0], cat: s[1], brand: "", price: s[2], cost: s[3], disc: 0, code: "", sizes: s[4], colors: s[5], v });
    });
    cfg("cust_d1", "cust", { name: "Asha Mohamed", phone: "0754 300 400", bday: "", sizes: "M", points: 120, credit: 0, spent: 240000, visits: 6, since: D2 });
    tx("sale_d1", "sale", T, { items: [it("Gauni la kitenge", 45000, 1, 30000)], total: 45000, custName: "Asha Mohamed" });
  } else if (ind === "simu") {
    [["Samsung A15", "Samsung", "Simu", 420000, 360000, 12, true], ["Tecno Spark 20", "Tecno", "Simu", 320000, 280000, 12, true],
     ["Earphones JBL", "JBL", "Vifaa", 25000, 15000, 3, false], ["Chaja 25W", "Samsung", "Vifaa", 18000, 11000, 3, false]].forEach((p, i) =>
      cfg("prod_d" + i, "prod", { name: p[0], brand: p[1], cat: p[2], price: p[3], cost: p[4], warrantyM: p[5], serial: p[6], qty: p[6] ? 0 : 15 }));
    ["35617201", "35617202", "35617203"].forEach((im, j) => cfg("unit_d" + j, "unit", { prod: j < 2 ? "prod_d0" : "prod_d1", imei: im + "4455" + j, imei2: "", color: j ? "Nyeusi" : "Bluu", storage: "128GB", cost: j < 2 ? 360000 : 280000, sup: "Kariakoo", status: "stock", inDay: D2 }));
    tx("sale_d1", "sale", T, { items: [it("Tecno Spark 20", 320000, 1, 280000)], total: 320000, customer: "Peter" });
    tx("job_d1", "job", T, { total: 45000, partsCost: 20000, customer: "Peter", device: "iPhone 11" });
  } else if (ind === "mgahawa") {
    ["Meza 1", "Meza 2", "Meza 3", "Meza 4", "Meza 5", "Meza 6"].forEach((n, i) => cfg("tbl_d" + i, "tbl", { name: n, area: i < 4 ? "Ndani" : "Nje", seats: 4 }));
    [["Pilau ya nyama", "Chakula", 8000, 4500, "jikoni"], ["Chips kuku", "Chakula", 7000, 4000, "jikoni"], ["Wali maharage", "Chakula", 4000, 2000, "jikoni"],
     ["Chai", "Vinywaji", 1000, 400, "bar"], ["Soda", "Vinywaji", 1000, 700, "bar"], ["Juisi ya embe", "Vinywaji", 2500, 1200, "bar"]].forEach((m, i) =>
      cfg("item_d" + i, "item", { name: m[0], cat: m[1], price: m[2], cost: m[3], station: m[4], avail: true }));
    tx("ord_d1", "ord", T, { items: [{ lid: "a", item: "item_d1", name: "Chips kuku", price: 7000, qty: 2 }, { lid: "b", item: "item_d4", name: "Soda", price: 1000, qty: 2 }], total: 16000, customer: "", tableName: "Meza 3" });
  } else if (ind === "saluni") {
    [["Kusuka rasta", "Nywele", 30000, 180, 30], ["Kunyoa", "Nywele", 5000, 30, 40], ["Manicure", "Kucha", 10000, 45, 30], ["Facial", "Ngozi", 25000, 60, 30]].forEach((s, i) =>
      cfg("svc_d" + i, "svc", { name: s[0], cat: s[1], price: s[2], dur: s[3], comm: s[4] }));
    [["Neema", "#c2185b"], ["Asha", "#6a1b9a"], ["Juma", "#00838f"]].forEach((s, i) => cfg("sty_d" + i, "sty", { name: s[0], phone: "", comm: 30, color: s[1], active: true }));
    cfg("prod_d1", "prod", { name: "Mafuta ya nywele", price: 12000, cost: 8000, qty: 10 });
    tx("visit_d1", "visit", T, { items: [{ kind: "svc", id: "svc_d0", name: "Kusuka rasta", price: 30000, qty: 1, comm: 9000 }], total: 30000, client: "Halima" });
  } else if (ind === "hoteli") {
    cfg("rtype_d1", "rtype", { name: "Single", rate: 35000, desc: "Kitanda kimoja, feni" });
    cfg("rtype_d2", "rtype", { name: "Deluxe", rate: 60000, desc: "AC, TV, kifungua kinywa" });
    ["101", "102", "103", "104", "201", "202", "203", "204"].forEach((no, i) => cfg("room_d" + i, "room", { no, type: i < 4 ? "rtype_d1" : "rtype_d2", floor: no[0], status: "" }));
    tx("pay_d1", "pay", T, { amt: 60000, guest: "Mr. John", what: "Malipo", room: "" });
  } else if (ind === "msambazaji") {
    cfg("route_d1", "route", { name: "Igoma – Buhongwa", rep: "Baraka", vehicle: "T 123 ABC", days: ["1", "3", "5"] });
    [["Duka la Baraka", "Baraka", "Igoma"], ["Mama Neema Shop", "Neema", "Buhongwa"], ["Kirumba Traders", "Hassan", "Kirumba"]].forEach((c, i) =>
      cfg("cust_d" + i, "cust", { name: c[0], owner: c[1], phone: "07" + (54000100 + i), area: c[2], route: "route_d1", limit: 1000000, tin: "", since: D2 }));
    [["Unga 25kg", "mfuko", 1, 38000, 34000, 120], ["Sukari 50kg", "mfuko", 1, 160000, 148000, 30], ["Mafuta 20L", "dumu", 1, 95000, 86000, 25]].forEach((p, i) =>
      cfg("prod_d" + i, "prod", { name: p[0], unit: p[1], pack: p[2], price: p[3], cost: p[4], min: 10, qty: p[5] }));
    tx("ord_d1", "ord", T, { status: "imefikishwa", items: [{ name: "Unga 25kg", price: 38000, qty: 10, cost: 34000 }], total: 380000, custName: "Duka la Baraka", cust: "cust_d0" });
    tx("ord_d2", "ord", T, { status: "mpya", items: [{ name: "Sukari 50kg", price: 160000, qty: 2, cost: 148000 }], total: 320000, custName: "Mama Neema Shop", cust: "cust_d1" });
  }
  return out;
}

/* tengeneza (au rudisha upya) duka la demo — msimamizi tu */
async function demoCreate(ind, dataOnly) {
  const code = demoCode(ind), x = INDUSTRIES[ind] || INDUSTRIES.spea, ref = db.collection("shops").doc(code);
  const shop = { name: "Demo · " + x.name, industry: ind, edition: "pro", features: presetFeatures("pro"), users: 5, monthly: 0,
    brand: { color: "", tagline: "Mfumo wa mfano — Msango Maduka", theme: x.theme || "", logo: "", palette: "" },
    members: [], ownerEmail: "", phone: "", location: "Mwanza", active: true, paidUntil: Date.now() + 3650 * DAY, createdAt: Date.now(), demo: true, notes: "" };
  if (!dataOnly) {   // mfanyakazi anarudisha data tu; kutengeneza duka ni kwa msimamizi
    const old = await ref.get();
    if (!old.exists) await ref.set(shop); else await ref.update({ active: true, paidUntil: shop.paidUntil, demo: true });
    await db.collection("brands").doc(code).set(shopPublic(shop));
  }
  const col = ref.collection("data"), cur = await col.get();
  for (const d of cur.docs) await d.ref.delete();
  const seed = await demoSeed(ind);
  for (const [id, d] of Object.entries(seed)) await col.doc(id).set(d);
  return code;
}
