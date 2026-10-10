from h import *
import time
now=time.time()*1000
with sync_playwright() as pw:
    p = open_page(pw, "pakiti.html?duka=f1", shop_store("f1", "famasia", "zumaridi"))
    setup_owner(p)
    exp = lambda d: p.evaluate(f"addDays(today(),{d})")
    p.click(".pk-nav:has-text('Dawa')")
    p.click("text=＋ Dawa"); p.fill("#dg-n","Amoxil"); p.fill("#dg-g","Amoxicillin"); p.fill("#dg-s","500mg"); p.select_option("#dg-f","Capsule"); p.fill("#dg-p","300"); p.fill("#dg-c","150"); p.check("#dg-rx"); p.fill("#b-no","AMX01"); p.fill("#b-ex",exp(20)); p.fill("#b-q","10"); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(150)
    p.click("text=📦 Pokea stock"); p.fill("#bt-no","AMX02"); p.fill("#bt-ex",exp(400)); p.fill("#bt-q","100"); p.fill("#bt-c","140"); p.click(".pk-md >> text=✅ Ingiza"); p.wait_for_timeout(150)
    p.click("text=＋ Dawa"); p.fill("#dg-n","Panadol"); p.fill("#dg-g","Paracetamol"); p.fill("#dg-p","100"); p.fill("#dg-c","50"); p.fill("#b-no","PN1"); p.fill("#b-ex",exp(300)); p.fill("#b-q","200"); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(150)
    # expired batch injected directly
    p.evaluate("save({id:newId('batch'),t:'batch',drug:list('drug').find(d=>d.name==='Panadol').id,no:'OLD',exp:addDays(today(),-3),qty:50,cost:50})"); p.wait_for_timeout(200)
    shot(p,"fm-dawa"); print(p.inner_text(".kpis"))
    p.click(".pk-nav:has-text('Uza')"); p.fill("#fm-q","amoxi"); p.wait_for_timeout(300); p.press("#fm-q","Enter"); p.wait_for_timeout(100)
    p.click("text=＋ maelekezo"); p.click(".pk-md >> .chip:has-text('1×3')"); p.click(".pk-md >> .chip:has-text('siku 5')"); p.fill("#dq","15"); p.click(".pk-md >> text=Sawa")
    p.click(".prod:has-text('Panadol')"); 
    shot(p,"fm-uza")
    p.click("text=💳 Lipa"); p.fill("#rx-p","Neema John"); p.fill("#rx-d","Dkt. Mollel"); p.fill("#rx-h","Bugando"); p.click("text=Endelea kulipa"); p.click("text=✅ Thibitisha"); p.wait_for_timeout(500)
    print(p.inner_text(".rc")); p.click(".pk-md >> text=✕")
    st=store(p); print({v["no"]:v["qty"] for v in st.values() if v.get("t")=="batch"})
    p.click(".pk-nav:has-text('Zinaisha')"); p.wait_for_timeout(200); shot(p,"fm-muda"); print(p.inner_text(".kpis"))
    p.click("text=Ondoa"); p.click(".pk-md >> button:has-text('Ondoa')"); p.wait_for_timeout(200); print(p.inner_text(".kpis"))
    p.click(".pk-nav:has-text('Vyeti')"); p.wait_for_timeout(200); print(p.inner_text(".pk-page")[:400])
    p.click(".pk-nav:has-text('Ripoti')"); p.wait_for_timeout(200); print(p.inner_text(".kpis"))
    print("ERRS", p.errs)
