"""Kufuta mzigo: (1) rekodi tu, (2) stock yote, (3) nichague mwenyewe — bidhaa zipi na idadi ngapi."""
from h import *

D = "2026-11-15"
def data():
    return {
    "products": [{"id": "p1", "name": "CHAIN KIT TVS", "price": 15000}, {"id": "p2", "name": "BRAKE SHOE BAJAJ", "price": 9000}],
    "stockItems": [{"id": "g1", "name": "CHAIN KIT TVS", "store": "godown", "category": "Normal goods"},
                   {"id": "g2", "name": "BRAKE SHOE BAJAJ", "store": "godown", "category": "Normal goods"}],
    "stockMovements": [{"id": "m1", "itemId": "g1", "type": "in", "qty": 50, "price": 10000, "date": D, "deliveryId": "D1"},
                       {"id": "m2", "itemId": "g2", "type": "in", "qty": 20, "price": 5000, "date": D, "deliveryId": "D1"},
                       {"id": "m3", "itemId": "g2", "type": "out", "qty": 15, "destination": "Dukani", "date": D}],
    "deliveries": [{"id": "D1", "store": "godown", "supplier": "Kinglion", "date": D, "ref": "", "archived": False,
                    "rows": [{"name": "CHAIN KIT TVS", "qty": 50, "price": 10000, "total": 500000, "itemId": "g1", "movementId": "m1"},
                             {"name": "BRAKE SHOE BAJAJ", "qty": 20, "price": 5000, "total": 100000, "itemId": "g2", "movementId": "m2"}],
                    "total": 600000}]}
def openp(pw):
    st = shop_store("sp1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345"}},
        **{f + "__0": {"part": 0, "of": 1, "items": v} for f, v in data().items()}})
    p = open_page(pw, "index.html?duka=sp1", st); p.wait_for_timeout(1200)
    p.evaluate("SESSION_UNLOCKED=true; UI.financialsUnlocked=true; setPage('godown'); UI.openDeliveries={D1:true}; rerender()"); p.wait_for_timeout(300)
    p.click("button:has-text('🗑️ Delete')"); p.wait_for_timeout(200)
    return p
Q = "[qtyOf('g1'), qtyOf('g2'), STATE.deliveries.length]"
with sync_playwright() as pw:
    p = openp(pw); t = p.inner_text(".modal-overlay")
    assert "Futa rekodi tu" in t and "Nichague mwenyewe" in t
    # stock YOTE haiwezekani: BRAKE SHOE 15 zimehamishwa
    assert p.locator("button:has-text('stock YOTE')").is_disabled()
    p.click("text=Futa rekodi tu"); p.wait_for_timeout(600)
    assert p.evaluate(Q) == [50, 5, 0]; print("1. rekodi tu ✓"); p.browser_.close()

    p = openp(pw); p.click("text=Nichague mwenyewe"); p.wait_for_timeout(200)
    shot(p, "futa-chagua")
    boxes = p.locator(".modal-overlay input[type=checkbox]")
    boxes.nth(0).check(); p.wait_for_timeout(150)
    p.locator(".modal-overlay tbody tr").nth(0).locator("input.field").fill("30")
    boxes.nth(1).check(); p.wait_for_timeout(150)
    p.locator(".modal-overlay tbody tr").nth(1).locator("input.field").fill("9")   # zipo 5 tu
    p.click("text=uondoe stock niliyochagua"); p.wait_for_timeout(300)
    assert "hadi 5 tu" in p.inner_text(".modal-overlay"); assert p.evaluate(Q) == [50, 5, 1]
    p.locator(".modal-overlay tbody tr").nth(1).locator("input.field").fill("5")
    p.click("text=uondoe stock niliyochagua"); p.wait_for_timeout(700)
    assert p.evaluate(Q) == [20, 0, 0], p.evaluate(Q)
    assert p.evaluate("STATE.stockMovements.find(m=>m.id==='m1').qty") == 20
    print("2. nichague mwenyewe ✓ | ERRS", p.errs); assert not p.errs; p.browser_.close()
print("FUTA MZIGO OK")

# ---- futa BIDHAA MOJA ndani ya mzigo ----
def openrow(pw, i):
    p = openp(pw); p.evaluate("UI.deleteDeliveryId=null; rerender()"); p.wait_for_timeout(200)
    p.locator("button[title='Futa bidhaa hii na stock yake']").nth(i).click(); p.wait_for_timeout(200)
    return p
with sync_playwright() as pw:
    p = openrow(pw, 0)   # CHAIN KIT 50, zote zipo
    shot(p, "futa-bidhaa-moja")
    p.click("text=Futa bidhaa hii na stock yake"); p.wait_for_timeout(700)
    r = p.evaluate("[qtyOf('g1'), qtyOf('g2'), STATE.deliveries[0].rows.map(x=>x.name), STATE.deliveries[0].total]")
    assert r == [0, 5, ["BRAKE SHOE BAJAJ"], 100000], r
    print("3. bidhaa moja + stock ✓"); p.browser_.close()

    p = openrow(pw, 1)   # BRAKE SHOE 20, zimebaki 5
    t = p.inner_text(".modal-overlay"); assert "stock iliyobaki (5)" in t and "15 zimeshauzwa" in t
    p.click("text=stock iliyobaki (5)"); p.wait_for_timeout(700)
    assert p.evaluate("[qtyOf('g2'), STATE.deliveries[0].rows.length]") == [0, 1]
    assert p.evaluate("STATE.stockMovements.find(m=>m.id==='m2').qty") == 15
    print("4. bidhaa moja, sehemu iliyobaki ✓"); p.browser_.close()

    p = openrow(pw, 0); p.click("text=Futa kwenye rekodi tu"); p.wait_for_timeout(600)
    assert p.evaluate("[qtyOf('g1'), STATE.deliveries[0].rows.length]") == [50, 1]
    p.locator("button[title='Futa bidhaa hii na stock yake']").nth(0).click(); p.wait_for_timeout(200)
    p.click("text=Futa kwenye rekodi tu"); p.wait_for_timeout(600)
    assert p.evaluate("STATE.deliveries.length") == 0   # bidhaa ya mwisho → mzigo unaondoka
    print("5. rekodi tu + mzigo mtupu unaondoka ✓ | ERRS", p.errs); assert not p.errs; p.browser_.close()
print("FUTA BIDHAA OK")
