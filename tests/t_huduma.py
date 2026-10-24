"""Kiwanda: logo ya mteja + huduma za kipekee (AI/chapa) + logo kwenye mifumo ya mteja (si nembo ya EE)."""
from h import *
now = time.time() * 1000
SHOP = {"name": "Kirumba Spare Centre", "industry": "spea", "edition": "duka", "members": ["mteja@test.com"], "active": True,
        "paidUntil": now + 20 * DAY, "trialEnds": now + 5 * DAY, "createdAt": now, "brand": {"theme": "", "color": "#b45309", "tagline": "Spea za pikipiki"},
        "phone": "0755000111", "location": "Kirumba", "clientId": "c1", "monthly": 30000}
ST = {"shops/kirumba": SHOP, "brands/kirumba": {"name": SHOP["name"], "color": "#b45309", "industry": "spea"},
      "clients/c1": {"id": "c1", "name": SHOP["name"], "owner": "Juma", "addons": [], "onboard": {"contract": {"done": True}, "accounts": {"done": True}}, "payments": []}}
with sync_playwright() as pw:
    p = open_page(pw, "kiwanda.html#kirumba", ST, email=ADMIN)
    p.wait_for_timeout(600)
    print("chips:", p.inner_text(".chips"))
    p.click("button:has-text('🚀 Huduma za kipekee')"); p.wait_for_timeout(200)
    p.locator(".svc:has-text('Brand kit') >> button:has-text('＋ Ongeza')").click(); p.wait_for_timeout(300)
    p.locator(".svc:has-text('Msaidizi wa SMS') >> button:has-text('＋ Ongeza')").click(); p.wait_for_timeout(300)
    p.locator(".svc:has-text('Brand kit') >> select").select_option("imelipwa"); p.wait_for_timeout(300)
    s = store(p); ad = s["clients/c1"]["addons"]
    print("addons:", [(a["svc"], a["status"], a["kind"], a["price"]) for a in ad])
    assert [a["svc"] for a in ad] == ["brandkit", "msaidiziSms"] and ad[0]["status"] == "imelipwa"
    print("stats:", p.inner_text(".wrap > .note"))
    shot(p, "kiwanda-huduma")
    # Claude prompt (clipboard)
    p.context.grant_permissions(["clipboard-read", "clipboard-write"])
    p.evaluate("window.open=()=>null"); p.locator(".svc:has-text('Brand kit') >> button:has-text('🤖 Claude')").click(); p.wait_for_timeout(300)
    clip = p.evaluate("navigator.clipboard.readText()"); print("prompt:", clip.splitlines()[:3]); assert clip.startswith("/brand-kit-duka") and "Kirumba Spare Centre" in clip
    # logo
    p.click("button:has-text('🎨 Chapa')"); p.wait_for_timeout(200)
    print("initials preview:", p.inner_html(".lgprev")[:80])
    d = p.evaluate("""async()=>{ const c=document.createElement('canvas'); c.width=600;c.height=400; const x=c.getContext('2d'); x.fillStyle='#b45309'; x.beginPath(); x.arc(300,200,180,0,7); x.fill();
      const blob=await new Promise(r=>c.toBlob(r,'image/png')); const u=await dukaShrinkLogo(new File([blob],'l.png',{type:'image/png'})); setLogo('kirumba',u); return u.length; }""")
    print("logo bytes:", d); p.click("button:has-text('💾 Hifadhi chapa')"); p.wait_for_timeout(500)
    s = store(p); print("brand logo saved:", s["shops/kirumba"]["brand"]["logo"][:30], "| public:", s["brands/kirumba"]["logo"][:22])
    assert s["brands/kirumba"]["logo"].startswith("data:image/png")
    shot(p, "kiwanda-logo")
    print("ERRS", p.errs); p.browser_.close()
    # client POS: logo shows, not EE
    ST2 = store(p) if False else None
with sync_playwright() as pw:
    st = dict(ST); st["shops/kirumba"] = {**SHOP, "brand": {**SHOP["brand"]}}
    p = open_page(pw, "pos.html?duka=kirumba", st)
    p.wait_for_timeout(800)
    mk = p.evaluate("(document.querySelector('.logo .mk')||{}).innerHTML||''"); print("pos mark (no logo):", mk[:120]); assert ">EE<" not in mk and ">KS<" in mk
    print("ERRS", p.errs); p.browser_.close()
# mfumo wa zamani bila rekodi ya Ofisi → kitufe cha kuunganisha
with sync_playwright() as pw:
    old = {**SHOP, "name": "Shemdar", "clientId": ""}
    p = open_page(pw, "kiwanda.html#shemdar", {"shops/shemdar": old, "brands/shemdar": {"name": "Shemdar"}}, email=ADMIN)
    p.wait_for_timeout(600); p.click("button:has-text('🚀 Huduma za kipekee')"); p.wait_for_timeout(200)
    p.click("button:has-text('🔗 Unganisha sasa')"); p.wait_for_timeout(700)
    s = store(p); cid = s["shops/shemdar"]["clientId"]; print("linked:", cid, s["clients/" + cid]["name"], s["clients/" + cid]["stage"])
    assert p.locator(".svc").count() == 8
    print("ERRS", p.errs); p.browser_.close()
