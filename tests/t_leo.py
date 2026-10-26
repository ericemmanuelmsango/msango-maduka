"""Kiwanda: 📅 Leo (malipo, majaribio, waliolala, huduma, rufaa) + 💓 uhai + 💾 backup/rudisha + 🎬 demo + 🧑‍💼 wafanyakazi."""
from h import *
import json as _j
now = time.time() * 1000
def shop(name, **kw):
    d = {"name": name, "industry": "spea", "edition": "duka", "members": [name.split()[0].lower() + "@test.com"], "active": True, "monthly": 30000,
         "paidUntil": now + 20 * DAY, "createdAt": now - 30 * DAY, "phone": "0755000111", "location": "Mwanza", "brand": {"theme": "", "color": "#0d6a5b"}}
    d.update(kw); return d
ST = {
    "shops/amani": shop("Amani Spares", paidUntil=now + 3 * DAY),                                         # malipo yanakaribia
    "shops/baraka": shop("Baraka Shop", paidUntil=now + 2 * DAY, trialEnds=now + 2 * DAY, createdAt=now - 12 * DAY),  # majaribio
    "shops/chui": shop("Chui Motors"),                                                                       # amelala
    "shops/chui/data/_hai": {"seen": now - 8 * DAY, "sale": now - 9 * DAY},
    "shops/dodo": shop("Dodo Traders", referredBy="amani", trialEnds=now - 10 * DAY, clientId="c4"),          # rufaa
    "shops/dodo/data/_hai": {"seen": now - 3600e3, "sale": now - 3600e3, "s_" + time.strftime("%Y-%m-%d"): 4},
    "shops/dodo/data/data": {"settings": {"appPassword": "x"}, "products": [{"id": "p1", "name": "PLUG", "price": 3000}]},
    "shops/dodo/data/possale_a": {"id": "a", "total": 9000, "date": "2026-10-20"},
    "clients/c4": {"id": "c4", "name": "Dodo Traders", "addons": [{"svc": "brandkit", "name": "Brand kit", "kind": "once", "price": 100000, "status": "imekamilika"}], "payments": []},
}
with sync_playwright() as pw:
    p = open_page(pw, "kiwanda.html", ST, email=ADMIN)
    p.on("dialog", lambda d: d.accept() if "WhatsApp" not in d.message else d.dismiss())
    p.wait_for_timeout(900)
    leo = p.inner_text(".leo"); print(leo)
    assert "Amani Spares" in leo and "inaisha baada ya siku 3" in leo
    assert "Majaribio yanayoisha" in leo and "Baraka Shop" in leo
    assert "Chui Motors" in leo and "Hajafungua mfumo siku 8" in leo
    assert "Huduma zimekamilika" in leo and "100,000" in leo
    assert "Zawadi za rufaa" in leo and "Mpe Amani Spares mwezi 1" in leo
    assert "Dodo Traders" not in p.inner_text(".lsec:has-text('waliolala')")
    print("hai:", p.inner_text("#sys-dodo .hai"))
    assert "Alifungua leo" in p.inner_text("#sys-dodo .hai") and "miamala wiki hii: 4" in p.inner_text("#sys-dodo .hai")
    # summary copy
    p.context.grant_permissions(["clipboard-read", "clipboard-write"])
    p.click("button:has-text('📋 Nakili muhtasari')"); p.wait_for_timeout(200)
    clip = p.evaluate("navigator.clipboard.readText()"); assert "⏳ Malipo:" in clip and "😴 Waliolala:" in clip
    # rufaa reward
    before = store(p)["shops/amani"]["paidUntil"]
    p.click("button:has-text('Mpe Amani Spares mwezi 1')"); p.wait_for_timeout(1500)
    s = store(p); gained = (s["shops/amani"]["paidUntil"] - before) / DAY
    print("rufaa: +%.1f siku, rewarded=%s" % (gained, bool(s["shops/dodo"].get("refRewarded"))))
    assert 29.5 < gained < 30.5 and s["shops/dodo"]["refRewarded"]
    assert "Zawadi za rufaa" not in p.inner_text(".leo")
    # service paid from Leo
    p.click(".lsec:has-text('Huduma zimekamilika') >> button:has-text('✅ Amelipa')"); p.wait_for_timeout(500)
    assert store(p)["clients/c4"]["addons"][0]["status"] == "imelipwa"
    shot(p, "kiwanda-leo")
    # 💾 backup
    p.evaluate("leoOpen('dodo','backup')"); p.wait_for_timeout(300)
    with p.expect_download() as dl: p.click("button:has-text('⬇️ Pakua backup')")
    path = dl.value.path(); bk = _j.load(open(path)); print("backup:", dl.value.suggested_filename, sorted(bk["docs"]))
    assert bk["code"] == "dodo" and "possale_a" in bk["docs"] and "data" in bk["docs"] and "loginPw" not in bk["shop"]
    # ♻️ rudisha: mteja "alipoteza" mauzo na bidhaa
    p.evaluate("""async()=>{ await db.collection('shops').doc('dodo').collection('data').doc('possale_a').delete();
                  await db.collection('shops').doc('dodo').collection('data').doc('data').set({settings:{appPassword:'x'},products:[]}); }""")
    assert "shops/dodo/data/possale_a" not in store(p)
    p.fill("#rs-dodo", "dodo")
    bad = str(path) + ".json"; open(bad, "w").write(_j.dumps(bk))
    with p.expect_download() as dl2: p.set_input_files(".box:has-text('Rudisha kutoka backup') input[type=file]", bad)
    p.wait_for_timeout(800)
    s = store(p); print("restored:", "possale_a" in str(list(s)), s["shops/dodo/data/data"]["products"], "| safety:", dl2.value.suggested_filename)
    assert "shops/dodo/data/possale_a" in s and s["shops/dodo/data/data"]["products"][0]["name"] == "PLUG"
    assert dl2.value.suggested_filename.startswith("kabla-ya-kurudisha-dodo")
    # 🎬 demo
    p.evaluate("K.demoOpen=true; render()"); p.wait_for_timeout(200)
    p.click(".demo-g .box:has-text('Spea') >> button:has-text('Tengeneza demo')"); p.wait_for_timeout(1500)
    p.click(".demo-g .box:has-text('Saluni') >> button:has-text('Tengeneza demo')"); p.wait_for_timeout(1500)
    s = store(p); dk = sorted(k for k in s if k.startswith("shops/demo-saluni/data/"))
    print("demo saluni docs:", len(dk), "| spea:", sorted(k.split("/")[-1] for k in s if k.startswith("shops/demo-spea/data/"))[:5])
    assert s["shops/demo-spea"]["demo"] and len(dk) >= 7 and "shops/demo-spea/data/pos_settings" in s
    assert "Demo · Spea" not in p.inner_text(".list"), "demo isionekane kwenye orodha ya wateja"
    print("ERRS", p.errs); assert not p.errs
    DEMO = {k: v for k, v in s.items() if k.startswith("shops/demo-") or k.startswith("brands/demo-")}
    if os.environ.get("DEMO_OUT"): open(os.environ["DEMO_OUT"], "w").write(_j.dumps(DEMO))
    p.browser_.close()

