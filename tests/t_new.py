from h import *
with sync_playwright() as pw:
    old = {"sale_old": {"t":"sale","k":"tx","day":"2026-08-15","total":50000,"items":[{"name":"X","qty":1,"price":50000,"cost":30000}],"method":"cash","paid":50000,"no":99}}
    p = open_page(pw, "pakiti.html?duka=sm1", shop_store("sm1", "supermarket", "mkaa", extra=old))
    setup_owner(p)
    p.click(".pk-nav:has-text('Matumizi')"); p.wait_for_timeout(200)
    p.click("text=＋ Matumizi"); p.fill("#ex-c","Umeme"); p.fill("#ex-a","40000"); p.click(".pk-md >> button:has-text('Hifadhi')"); p.wait_for_timeout(200)
    p.click(".chip:has-text('Mwezi uliopita')"); p.wait_for_timeout(200); p.click(".chip:has-text('📅 Chagua')"); p.fill("#rg-f","2026-08-01"); p.dispatch_event("#rg-f","change"); p.wait_for_timeout(500)
    print(p.inner_text(".kpis")); shot(p,"new-matumizi")
    p.click(".chip:has-text('Leo')"); p.wait_for_timeout(200); print(p.inner_text(".kpis"))
    p.click(".pk-nav:has-text('Mipangilio')"); p.select_option("#st-rcw","58"); p.click("text=💾 Hifadhi mipangilio"); p.wait_for_timeout(200)
    with p.expect_download() as d: p.click("text=Pakua backup sasa")
    print("backup:", d.value.suggested_filename, open(d.value.path()).read()[:120])
    p.evaluate("receipt({title:'RISITI',no:1,items:[{name:'Sukari',qty:1,price:3000}],total:3000})"); p.wait_for_timeout(200); print("58:", p.evaluate("document.querySelector('.rc').className")); shot(p,"new-58")
    print("ERRS", p.errs)
