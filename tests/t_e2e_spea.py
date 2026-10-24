"""Safari kamili ya mteja wa SPEA: Kiwanda (mfumo + logo) → Huduma za kipekee → Ofisi (pendekezo) → POS ya mteja (logo + risiti)."""
from h import *
LOGO_JS = """async()=>{ const c=document.createElement('canvas'); c.width=400;c.height=400; const x=c.getContext('2d');
  x.fillStyle='#12264a'; x.beginPath(); x.moveTo(200,20); x.lineTo(370,80); x.lineTo(370,220); x.quadraticCurveTo(370,330,200,385); x.quadraticCurveTo(30,330,30,220); x.lineTo(30,80); x.closePath(); x.fill();
  x.fillStyle='#c9a227'; x.font='bold 150px Georgia'; x.textAlign='center'; x.fillText('JS',200,265);
  const blob=await new Promise(r=>c.toBlob(r,'image/png')); return await dukaShrinkLogo(new File([blob],'logo.png',{type:'image/png'})); }"""
with sync_playwright() as pw:
    # 1. Kiwanda: tengeneza mfumo wa spea wenye logo
    p = open_page(pw, "kiwanda.html", {}, email=ADMIN); p.wait_for_timeout(500)
    p.click("button:has-text('＋ Mfumo mpya')"); p.wait_for_timeout(200)
    p.fill("#nf-name", "Jaribio Spea Mwanza"); p.fill("#nf-owner", "Juma Hassan"); p.fill("#nf-phone", "0755123456"); p.fill("#nf-location", "Kirumba, Mwanza")
    p.fill("#nf-email", "jaribio@test.com"); p.fill("#nf-tagline", "Spea za pikipiki — jumla na rejareja")
    logo = p.evaluate(LOGO_JS); p.evaluate("(u)=>setLogo('new',u)", logo); p.wait_for_timeout(200)
    shot(p, "e2e-1-fomu")
    p.click("button:has-text('🏭 Tengeneza mfumo')"); p.wait_for_timeout(1200)
    s = store(p); code = "jaribio-spea-mwanza"; sh = s["shops/" + code]; cid = sh["clientId"]
    print("1. mfumo:", code, "| logo:", sh["brand"]["logo"][:22], "| client:", s["clients/" + cid]["stage"], "| public logo:", bool(s["brands/" + code]["logo"]))
    # 2. Huduma za kipekee
    p.click("button:has-text('🚀 Huduma za kipekee')"); p.wait_for_timeout(300)
    for name in ["Brand kit", "Picha za bidhaa", "Msaidizi wa SMS"]:
        p.locator(f".svc:has-text('{name}') >> button:has-text('＋ Ongeza')").click(); p.wait_for_timeout(250)
    p.locator(".svc:has-text('Brand kit') >> select").select_option("imelipwa"); p.wait_for_timeout(250)
    p.locator(".svc:has-text('Picha za bidhaa') >> select").select_option("inaendelea"); p.wait_for_timeout(250)
    ad = store(p)["clients/" + cid]["addons"]; print("2. huduma:", [(a["svc"], a["status"]) for a in ad])
    print("   takwimu:", p.inner_text(".wrap > .note").split("·", 1)[1].strip())
    p.context.grant_permissions(["clipboard-read", "clipboard-write"]); p.evaluate("window.open=(u)=>{window.__opened=u;return null}")
    p.locator(".svc:has-text('Msaidizi wa SMS') >> button:has-text('🤖 Claude')").click(); p.wait_for_timeout(300)
    print("   claude:", p.evaluate("navigator.clipboard.readText()").splitlines()[:2], "→", p.evaluate("window.__opened"))
    p.click("button:has-text('👋 Karibu')"); p.wait_for_timeout(200); print("   whatsapp:", p.evaluate("window.__opened")[:60])
    shot(p, "e2e-2-huduma")
    STORE = store(p); print("ERRS", p.errs); p.browser_.close()

    # 3. Ofisi: pendekezo na mkataba vinabeba huduma
    p = open_page(pw, "ofisi.html", STORE, email=ADMIN); p.wait_for_timeout(800)
    prop = p.evaluate("(id)=>proposalText(S.clients[id])", cid)
    print("3. ofisi pendekezo:", [l for l in prop.splitlines() if "TZS" in l][:6])
    print("ERRS", p.errs); p.browser_.close()

    # 4. Mfumo wa mteja: POS yenye logo yake + risiti
    p = open_page(pw, "pos.html?duka=" + code, STORE, email="jaribio@test.com", w=420, h=900); p.wait_for_timeout(1200)
    print("4. pos kichwa:", p.inner_text("body")[:80].replace("\n", " | "))
    print("   logo ya mteja kichwani:", p.evaluate("!!document.querySelector('.logo .mk img')"))
    shot(p, "e2e-3-pos")
    print("ERRS", p.errs); p.browser_.close()