# demo inafunguka kwa msimamizi — Wadai (password demo), POS (PIN 1234) na pakiti
with sync_playwright() as pw:
    p = open_page(pw, "index.html?duka=demo-spea", DEMO, email=ADMIN); p.wait_for_timeout(1200)
    p.fill("#login-password", "demo"); p.keyboard.press("Enter"); p.wait_for_timeout(1200)
    t = p.inner_text("body"); print("wadai demo:", "BRAKE PAD" in t or "Bidhaa" in t)
    assert "Bidhaa" in t or "BRAKE" in t
    shot(p, "demo-spea"); errs = [e for e in p.errs if "Chart" not in e]; print("ERRS", errs); assert not errs; p.browser_.close()
with sync_playwright() as pw:
    p = open_page(pw, "pakiti.html?duka=demo-saluni", DEMO, email=ADMIN, w=390, h=820, mobile=True); p.wait_for_timeout(1500)
    t = p.inner_text("body"); print("saluni demo:", t[:120].replace("\n", " | "))
    p.evaluate("go('huduma')"); p.wait_for_timeout(400); t = p.inner_text("body")
    assert "Kusuka rasta" in t
    shot(p, "demo-saluni"); errs = [e for e in p.errs if "Chart" not in e]; print("ERRS", errs); assert not errs; p.browser_.close()

