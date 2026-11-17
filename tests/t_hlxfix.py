"""Marekebisho ya mara moja ya Godown (2026-11-17): SIDE COVER RED→BLACK, COWLING HLX BLACK→…NEW kwa 3,900."""
from h import *

SEED = """(()=>{
  const d='2026-11-15';
  STATE.products=[{id:'p1',name:'SIDE COVER HLX 150 BLACK',price:15000,buyPrice:10600},{id:'p2',name:'COWLING HLX BLACK NEW',price:9000,buyPrice:6900},{id:'p3',name:'SIDE COVER HLX 150 RED',price:15000,buyPrice:10600}];
  STATE.stockItems=[{id:'i1',name:'SIDE COVER HLX 150 RED',store:'godown'},{id:'i2',name:'COWLING HLX BLACK',store:'godown'},{id:'i3',name:'SIDE COVER HLX 150 RED',store:'dukani'}];
  STATE.stockMovements=[{id:'m1',itemId:'i1',type:'in',qty:180,price:10600,date:d,deliveryId:'D1'},{id:'m2',itemId:'i2',type:'in',qty:3000,price:6900,date:d,deliveryId:'D1'},{id:'m3',itemId:'i3',type:'in',qty:5,price:10600,date:d}];
  STATE.deliveries=[{id:'D1',store:'godown',supplier:'Kinglion',date:d,rows:[{name:'SIDE COVER HLX 150 RED',qty:180,price:10600,total:1908000,itemId:'i1',movementId:'m1'},{name:'COWLING HLX BLACK',qty:3000,price:6900,total:20700000,itemId:'i2',movementId:'m2'}],total:22608000}];
  invalidateStock(); STATE.settings.hlxFixId=null; })()"""

with sync_playwright() as pw:
    st = shop_store("sp1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345"}}})
    p = open_page(pw, "index.html?duka=sp1", st); p.wait_for_timeout(900)
    p.evaluate(SEED)
    data = p.evaluate("({products:STATE.products,stockItems:STATE.stockItems,stockMovements:STATE.stockMovements,deliveries:STATE.deliveries})")
    p.browser_.close()
    # data ya mfano iwe tayari kwenye "cloud" kabla mfumo haujafunguliwa, kama ilivyo kwenye duka halisi
    st = shop_store("sp1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345"}},
        **{f + "__0": {"part": 0, "of": 1, "items": v} for f, v in data.items()}})
    p = open_page(pw, "index.html?duka=sp1", st); p.wait_for_timeout(1500)
    p.evaluate("oneTimeHlxFix()"); p.wait_for_timeout(800)
    r = p.evaluate("""({items: STATE.stockItems.map(i=>i.store+':'+i.name+':'+(i.buyPrice??'')),
      mv: STATE.stockMovements.map(m=>m.itemId+':'+m.price), d: STATE.deliveries[0],
      prod: STATE.products.map(x=>x.name+':'+x.buyPrice), flag: STATE.settings.hlxFixId,
      gq: storeItems('godown').map(i=>i.name+'='+qtyOf(i.id)+'@'+buyPriceOf(i)) })""")
    print("ERRS0", p.errs); print(r); print(p.evaluate("Object.keys(_DOCS).filter(k=>k.includes(\"__\")).map(k=>k+\":\"+JSON.stringify(_DOCS[k].items).slice(0,160))"))
    assert "godown:SIDE COVER HLX 150 BLACK:" in r["items"], "RED haikubadilishwa kuwa BLACK"
    assert "dukani:SIDE COVER HLX 150 RED:" in r["items"], "Dukani isiguswe"
    assert "godown:COWLING HLX BLACK NEW:3900" in r["items"]
    assert "i2:3900" in r["mv"] and "i1:10600" in r["mv"]
    rows = r["d"]["rows"]
    assert rows[0]["name"] == "SIDE COVER HLX 150 BLACK" and rows[0]["total"] == 1908000
    assert rows[1]["name"] == "COWLING HLX BLACK NEW" and rows[1]["price"] == 3900 and rows[1]["total"] == 11700000
    assert r["d"]["total"] == 1908000 + 11700000
    assert "COWLING HLX BLACK NEW:3900" in r["prod"] and "SIDE COVER HLX 150 RED:10600" in r["prod"]
    assert r["flag"] == "2026-11-17-hlx"
    # mara ya pili haifanyi kitu
    p.evaluate("STATE.stockItems.push({id:'i9',name:'COWLING HLX BLACK',store:'godown'}); oneTimeHlxFix()"); p.wait_for_timeout(300)
    assert p.evaluate("STATE.stockItems.some(i=>i.id==='i9' && i.name==='COWLING HLX BLACK')"), "imejirudia"
    print("ERRS", p.errs); assert not p.errs; p.browser_.close()

    # duka lisilo na bidhaa hizo: halibadiliki, wala alama haiwekwi
    p = open_page(pw, "index.html?duka=sp1", st); p.wait_for_timeout(900)
    p.evaluate("STATE.stockItems=[{id:'x',name:'CHAIN',store:'godown'}]; STATE.settings.hlxFixId=null; oneTimeHlxFix()"); p.wait_for_timeout(300)
    assert p.evaluate("STATE.settings.hlxFixId") is None and p.evaluate("STATE.stockItems[0].name") == "CHAIN"
    print("ERRS", p.errs); assert not p.errs; p.browser_.close()
print("HLX FIX OK")
