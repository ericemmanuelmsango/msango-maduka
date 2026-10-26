"""🎨 Seti ya rangi 3 (60‑30‑10): Kiwanda → Chapa → mifumo ya wateja (Wadai/POS na pakiti) zinafuata seti."""
from h import *
now = time.time() * 1000
SH = {"name": "Kirumba Spare", "industry": "spea", "edition": "pro", "members": ["mteja@test.com"], "active": True, "paidUntil": now + 20 * DAY, "createdAt": now,
      "brand": {"theme": "", "color": "#0f766e", "tagline": ""}, "phone": "0755000111", "location": "Mwanza"}
with sync_playwright() as pw:
    p = open_page(pw, "kiwanda.html#kirumba", {"shops/kirumba": SH, "brands/kirumba": {"name": "Kirumba Spare"}}, email=ADMIN)
    p.wait_for_timeout(500); p.click("button:has-text('🎨 Chapa')"); p.wait_for_timeout(200)
    n = p.locator(".pal").count(); print("seti:", n); assert n == 16
    p.locator(".pal:has-text('Deeper Beauty')").click(); p.wait_for_timeout(200)
    p.locator(".pals").screenshot(path="/tmp/msango-shots/palettes.png")
    p.click("button:has-text('💾 Hifadhi chapa')"); p.wait_for_timeout(500)
    s = store(p); print("brand:", s["shops/kirumba"]["brand"].get("palette"), "| public:", s["brands/kirumba"].get("palette")); assert s["brands/kirumba"]["palette"] == "urembo"
    print("ERRS", p.errs); p.browser_.close()
    st = shop_store("sp1", "spea"); st["shops/sp1"]["brand"]["palette"] = "urembo"; st["brands/sp1"]["palette"] = "urembo"
    p = open_page(pw, "pos.html?duka=sp1", st); p.wait_for_timeout(1000)
    bg = p.evaluate("getComputedStyle(document.querySelector('.top, .login-wrap, .login') || document.body).backgroundColor"); css = p.evaluate("(document.getElementById('ms-theme-css')||{}).textContent||''")
    print("pos css ina seti:", "#22D3EE" in css, "| rangi ya juu:", bg); assert "#22D3EE" in css
    print("ERRS", p.errs); p.browser_.close()
    st = shop_store("sm1", "supermarket"); st["shops/sm1"]["brand"]["palette"] = "bustani"; st["brands/sm1"]["palette"] = "bustani"
    p = open_page(pw, "pakiti.html?duka=sm1", st); p.wait_for_timeout(900)
    ac = p.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ac').trim()"); print("pakiti msisitizo:", ac); assert ac.lower() == "#c62828"
    print("ERRS", p.errs); p.browser_.close()
