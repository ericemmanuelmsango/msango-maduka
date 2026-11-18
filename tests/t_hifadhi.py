"""🔒 Hifadhi salama (hifadhi.js): mauzo/madeni hayapotei vifaa viwili vikihifadhi pamoja, mauzo moja ni hati ndogo,
History inarudishwa, saa ya kifaa iliyo nyuma haifichi mauzo, compaction inaunganisha hati ndogo kwa usalama."""
from h import *
import h
# Firestore halisi inatuma taarifa za mabadiliko BAADAYE kidogo (si papo hapo) — iga hivyo
h.FAKE = h.FAKE.replace("function notify() { subs.forEach((f) => f()); }", "function notify() { setTimeout(() => subs.forEach((f) => f()), 30); }")

D = "2026-11-18"
BASE = {
    "products": [{"id": "p1", "name": "BULB", "price": 2000, "buyPrice": 1000}],
    "stockItems": [{"id": "d1", "name": "BULB", "store": "dukani", "category": "Normal goods"}],
    "stockMovements": [{"id": "m1", "itemId": "d1", "type": "in", "qty": 100, "price": 1000, "date": D}],
    "sales": [{"id": "s0", "itemId": "d1", "itemName": "BULB", "sellPrice": 2000, "qty": 1, "total": 2000, "date": D, "store": "dukani", "customer": "Zamani", "createdAt": 1}],
    "entries": [{"id": "c1", "kind": "owed_to_me", "name": "Juma", "phone": "0712", "dateCreated": D, "payments": [], "charges": [{"id": "ch1", "date": D, "amount": 50000, "description": "deni"}]}],
}
def st(extra_docs=None, settings=None):
    s = shop_store("sp1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345", **(settings or {})}},
        **{f + "__0": {"part": 0, "of": 1, "items": v} for f, v in BASE.items()}})
    s["shops/sp1"]["features"] = {"pos": True}
    for k, v in (extra_docs or {}).items(): s["shops/sp1/data/" + k] = v
    return s
CLOUD = """(f)=>{const d={}; for (const [k,v] of Object.entries(window.__store)) if (k.startsWith('shops/sp1/data/')) d[k.slice(15)]=v; return ssMerge(d,f).list}"""
def cloud(p, f): return p.evaluate(CLOUD, f)
def sell(p, who, qty=1):
    p.evaluate(f"SESSION_UNLOCKED=true; setPage('sales'); UI.saleForm.customer={who!r}; UI.saleForm.rows=[{{id:'r1',itemName:'BULB',price:'2000',qty:'{qty}'}}]; submitSale()"); p.wait_for_timeout(500)

