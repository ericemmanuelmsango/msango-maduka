"""Mara moja (2026-11-20): futa stock yote ya DUKANI ya Shemdar; Godown na Products zibaki."""
from h import *

SEED = """(()=>{ const d='2026-11-19';
  STATE.products=[{id:'p1',name:'BRAKE PAD',price:5000,buyPrice:3000}];
  STATE.stockItems=[{id:'i1',name:'BRAKE PAD',store:'dukani'},{id:'i2',name:'CHAIN',store:'dukani'},{id:'i3',name:'BRAKE PAD',store:'godown'},{id:'i4',name:'OLD',}];
  STATE.stockMovements=[{id:'m1',itemId:'i1',type:'in',qty:10,price:3000,date:d},{id:'m2',itemId:'i2',type:'in',qty:4,price:900,date:d},
    {id:'m3',itemId:'i3',type:'in',qty:50,price:3000,date:d},{id:'m4',itemId:'i3',type:'out',qty:5,date:d},{id:'m5',itemId:'i4',type:'in',qty:2,date:d}];
  invalidateStock(); })()"""

def run(name):
    with sync_playwright() as pw:
        st = shop_store("sd1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345"}}})
        st["shops/sd1"]["name"] = name
        p = open_page(pw, "index.html?duka=sd1", st); p.wait_for_timeout(900)
        p.evaluate(SEED)
        data = p.evaluate("({products:STATE.products,stockItems:STATE.stockItems,stockMovements:STATE.stockMovements})")
        p.browser_.close()
        st = shop_store("sd1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345"}},
            **{f + "__0": {"part": 0, "of": 1, "items": v} for f, v in data.items()}})
        st["shops/sd1"]["name"] = name
        p = open_page(pw, "index.html?duka=sd1", st); p.wait_for_timeout(1800)
        p.evaluate("oneTimeDukaniReset()"); p.wait_for_timeout(800)
        r = p.evaluate("({items:STATE.stockItems.map(i=>i.id), mv:STATE.stockMovements.map(m=>m.id), prod:STATE.products.length, flag:STATE.settings.dukaniResetId, g:qtyOf('i3')})")
        # baada ya kufungua upya (kutoka cloud) bado zimefutwa
        p.reload(); p.wait_for_timeout(1800)
        r2 = p.evaluate("STATE.stockItems.map(i=>i.id)")
        print(name, "ERRS", p.errs, r, r2); p.browser_.close()
        return r, r2

r, r2 = run("shemdar")
assert r["items"] == ["i3"] and r2 == ["i3"], "Dukani haikufutwa vizuri"
assert r["mv"] == ["m3", "m4"] and r["g"] == 45, "Godown imeguswa"
assert r["prod"] == 1 and r["flag"] == "2026-11-20-dukani"
r, _ = run("Duka Jingine")
assert len(r["items"]) == 4, "duka lingine limeguswa"
print("OK t_dukanireset")