# 💓 ping kutoka mfumo wa mteja (pakiti: kufungua + muamala)
with sync_playwright() as pw:
    st = shop_store("x1", "supermarket", "mkaa")
    p = open_page(pw, "pakiti.html?duka=x1", st, w=390, h=820, mobile=True); p.wait_for_timeout(800); setup_owner(p); p.wait_for_timeout(300)
    p.evaluate("save({id:'sale_t1', t:'sale', k:'tx', items:[], total:1000})"); p.wait_for_timeout(300)
    h = store(p).get("shops/x1/data/_hai"); print("hai:", h)
    assert h and h["seen"] and h["sale"] and h["s_" + time.strftime("%Y-%m-%d")] == 1 and h["who"] == "mteja@test.com"
    p.browser_.close()

# 🧑‍💼 mfanyakazi: anaona Leo na mifumo, hawezi bei/muda/kufuta/mipangilio; Ofisi imefungwa
STAFF = dict(ST); STAFF["settings/staff"] = {"emails": ["juma@kazi.com"], "names": {"juma@kazi.com": "Juma"}}
with sync_playwright() as pw:
    p = open_page(pw, "kiwanda.html#amani", STAFF, email="juma@kazi.com"); p.wait_for_timeout(1000)
    t = p.inner_text("body")
    assert "Mfanyakazi" in t and "Amani Spares" in t and "📅 Leo" in t
    assert p.locator("button:has-text('＋ Mwezi 1')").count() == 0 and p.locator("button:has-text('⚠️ Hatari')").count() == 0
    assert "Mipangilio ya Kiwanda" not in t and p.locator("button:has-text('Mpe ')").count() == 0
    p.click("#sys-amani button:has-text('⏳ Muda')"); p.wait_for_timeout(200)
    assert "mmiliki baada ya malipo" in p.inner_text("#sys-amani")
    p.click("#sys-amani button:has-text('🧩 Vipengele')"); p.wait_for_timeout(200)
    assert p.locator("button:has-text('Hifadhi vipengele')").count() == 0
    shot(p, "kiwanda-mfanyakazi"); print("ERRS", p.errs); assert not p.errs; p.browser_.close()
with sync_playwright() as pw:
    p = open_page(pw, "ofisi.html", STAFF, email="juma@kazi.com"); p.wait_for_timeout(900)
    assert "Ofisi ni ya mmiliki tu" in p.inner_text("body"); p.browser_.close()
# mmiliki anaongeza mfanyakazi
with sync_playwright() as pw:
    p = open_page(pw, "kiwanda.html", ST, email=ADMIN); p.wait_for_timeout(800)
    p.evaluate("K.setOpen=true; render()"); p.wait_for_timeout(200)
    p.fill("#sf-name", "Asha"); p.fill("#sf-email", "asha@kazi.com"); p.click("button:has-text('＋ Ongeza mfanyakazi')"); p.wait_for_timeout(600)
    s = store(p); print("staff:", s.get("settings/staff")); assert "asha@kazi.com" in s["settings/staff"]["emails"]
    assert "kiwanda.html" in p.input_value("#staffmsg"); assert "isStaff()" in p.input_value("#rules")
    print("ERRS", p.errs); assert not p.errs; p.browser_.close()
print("✅ t_leo")
