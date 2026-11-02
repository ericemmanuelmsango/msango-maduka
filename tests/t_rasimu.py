"""Rasimu: kazi inayoandikwa (oda ya mdaiwa, kikapu cha POS) hairpotei ukirefresh; Save/Cancel inaifuta."""
from h import *
with sync_playwright() as pw:
    st = shop_store("sp1", "spea", "")
    p = open_page(pw, "index.html?duka=sp1", st); p.wait_for_timeout(900)
    p.on("dialog", lambda d: d.accept())
    UNLOCK = "STATE.settings.appPassword=STATE.settings.appPassword||'pw12345'; SESSION_UNLOCKED=true; UI.financialsUnlocked=true;"
    p.evaluate(UNLOCK + " setPage('owed')"); p.wait_for_timeout(300)
    p.click("button:has-text('Add Debtor')"); p.wait_for_timeout(200)
    p.fill("#ef-name", "Juma Mteja"); p.press("#ef-name", "Tab"); p.wait_for_timeout(200); p.click("button:has-text('Itemized Order')"); p.wait_for_timeout(200)
    rid = p.evaluate("UI.formOwed.rows[0].id")
    p.fill(f"#row-name-{rid}", "Chain sprocket"); p.fill(f"#row-price-{rid}", "25000"); p.fill(f"#row-qty-{rid}", "3"); p.wait_for_timeout(500)
    p.reload(); p.wait_for_timeout(1200)
    f = p.evaluate("UI.formOwed && {name: UI.formOwed.name, mode: UI.formOwed.mode, row: UI.formOwed.rows[0]}")
    print("baada ya refresh:", f, "| banner:", p.is_visible("#rasimu-bar"))
    assert f and f["name"] == "Juma Mteja" and f["mode"] == "items" and f["row"]["name"] == "Chain sprocket" and f["row"]["qty"] == "3"
    assert p.is_visible("#rasimu-bar")
    p.evaluate(UNLOCK + " rerender()"); p.wait_for_timeout(300)
    assert p.input_value("#ef-name") == "Juma Mteja" and p.input_value(f"#row-price-{rid}") == "25000"
    shot(p, "rasimu-1-imerudi")
    p.click("#rasimu-ok"); p.click("button:has-text('Cancel')"); p.wait_for_timeout(500)
    p.reload(); p.wait_for_timeout(1000)
    print("baada ya Cancel + refresh: form =", p.evaluate("UI.formOwed"), "| banner:", p.is_visible("#rasimu-bar"))
    assert p.evaluate("UI.formOwed") is None and not p.is_visible("#rasimu-bar")
    print("ERRS", p.errs); p.browser_.close()

    p = open_page(pw, "pos.html?duka=sp1", st, w=420, h=900); p.wait_for_timeout(900)
    p.evaluate("U.user={id:'o1',name:'Eric',role:'owner'}; render()")
    p.on("dialog", lambda d: d.accept())
    p.evaluate("U.cart.push({itemId:'x1',qty:2,price:null}); U.customer='Ali Bajaji'; U.phone='0755111222'; render()"); p.wait_for_timeout(500)
    p.reload(); p.wait_for_timeout(1200)
    c = p.evaluate("({n: U.cart.length, c: U.customer, ph: U.phone})"); print("POS baada ya refresh:", c, "| banner:", p.is_visible("#rasimu-bar"))
    assert c["n"] == 1 and c["c"] == "Ali Bajaji" and p.is_visible("#rasimu-bar")
    shot(p, "rasimu-2-pos")
    p.click("#rasimu-del"); p.wait_for_timeout(300); p.reload(); p.wait_for_timeout(900)
    assert p.evaluate("U.cart.length") == 0 and not p.is_visible("#rasimu-bar")
    print("POS: Futa kikapu inafanya kazi | ERRS", p.errs); p.browser_.close()
print("RASIMU OK")
