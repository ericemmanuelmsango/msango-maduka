from h import *
with sync_playwright() as pw:
    p = open_page(pw, "pakiti.html?duka=w1", shop_store("w1", "msambazaji", "bahari"))
    setup_owner(p)
    p.click(".pk-nav:has-text('Stoo')")
    for n,pr,c,q in [("Azam Embe 500ml",14000,11000,100),("Sukari 50kg",145000,130000,20)]:
        p.click("text=＋ Bidhaa"); p.fill("#pr-n",n); p.fill("#pr-p",str(pr)); p.fill("#pr-c",str(c)); p.fill("#pr-q",str(q)); p.click(".pk-md >> button:has-text('Hifadhi')"); p.wait_for_timeout(120)
    p.click(".pk-nav:has-text('Njia')"); p.click("text=＋ Njia >> nth=0"); p.fill("#rf-n","Igoma"); p.fill("#rf-r","Juma"); p.check("#rf-d6"); p.click(".pk-md >> button:has-text('Hifadhi')"); p.wait_for_timeout(120)
    p.click(".pk-nav:has-text('Maduka')"); 
    for n,l in [("Mama Neema Shop",300000),("Kirumba Traders",0)]:
        p.click("text=＋ Duka"); p.fill("#cf-n",n); p.select_option("#cf-r",index=1); p.fill("#cf-l",str(l)); p.fill("#cf-p","0754000000"); p.click(".pk-md >> button:has-text('Hifadhi')"); p.wait_for_timeout(120)
    p.click(".pk-nav:has-text('Oda')"); p.click("text=＋ Oda"); p.select_option("#od-c",index=1); p.wait_for_timeout(100); p.select_option("#od-p",index=1); p.fill("#od-q","2"); p.click(".pk-md >> button:has-text('＋')"); p.select_option("#od-p",index=0); p.fill("#od-q","10"); p.click(".pk-md >> button:has-text('＋')"); p.wait_for_timeout(100)
    print(p.inner_text(".pk-md")[:300]); shot(p,"ms-oda-form")
    p.click("text=✅ Hifadhi oda"); p.wait_for_timeout(300)
    p.click("text=📦 Pakia"); p.wait_for_timeout(200); p.click("text=🚚 Ondoka"); p.wait_for_timeout(200); shot(p,"ms-kanban")
    p.click("text=✅ Fikisha"); p.fill("#dl-0","1"); p.fill("#dl-paid","100000"); p.click("text=Imefikishwa — toa ankara"); p.wait_for_timeout(600)
    print(p.inner_text(".rc")[-300:]); p.click(".pk-md >> text=✕")
    st=store(p); print({v["name"]:v.get("qty") for v in st.values() if v.get("t")=="prod"}); print([(v["no"],v["total"],v.get("paid"),v.get("k")) for v in st.values() if v.get("t")=="inv"])
    p.click(".pk-nav:has-text('Ankara')"); p.wait_for_timeout(200); print(p.inner_text(".pk-page")[:500]); shot(p,"ms-ankara")
    p.click(".pk-nav:has-text('Maduka')"); p.click("tr:has-text('Kirumba')"); p.wait_for_timeout(200); p.click("text=💵 Pokea malipo"); p.click(".pk-md >> text=✅ Pokea"); p.wait_for_timeout(300); print(p.inner_text(".rc")[-200:]); p.click(".pk-md >> text=✕")
    p.click(".pk-nav:has-text('Njia')"); p.wait_for_timeout(200); shot(p,"ms-njia"); print(p.inner_text(".pk-page")[:300])
    p.click(".pk-nav:has-text('Ripoti')"); p.wait_for_timeout(200); print(p.inner_text(".kpis"))
    print("ERRS", p.errs)
