"""Ingiza bidhaa kutoka Excel/CSV (duka la spea / app.js): badilisha zote, na ongeza/sasisha bei."""
from h import *
import os
XL = os.environ.get("XLSX_LIB")          # local copy of the SheetJS bundle (CDN is mocked in tests)
SAMPLES = os.environ.get("IMP_SAMPLES") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
old = [{"id": "o1", "name": "OLD BOLT", "price": 500}, {"id": "o2", "name": "CHAIN 428H", "price": 20000}]
with sync_playwright() as pw:
    st = shop_store("sp1", "spea", "")
    p = open_page(pw, "index.html?duka=sp1", st)
    if XL:
        js = open(XL).read()
        p.context.route("**/xlsx.full.min.js", lambda r: r.fulfill(body=js, content_type="application/javascript"))
    p.wait_for_timeout(900)
    p.fill("#login-password", "1234"); p.fill("#login-password2", "1234"); p.click("text=Set Password"); p.wait_for_timeout(300)
    p.evaluate(f"STATE.products = {old}; saveProducts(); setPage('products')"); p.wait_for_timeout(300)
    assert "Ingiza bidhaa" in p.inner_text("body")
    # 1) Excel (CSV twin when the SheetJS bundle isn't available offline), replace everything
    first = "bei.xlsx" if XL else "bei_badilisha.csv"; print("file:", first)
    p.set_input_files("label:has-text('Ingiza bidhaa') input[type=file]", os.path.join(SAMPLES, first)); p.wait_for_timeout(1500)
    t = p.inner_text("body"); print(t[t.find(first):][:400].replace("\n", " | "))
    assert "bidhaa 3" in t, t[:800]
    p.once("dialog", lambda d: d.accept()); p.click("text=✅ Ingiza bidhaa 3"); p.wait_for_timeout(500)
    prods = p.evaluate("STATE.products")
    act = {x["name"]: x for x in prods if not x.get("deleted")}
    print("active:", {k: (v["price"], v.get("buyPrice")) for k, v in act.items()})
    assert set(act) == {"BRAKE SHOE BOXER", "CHAIN 428H", "Plug NGK"} and act["BRAKE SHOE BOXER"]["price"] == 8000 and act["BRAKE SHOE BOXER"]["buyPrice"] == 5500
    assert act["CHAIN 428H"]["price"] == 26000 and "buyPrice" not in act["Plug NGK"]
    assert sum(1 for x in prods if x.get("deleted")) == 2
    # 2) CSV (semicolon), merge: adds 2, keeps the 3
    p.set_input_files("label:has-text('Ingiza bidhaa') input[type=file]", os.path.join(SAMPLES, "bei.csv")); p.wait_for_timeout(800)
    p.click("text=Ongeza mpya na sasisha bei"); p.click("text=✅ Ingiza bidhaa 2"); p.wait_for_timeout(400)
    act = [x["name"] for x in p.evaluate("STATE.products") if not x.get("deleted")]
    print("after merge:", act); assert len(act) == 5 and "Oil 4T, 1L" in act
    shot(p, "imp-products"); errs = [e for e in p.errs if "Chart is not defined" not in e]; print("ERRS", errs); assert not errs   # Chart.js comes from the CDN, which the harness blanks
    p.browser_.close()
