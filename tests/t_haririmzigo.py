"""Kipengele "haririMzigo": hariri mzigo uliopokelewa — jina, idadi, buying price; stock inafuata."""
from h import *

D = "2026-11-15"
DATA = {
    "products": [{"id": "p1", "name": "SIDE COVER TVS BLACK", "price": 15000, "buyPrice": 10600},
                 {"id": "p2", "name": "COWLING HLX BLACK NEW", "price": 9000, "buyPrice": 6900}],
    "stockItems": [{"id": "i1", "name": "SIDE COVER TVS RED", "store": "godown"},
                   {"id": "i2", "name": "COWLING HLX BLACK NEW", "store": "godown"}],
    "stockMovements": [{"id": "m1", "itemId": "i1", "type": "in", "qty": 180, "price": 10600, "date": D, "deliveryId": "D1"},
                       {"id": "m2", "itemId": "i2", "type": "in", "qty": 3000, "price": 6900, "date": D, "deliveryId": "D1"},
                       {"id": "m3", "itemId": "i2", "type": "out", "qty": 100, "destination": "Sale", "date": D}],
    "deliveries": [{"id": "D1", "store": "godown", "supplier": "Kinglion", "date": D, "ref": "", "note": "", "archived": False,
                    "rows": [{"name": "SIDE COVER TVS RED", "qty": 180, "price": 10600, "total": 1908000, "itemId": "i1", "movementId": "m1"},
                             {"name": "COWLING HLX BLACK NEW", "qty": 3000, "price": 6900, "total": 20700000, "itemId": "i2", "movementId": "m2"}],
                    "total": 22608000}],
}

def store(features):
    st = shop_store("sp1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345"}},
        **{f + "__0": {"part": 0, "of": 1, "items": v} for f, v in DATA.items()}})
    st["shops/sp1"]["features"] = features
    return st

def open_godown(p):
    p.evaluate("SESSION_UNLOCKED=true; UI.financialsUnlocked=true; setPage('godown')"); p.wait_for_timeout(400)
    p.evaluate("UI.openDeliveries={D1:true}; rerender()"); p.wait_for_timeout(300)

with sync_playwright() as pw:
    # bila kipengele: hakuna kitufe cha Hariri
    p = open_page(pw, "index.html?duka=sp1", store({})); p.wait_for_timeout(1200); open_godown(p)
    assert "Kinglion" in p.inner_text("#app") and "✏️ Hariri" not in p.inner_text("#app")
    print("1. bila kipengele ✓ | ERRS", p.errs); assert not p.errs; p.browser_.close()

    p = open_page(pw, "index.html?duka=sp1", store({"haririMzigo": True})); p.wait_for_timeout(1200); open_godown(p)
    p.click("button:has-text('✏️ Hariri')"); p.wait_for_timeout(300)
    shot(p, "hariri-1-modal")
    inputs = p.locator(".modal-overlay tbody tr")
    # mstari 1: RED -> BLACK ; mstari 2: bei 6900 -> 3900
    inputs.nth(0).locator("input").nth(0).fill("SIDE COVER TVS BLACK")
    inputs.nth(1).locator("input").nth(2).fill("3900")
    assert "13,608,000" in p.inner_text("#ed-total"), p.inner_text("#ed-total")
    p.click("text=Hifadhi marekebisho"); p.wait_for_timeout(800)
    r = p.evaluate("""({d: STATE.deliveries[0], items: storeItems('godown').map(i=>i.name+'='+qtyOf(i.id)+'@'+buyPriceOf(i)),
        prod: STATE.products.map(x=>x.name+':'+x.buyPrice), mv: STATE.stockMovements.map(m=>m.id+':'+m.itemId+':'+m.qty+':'+(m.price??''))})""")
    print(r)
    assert r["d"]["rows"][0]["name"] == "SIDE COVER TVS BLACK" and r["d"]["rows"][1]["price"] == 3900
    assert r["d"]["total"] == 1908000 + 11700000
    assert "SIDE COVER TVS BLACK=180@10600" in r["items"] and any(x.startswith("SIDE COVER TVS RED=0@") for x in r["items"])
    assert "COWLING HLX BLACK NEW=2900@3900" in r["items"] and "COWLING HLX BLACK NEW:3900" in r["prod"]
    print("2. jina + bei ✓")

    # idadi ikipunguzwa chini ya kilichobaki (100 zimeuzwa) -> inakataliwa
    p.click("button:has-text('✏️ Hariri')"); p.wait_for_timeout(300)
    p.locator(".modal-overlay tbody tr").nth(1).locator("input").nth(1).fill("50")
    p.click("text=Hifadhi marekebisho"); p.wait_for_timeout(300)
    t = p.inner_text(".modal-overlay"); assert "Haiwezekani" in t, t
    assert p.evaluate("qtyOf('i2')") == 2900
    p.locator(".modal-overlay tbody tr").nth(1).locator("input").nth(1).fill("2500")
    p.click("text=Hifadhi marekebisho"); p.wait_for_timeout(600)
    assert p.evaluate("qtyOf('i2')") == 2400 and p.evaluate("STATE.deliveries[0].total") == 1908000 + 2500 * 3900
    print("3. idadi + ulinzi ✓ | ERRS", p.errs); assert not p.errs; p.browser_.close()
print("HARIRI MZIGO OK")
