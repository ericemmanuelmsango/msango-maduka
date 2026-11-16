"""Vipengele vya hiari kutoka Wadai: mauzoFolda, ripotiMpya, futaKabisa, vifaaNet.
Duka lisilowashiwa halibadiliki; lililowashiwa linapata folda, ripoti mpya, vifaa, na kufuta kabisa."""
from h import *

SEED = """(()=>{ const t=todayStr(); const y=(()=>{const d=new Date(Date.now()-864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
  const mk=(id,c,n,q,p,d)=>({id,itemName:n,qty:q,sellPrice:p,buyPrice:p-1000,total:q*p,date:d,customer:c,store:'dukani',createdAt:Date.now()});
  STATE.sales=[mk('s1','Ali',"Chain",2,5000,t),mk('s2','Ali',"Bulb",1,3000,t),mk('s3','Neema',"Clutch",1,9000,t),mk('s4','Ali',"Chain",1,5000,y)];
  STATE.settings.appPassword=STATE.settings.appPassword||'pw12345'; SESSION_UNLOCKED=true; UI.financialsUnlocked=true; })()"""

def shop(features):
    st = shop_store("sp1", "spea", "", extra={"data": {"settings": {"appPassword": "pw12345"}}})
    st["shops/sp1"]["features"] = features
    return st

with sync_playwright() as pw:
    # 1. BILA vipengele: mauzo na ripoti kama zamani
    p = open_page(pw, "index.html?duka=sp1", shop({})); p.wait_for_timeout(900)
    p.evaluate(SEED); p.evaluate("setPage('sales')"); p.wait_for_timeout(300)
    t = p.inner_text("#app")
    assert "PDF ya siku" not in t and "🗂️" not in t and "TSh 22,000" in t, "duka lisilowashiwa limebadilika (mauzo)"
    p.evaluate("setPage('reports')"); p.wait_for_timeout(300); t = p.inner_text("#app")
    assert "Faida halisi" not in t or "🗂️" not in t, "duka lisilowashiwa limebadilika (ripoti)"
    p.evaluate("setPage('settings')"); p.wait_for_timeout(300)
    assert "Vifaa vinavyotumia mfumo" not in p.inner_text("#app") and p.evaluate("DEV") is None
    print("1. bila vipengele: kama zamani ✓ | ERRS", p.errs); assert not p.errs; p.browser_.close()

    # 2. mauzoFolda + ripotiMpya + vifaaNet (bila futaKabisa): kufuta kunaficha tu, kunarudishwa
    p = open_page(pw, "index.html?duka=sp1", shop({"mauzoFolda": True, "ripotiMpya": True, "vifaaNet": True})); p.wait_for_timeout(900)
    p.on("dialog", lambda d: d.accept())
    p.evaluate(SEED); p.evaluate("setPage('sales')"); p.wait_for_timeout(300); t = p.inner_text("#app")
    assert "PDF ya siku" in t and "Futa siku nzima" in t, "folda za mauzo hazionekani"
    shot(p, "vip-1-mauzo-folda")
    p.click("button:has-text('Futa siku nzima') >> nth=0"); p.wait_for_timeout(400)
    hidden = p.evaluate("STATE.sales.filter(s=>s.fileDeleted).length"); print("2. faili zilizofichwa:", hidden)
    assert hidden == 3 and p.evaluate("STATE.sales.length") == 4, "bila futaKabisa, mauzo yasifutwe kabisa"
    assert "Faili zilizofutwa" in p.inner_text("#app")
    p.click("text=Faili zilizofutwa"); p.wait_for_timeout(200); p.click("button:has-text('Rudisha siku nzima')"); p.wait_for_timeout(300)
    assert p.evaluate("STATE.sales.filter(s=>s.archived).length") == 0; print("   kurudisha ✓")
    p.evaluate("setPage('reports')"); p.wait_for_timeout(400); t = p.inner_text("#app")
    assert "PDF ya siku" in t and "Faida halisi" in t and "History" in t, "ripoti mpya haionekani"
    shot(p, "vip-2-ripoti")
    p.evaluate("UI.plView='item';rerender()"); p.wait_for_timeout(300); assert "Chain" in p.inner_text("#app")
    p.evaluate("UI.plView='customer';rerender()"); p.wait_for_timeout(300); assert "Neema" in p.inner_text("#app")
    p.evaluate("setPage('settings')"); p.wait_for_timeout(1500)
    assert "Vifaa vinavyotumia mfumo" in p.inner_text("#app") and p.evaluate("!!DEV"), "vifaa havionekani"
    shot(p, "vip-3-vifaa")
    print("   ripoti mpya + vifaa ✓ | ERRS", p.errs); assert not p.errs; p.browser_.close()

    # 3. futaKabisa: andika FUTA -> mauzo yanaondoka kabisa
    p = open_page(pw, "index.html?duka=sp1", shop({"mauzoFolda": True, "futaKabisa": True})); p.wait_for_timeout(900)
    p.on("dialog", lambda d: d.accept("FUTA"))
    p.evaluate(SEED); p.evaluate("setPage('sales')"); p.wait_for_timeout(300)
    p.click("button:has-text('Futa siku nzima') >> nth=0"); p.wait_for_timeout(400)
    left = p.evaluate("STATE.sales.map(s=>s.id)"); print("3. futa kabisa, yamebaki:", left)
    assert left == ["s4"], left
    print("   ERRS", p.errs); assert not p.errs; p.browser_.close()
print("VIPENGELE OK")