with sync_playwright() as pw:
    # 1) vifaa viwili: A ameuza (imefika cloud, B hajaiona) → B anauza → mauzo YOTE yanabaki, stock sahihi
    p = open_page(pw, "index.html?duka=sp1", st()); p.wait_for_timeout(1200)
    p.evaluate("""()=>{window.__store['shops/sp1/data/r_sales_sA']={f:'sales',id:'sA',seq:1,rec:{id:'sA',itemId:'d1',itemName:'BULB',sellPrice:2000,qty:2,total:4000,date:'2026-11-18',store:'dukani',customer:'ALI',createdAt:Date.now()}};
      window.__store['shops/sp1/data/r_stockMovements_oA']={f:'stockMovements',id:'oA',seq:1,rec:{id:'oA',itemId:'d1',type:'out',qty:2,destination:'Sale',date:'2026-11-18'}};}""")
    n0 = len(p.evaluate("window.__fblog"))
    sell(p, "JUMA")
    names = [x["customer"] for x in cloud(p, "sales")]
    print("1) cloud:", names, "stock:", p.evaluate("qtyOf('d1')"))
    assert names == ["Zamani", "ALI", "JUMA"], names
    assert p.evaluate("qtyOf('d1')") == 97
    # mauzo moja = hati ndogo 2 (mauzo + stock), si orodha nzima
    w = [x for x in p.evaluate("window.__fblog")[n0:] if x.startswith("set shops/sp1/data/") and not x.endswith(("_hai", "_v2"))]
    print("   hati zilizoandikwa:", [x.split("/")[-1] for x in w])
    assert len(w) == 2 and all("/r_" in x for x in w), w
    size = p.evaluate("JSON.stringify(Object.entries(window.__store).filter(([k])=>k.includes('/r_sales_id-')).map(([,v])=>v)).length")
    assert size < 2000, size

    # 2) kufuta + kuhariri mauzo kunaandika hati ndogo ya rekodi hiyo tu
    sid = p.evaluate("STATE.sales.find(x=>x.customer==='JUMA').id")
    p.evaluate("window.confirm=()=>true"); p.evaluate(f"deleteSale('{sid}')"); p.wait_for_timeout(400)
    assert [x["customer"] for x in cloud(p, "sales")] == ["Zamani", "ALI"]
    assert p.evaluate("qtyOf('d1')") == 97, "kufuta mauzo hakurudishi stock"

    # 3) History: "Rudisha" inafuta ufunguo cloud (zamani merge haukufuta ufunguo wa ndani → mauzo yalibaki yamefichwa)
    p.evaluate("STATE.settings.repArch={...(STATE.settings.repArch||{}),'c:Zamani':Date.now(),'c:ALI':Date.now()}; saveSettings()"); p.wait_for_timeout(300)
    p.evaluate("const A={...STATE.settings.repArch}; delete A['c:Zamani']; STATE.settings.repArch=A; saveSettings()"); p.wait_for_timeout(300)
    arch = p.evaluate("Object.keys(window.__store['shops/sp1/data/data'].settings.repArch)")
    print("3) repArch cloud:", arch, "| appPassword bado ipo:", p.evaluate("window.__store['shops/sp1/data/data'].settings.appPassword"))
    assert arch == ["c:ALI"], arch
    assert p.evaluate("window.__store['shops/sp1/data/data'].settings.appPassword") == "pw12345"

    # 4) saa ya kifaa iko NYUMA saa 3: mauzo mapya ya ALI yasijifiche kwenye History iliyowekwa na kifaa kingine
    p.evaluate("STATE.settings.repArch={...STATE.settings.repArch,'c:ALI':Date.now()+3*3600e3}; saveSettings()"); p.wait_for_timeout(300)
    sell(p, "ALI")
    new = p.evaluate("(()=>{const s=STATE.sales.filter(x=>x.customer==='ALI').sort((a,b)=>b.createdAt-a.createdAt)[0]; const l=reportLinesAll().find(x=>x.id===s.id); return !repArchived(l)})()")
    print("4) mauzo mapya ya ALI yanaonekana kwenye ripoti ya sasa:", new)
    assert new
    p.browser_.close()

    # 5) POS inaongeza malipo ya Juma wakati Wadai (kifaa kingine) imeshabadilisha mteja huyo — yote mawili yanabaki
    s = st({"r_entries_c1": {"f": "entries", "id": "c1", "seq": 5, "rec": {**BASE["entries"][0], "phone": "0799 (Wadai)"}}})
    p = open_page(pw, "pos.html?duka=sp1", s); p.on("dialog", lambda d: d.accept()); p.wait_for_timeout(1000)
    # POS bado inaona toleo la zamani (simu 0712) — tunarudisha D ya zamani kuiga kuchelewa kwa mtandao
    p.evaluate("D.entries = D.entries.map(x => x.id==='c1' ? {...x, phone:'0712'} : x)")
    p.evaluate("txUpdateShared('entries', (list) => { const x=list.find(y=>y.id==='c1'); x.payments=[...(x.payments||[]),{amount:10000,date:'2026-11-18',via:'Cash'}]; return list; })"); p.wait_for_timeout(500)
    c1 = [x for x in cloud(p, "entries") if x["id"] == "c1"][0]
    print("5) Juma cloud:", c1["phone"], c1["payments"])
    assert c1["phone"] == "0799 (Wadai)" and c1["payments"][0]["amount"] == 10000
    assert p.evaluate("Object.keys(window.__store).filter(k=>k.endsWith('entries__0')).length") == 1
    assert len(cloud(p, "entries")) == 1
    p.browser_.close()

    # 6) compaction: hati ndogo nyingi → zinaunganishwa kwenye msingi (v2), data haibadiliki
    many = {f"r_stockMovements_x{i}": {"f": "stockMovements", "id": f"x{i}", "seq": i + 1, "rec": {"id": f"x{i}", "itemId": "d1", "type": "out", "qty": 0, "date": D}} for i in range(260)}
    old = 864e5 * 10
    p = open_page(pw, "index.html?duka=sp1", st({**many, "_v2": {"since": 1}})); p.evaluate("window.__ssWait=50"); p.wait_for_timeout(1500)
    p.evaluate("maybeCompact.busy=false; maybeCompact()"); p.wait_for_timeout(1200)
    left = p.evaluate("Object.keys(window.__store).filter(k=>k.includes('/r_stockMovements_')).length")
    base = p.evaluate("window.__store['shops/sp1/data/stockMovements__0']")
    print("6) baada ya compaction: hati ndogo", left, "| msingi:", len(base["items"]), "v2:", base.get("v2"))
    assert left == 0 and len(base["items"]) == 261 and base.get("v2") is True
    assert p.evaluate("qtyOf('d1')") == 100
    p.browser_.close()

    # 7) kifaa cha toleo la zamani kimeonekana karibuni → HAKUNA compaction (kingeweza kufuta msingi mpya)
    p = open_page(pw, "index.html?duka=sp1", st({**many, "_v2": {"since": 1, "oldAt": 10**13}})); p.evaluate("window.__ssWait=50"); p.wait_for_timeout(1500)
    p.evaluate("maybeCompact.busy=false; maybeCompact()"); p.wait_for_timeout(800)
    left = p.evaluate("Object.keys(window.__store).filter(k=>k.includes('/r_stockMovements_')).length")
    print("7) kifaa cha zamani kipo → hati ndogo zimebaki:", left)
    assert left == 260
    # 8) badiliko kubwa (>400 rekodi) → linaandikwa kwenye msingi wote mara moja, hati ndogo zinafutwa
    p.evaluate("STATE.products = Array.from({length: 500}, (_, i) => ({id: 'n'+i, name: 'BIDHAA '+i, price: 100+i})); saveProducts()"); p.wait_for_timeout(800)
    pb = p.evaluate("window.__store['shops/sp1/data/products__0']")
    assert len(pb["items"]) == 500 and pb.get("v2") is True
    assert p.evaluate("Object.keys(window.__store).filter(k=>k.includes('/r_products_')).length") == 0
    assert len(cloud(p, "products")) == 500
    print("8) bidhaa 500 → msingi mmoja, hakuna hati ndogo")
    errs = [e for e in p.errs if "favicon" not in e]
    assert not errs, errs
    p.browser_.close()
    # 9) kifaa cha ZAMANI kimeongeza malipo ya Juma kwenye msingi BAADA ya kifaa kipya kumwandikia hati ndogo →
    #    malipo ya pande zote mbili yanaonekana (hakuna anayefichwa)
    p = open_page(pw, "index.html?duka=sp1", st({"_v2": {"since": 1, "oldAt": 10**13}})); p.wait_for_timeout(1200)
    p.evaluate("SESSION_UNLOCKED=true; STATE.entries = STATE.entries.map(e => e.id==='c1' ? {...e, payments:[...e.payments,{id:'pNew',amount:7000,date:'2026-11-18'}]} : e); saveEntries()"); p.wait_for_timeout(400)
    assert p.evaluate("!!window.__store['shops/sp1/data/r_entries_c1'].bb")
    p.evaluate("""()=>{const k='shops/sp1/data/entries__0'; const b=JSON.parse(JSON.stringify(window.__store[k])); delete b.v2;
      b.items[0].payments=[{id:'pOld',amount:3000,date:'2026-11-18'}]; window.__store[k]=b; p=0}""")
    p.evaluate("reloadFromCloud()"); p.wait_for_timeout(500)
    pays = p.evaluate("STATE.entries.find(e=>e.id==='c1').payments.map(x=>x.id).sort()")
    print("9) malipo ya Juma (kipya + cha zamani):", pays, "| onyo la refresh:", "toleo la ZAMANI" in p.inner_text("body"))
    assert pays == ["pNew", "pOld"], pays
    assert "toleo la ZAMANI" in p.inner_text("body")
    p.browser_.close()
print("OK hifadhi salama")
