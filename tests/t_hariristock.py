"""Kipengele "haririMzigo" kwenye Current Stock: hariri jina, idadi, buying price — Dukani na Godown."""
from h import *

D = "2026-11-15"
DATA = {
    "products": [{"id": "p1", "name": "CHAIN KIT TVS", "price": 15000, "buyPrice": 10000},
                 {"id": "p2", "name": "BRAKE SHOE BAJAJ", "price": 9000, "buyPrice": 5000}],
    "stockItems": [{"id": "g1", "name": "CHAIN KIT TVS", "store": "godown", "category": "Normal goods"},
                   {"id": "d1", "name": "CHAIN KIT TVS", "store": "dukani", "category": "Normal goods"},
                   {"id": "d2", "name": "BRAKE SHOE BAJAJ", "store": "dukani", "category": "Normal goods"},
                   {"id": "d3", "name": "BREAK SHOE BAJAJ", "store": "dukani", "category": "Normal goods"}],
    "stockMovements": [{"id": "m1", "itemId": "g1", "type": "in", "qty": 50, "price": 10000, "date": D},
                       {"id": "m2", "itemId": "d1", "type": "in", "qty": 10, "price": 10000, "date": D},
                       {"id": "m3", "itemId": "d2", "type": "in", "qty": 4, "price": 5000, "date": D},
                       {"id": "m4", "itemId": "d3", "type": "in", "qty": 6, "price": 5000, "date": D}],
}
def store(features):
    st = shop_store("sp1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345"}},
        **{f + "__0": {"part": 0, "of": 1, "items": v} for f, v in DATA.items()}})
    st["shops/sp1"]["features"] = features
    return st
def page(p, pg):
    p.evaluate(f"SESSION_UNLOCKED=true; UI.financialsUnlocked=true; UI.openStockCategoriesdukani={{'Normal goods':true}}; UI.openStockCategoriesgodown={{'Normal goods':true}}; setPage('{pg}')"); p.wait_for_timeout(400)
def save_edit(p, item, name=None, qty=None, price=None):
    p.evaluate(f"openEditStock('{item}')"); p.wait_for_timeout(200)
    f = p.locator(".modal-overlay input.field")
    if name is not None: f.nth(0).fill(name)
    if qty is not None: f.nth(1).fill(str(qty))
    if price is not None: f.nth(2).fill(str(price))
    p.click(".modal-overlay >> text=💾 Hifadhi"); p.wait_for_timeout(700)

with sync_playwright() as pw:
    p = open_page(pw, "index.html?duka=sp1", store({})); p.wait_for_timeout(1200); page(p, "mainstore")
    assert p.locator("button[onclick^=openEditStock]").count() == 0, "bila kipengele kusiwe na kitufe"
    print("1. bila kipengele ✓"); p.browser_.close()

    p = open_page(pw, "index.html?duka=sp1", store({"haririMzigo": True})); p.wait_for_timeout(1200)
    page(p, "godown"); assert p.locator("button[onclick^=openEditStock]").count() == 1
    save_edit(p, "g1", qty=45, price=9500)            # Godown: hesabu ilipungua 5, bei mpya
    assert p.evaluate("qtyOf('g1')") == 45 and p.evaluate("buyPriceOf(STATE.stockItems.find(i=>i.id==='g1'))") == 9500
    assert p.evaluate("buyPriceOf(STATE.stockItems.find(i=>i.id==='d1'))") == 9500   # Dukani na Products zinafuata
    assert p.evaluate("productByName('CHAIN KIT TVS').buyPrice") == 9500
    print("2. Godown idadi + bei ✓")
    page(p, "mainstore"); assert p.locator("button[onclick^=openEditStock]").count() == 3
    shot(p, "hariri-stock-dukani")
    save_edit(p, "d1", qty=12)                          # Dukani: +2
    assert p.evaluate("qtyOf('d1')") == 12 and p.evaluate("qtyOf('g1')") == 45
    save_edit(p, "d3", name="BRAKE SHOE BAJAJ")         # jina lililokosewa → unganisha na lililopo
    r = p.evaluate("({n: storeItems('dukani').map(i=>i.name+'='+qtyOf(i.id)), adj: STATE.stockMovements.filter(m=>m.adjust).map(m=>m.type+':'+m.qty)})")
    print(r)
    assert "BRAKE SHOE BAJAJ=10" in r["n"] and not any(x.startswith("BREAK") for x in r["n"])
    assert sorted(r["adj"]) == ["in:2", "out:5"]
    save_edit(p, "d2", qty=-1); assert "Idadi iwe" in p.inner_text(".modal-overlay")
    print("3. Dukani idadi + jina + ulinzi ✓ | ERRS", p.errs); assert not p.errs; p.browser_.close()
print("HARIRI STOCK OK")
