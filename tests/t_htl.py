from h import *
with sync_playwright() as pw:
    p = open_page(pw, "pakiti.html?duka=h1", shop_store("h1", "hoteli", "dhahabu"))
    setup_owner(p); shot(p,"h-empty")
    p.click("button:has-text('Panga vyumba')"); 
    for n,r in [("Single",35000),("Deluxe",80000)]:
        p.click(".pk-md >> text=＋ Aina ya chumba"); p.fill("#tf-n",n); p.fill("#tf-r",str(r)); p.click(".pk-md >> text=Hifadhi"); p.wait_for_timeout(150)
    p.fill("#sr-a","101"); p.fill("#sr-b","106"); p.fill("#sr-f","1"); p.click(".pk-md >> text=＋ Ongeza"); p.wait_for_timeout(150)
    p.select_option("#sr-t", index=1); p.fill("#sr-a","201"); p.fill("#sr-b","203"); p.fill("#sr-f","2"); p.click(".pk-md >> text=＋ Ongeza"); p.wait_for_timeout(150)
    p.click(".pk-md >> [aria-label=Funga]")
    print(p.inner_text(".kpis"))
    # walk-in
    p.click(".tile:has-text('102')"); p.click("text=Mgeni wa sasa"); p.fill("#ci-g","John Mushi"); p.fill("#ci-p","0712345678"); p.fill("#ci-id","19900101-1"); p.fill("#ci-n","2"); p.fill("#ci-pay","35000"); p.click("text=Mpe chumba"); p.wait_for_timeout(300)
    # booking via form
    p.click(".pk-nav:has-text('Booking')"); p.click("text=＋ Booking"); p.fill("#bf-g","Asha Juma"); p.fill("#bf-to", ""); 
    p.evaluate("document.getElementById('bf-to').value='%s';PK._bf.draw()" % p.evaluate("addDays(today(),3)"))
    print("rooms opts:", p.evaluate("[...document.querySelectorAll('#bf-room option')].length"))
    p.select_option("#bf-room", label=p.evaluate("[...document.querySelectorAll('#bf-room option')].find(o=>o.text.startsWith('201')).text"))
    p.fill("#bf-dep","20000"); p.click("text=Hifadhi booking"); p.wait_for_timeout(300)
    shot(p,"h-booking"); print(p.inner_text(".pk-page")[:300])
    # check-in arrival
    p.click(".card >> text=Check-in"); p.fill("#ci-pay","0"); p.click("text=Mpe chumba"); p.wait_for_timeout(300)
    p.click(".pk-nav:has-text('Vyumba')"); shot(p,"h-vyumba"); print(p.inner_text(".kpis"))
    # folio: add charge, pay, checkout
    p.click(".tile:has-text('102')"); p.fill("#fc-n","Chakula"); p.fill("#fc-a","12000"); p.click(".pk-md >> button:has-text('＋')"); p.wait_for_timeout(200)
    shot(p,"h-folio"); print(p.inner_text(".pk-md table"))
    p.click("text=Pokea malipo"); p.click(".chip:has-text('M-Pesa')"); p.click("text=✅ Thibitisha"); p.wait_for_timeout(300)
    p.click("text=🚪 Check-out"); p.wait_for_timeout(100); print(p.inner_text(".pk-md")[:120]); p.click(".pk-md >> button:has-text('Check-out')"); p.wait_for_timeout(300)
    print(p.inner_text(".kpis"))
    p.click(".pk-nav:has-text('Usafi')"); print(p.inner_text(".pk-page")[:200])
    p.click(".pk-nav:has-text('Ripoti')"); p.wait_for_timeout(200); print(p.inner_text(".kpis")); shot(p,"h-ripoti")
    p.click(".pk-nav:has-text('Wageni')"); print(p.inner_text(".pk-page")[:400])
    p.set_viewport_size({"width":390,"height":800}); p.click(".pk-bot >> text=Vyumba"); p.wait_for_timeout(200); shot(p,"h-mobile")
    p.click(".pk-bot >> text=Booking"); p.wait_for_timeout(200); shot(p,"h-mobile-booking")
    print("ERRS", p.errs)
