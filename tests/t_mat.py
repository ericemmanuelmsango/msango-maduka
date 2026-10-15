"""Duka la spea (app.js): Matumizi (yanashirikiana na POS), faida halisi kwenye Reports, kutafuta mteja, na na Shemdar haipati orodha ya Shem."""
from h import *
import time
today = time.strftime("%Y-%m-%d")
with sync_playwright() as pw:
    st = shop_store("sp9", "spea", ""); st["shops/sp9"]["name"] = "SHEMDAR"
    st["shops/sp9/data/data"] = {"settings": {"productResetId": "2026-10-15", "stockResetId": "2026-10-15-stock", "appPassword": "1234"}}
    st["shops/sp9/data/products__0"] = {"part": 0, "of": 1, "items": [{"id": "x", "name": "6001", "price": 999}]}
    st["shops/sp9/data/sales__0"] = {"part": 0, "of": 1, "items": [
        {"id": "s1", "date": today, "store": "dukani", "customer": "Juma Ali", "itemName": "6001", "qty": 2, "price": 1000, "total": 2000, "buyPrice": 800},
        {"id": "s2", "date": today, "store": "dukani", "customer": "Neema Shop", "itemName": "6002", "qty": 1, "price": 1200, "total": 1200, "buyPrice": 900}]}
    st["shops/sp9/data/posexp_p1"] = {"id": "p1", "date": today, "createdAt": time.time() * 1000, "category": "Umeme", "amount": 300, "via": "Cash", "userName": "Muuzaji", "deleted": False}
    p = open_page(pw, "index.html?duka=sp9", st); p.wait_for_timeout(1500)
    p.fill("#login-password", "1234"); p.click("button:has-text(\"Enter\")"); p.wait_for_timeout(400)
    s = store(p)
    items = s["shops/sp9/data/products__0"]["items"]; print("products after second clear:", len(items), s["shops/sp9/data/data"]["settings"].get("productResetId"))
    assert len(items) == 0 and s["shops/sp9/data/data"]["settings"].get("productResetId") == "2026-10-15b"   # Shem list is not loaded into Shemdar
    # expenses: POS expense shows, add one more from the main system
    assert "Matumizi" in p.inner_text(".menu"), p.inner_text(".menu")
    p.click(".menu li:has-text('Matumizi')"); p.wait_for_timeout(300); assert "Umeme" in p.inner_text("main")
    p.click("button:has-text('Usafiri')"); p.fill("#ex-amt", "500"); p.fill("#ex-note", "bodaboda"); p.click("text=Hifadhi matumizi"); p.wait_for_timeout(400)
    s = store(p); ex = [v for k, v in s.items() if k.startswith("shops/sp9/data/posexp_") and v.get("category") == "Usafiri"]
    print("new expense:", ex); assert ex and ex[0]["amount"] == 500 and ex[0]["date"] == today
    t = p.inner_text("main"); assert "TSh 800" in t, t[:300]
    # reports: revenue 3200, cost 2500, gross 700, expenses 800, net -100
    p.evaluate("UI.financialsUnlocked = true; setPage('reports')"); p.wait_for_timeout(400)
    t = p.inner_text("main"); i = t.find("Revenue"); print(t[i:i + 300].replace("\n", " | "))
    assert "Matumizi" in t and "HASARA HALISI" in t.upper() and "TSh 100" in t
    # sales by customer search
    p.evaluate("setPage('sales')"); p.wait_for_timeout(300); p.click("text=By Customer"); p.wait_for_timeout(200)
    p.fill("#cust-search-input", "neema"); p.wait_for_timeout(500)
    t = p.inner_text("main"); assert "Neema Shop" in t and "Juma Ali" not in t
    p.fill("#cust-search-input", "zzz"); p.wait_for_timeout(500); assert "Hakuna mteja" in p.inner_text("main")
    shot(p, "mat-sales")
    errs = [e for e in p.errs if "Chart is not defined" not in e]; print("ERRS", errs); assert not errs
    p.browser_.close()
    # another client shop: no automatic product list
    st2 = shop_store("sp8", "spea", ""); st2["shops/sp8/data/data"] = {"settings": {"productResetId": "2026-10-15", "appPassword": "1234"}}
    p = open_page(pw, "index.html?duka=sp8", st2); p.wait_for_timeout(1200)
    assert "shops/sp8/data/products__0" not in store(p) or not store(p)["shops/sp8/data/products__0"]["items"]; print("other shop untouched"); p.browser_.close()
