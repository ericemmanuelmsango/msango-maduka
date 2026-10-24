"""✨ Logo 30 moja kwa moja: zinatengenezwa kwa jina + aina ya biashara, kuchagua kunaweka logo ya mteja."""
from h import *
now = time.time() * 1000
def shop(name, ind): return {"name": name, "industry": ind, "edition": "duka", "members": ["m@test.com"], "active": True, "paidUntil": now + 20 * DAY, "createdAt": now,
                            "brand": {"theme": "", "color": "#0f766e", "tagline": ""}, "phone": "0755000111", "location": "Mwanza"}
with sync_playwright() as pw:
    for code, name, ind in [("kirumba", "Kirumba Spare Centre", "spea"), ("neema", "Neema Beauty Saluni", "saluni"), ("afya", "Afya Bora Pharmacy", "famasia")]:
        p = open_page(pw, "kiwanda.html#" + code, {f"shops/{code}": shop(name, ind), f"brands/{code}": {"name": name}}, email=ADMIN)
        p.wait_for_timeout(500); p.click("button:has-text('🎨 Chapa')"); p.wait_for_timeout(200)
        p.click("button:has-text('✨ Logo 30 moja kwa moja')"); p.wait_for_timeout(400)
        n = p.locator(".lgen button").count(); print(ind, "logo:", n); assert n == 30
        p.locator(".lgen").screenshot(path=f"/tmp/msango-shots/lgen-{ind}.png")
        p.locator(".lgen button").nth(4).click(); p.wait_for_timeout(500)
        p.click("button:has-text('💾 Hifadhi chapa')"); p.wait_for_timeout(500)
        lg = store(p)[f"shops/{code}"]["brand"]["logo"]; print("  imehifadhiwa:", lg[:22], len(lg)); assert lg.startswith("data:image/png")
        p.click("button:has-text('🔄 Nyingine 30')"); p.wait_for_timeout(300); assert p.locator(".lgen button").count() == 30
        print("ERRS", p.errs); p.browser_.close()
