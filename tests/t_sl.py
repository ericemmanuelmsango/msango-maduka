from h import *
with sync_playwright() as pw:
    p = open_page(pw, "pakiti.html?duka=s1", shop_store("s1", "saluni", "kifalme"))
    setup_owner(p)
    p.click("button:has-text('💇 Huduma')")
    for n,c,pr,d in [("Rasta","Kusuka",35000,180),("Manicure","Kucha",10000,45),("Kunyoa","Kunyoa",5000,30)]:
        p.click("text=＋ Ongeza"); p.fill("#sv-n",n); p.fill("#sv-c",c); p.fill("#sv-p",str(pr)); p.fill("#sv-d",str(d)); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(100)
    p.click(".chip:has-text('Wahudumu')")
    for n,k in [("Neema",40),("Asha",30),("Juma",25)]:
        p.click("text=＋ Ongeza"); p.fill("#st-n",n); p.fill("#st-k",str(k)); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(100)
    p.click(".chip:has-text('Bidhaa')"); p.click("text=＋ Ongeza"); p.fill("#pr-n","Mafuta ya nywele"); p.fill("#pr-p","8000"); p.fill("#pr-q","10"); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(100)
    p.click(".pk-nav:has-text('Miadi')"); p.wait_for_timeout(200)
    p.click("text=＋ Miadi"); p.fill("#af-c","Mama Rehema"); p.fill("#af-p","0754111222"); p.fill("#af-t","10:00"); p.select_option("#af-s", label="Neema"); p.click("[data-svc] >> text=Rasta"); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(200)
    p.click("text=＋ Miadi"); p.fill("#af-c","Zuhura"); p.fill("#af-t","11:30"); p.select_option("#af-s", label="Asha"); p.click("[data-svc] >> text=Manicure"); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(200)
    # clash
    p.click("text=＋ Miadi"); p.fill("#af-c","Clash"); p.fill("#af-t","11:00"); p.select_option("#af-s", label="Neema"); p.click("[data-svc] >> text=Kunyoa"); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(200); print("clash toast:", p.inner_text("#pk-toast")); p.click(".pk-md >> [aria-label=Funga]")
    shot(p,"sl-miadi")
    p.click(".ev:has-text('Mama Rehema')"); p.click("text=✅ Amefika"); p.click(".ev:has-text('Mama Rehema')"); p.click("text=Maliza & lipa"); p.wait_for_timeout(200)
    p.click(".prod:has-text('Mafuta')"); shot(p,"sl-kaunta")
    p.click("text=💳 Lipa >> nth=0"); p.click(".chip:has-text('M-Pesa')"); p.click("text=✅ Thibitisha"); p.wait_for_timeout(400); print(p.inner_text(".rc")[:350]); p.click(".pk-md >> text=✕")
    p.click(".pk-nav:has-text('Wateja')"); p.wait_for_timeout(200); print(p.inner_text(".pk-page")[:300])
    p.click(".pk-nav:has-text('Ripoti')"); p.wait_for_timeout(200); print(p.inner_text(".pk-page")[:700]); shot(p,"sl-ripoti")
    p.set_viewport_size({"width":390,"height":800}); p.click(".pk-bot >> text=Miadi"); p.wait_for_timeout(200); shot(p,"sl-mobile")
    print("ERRS", p.errs)
