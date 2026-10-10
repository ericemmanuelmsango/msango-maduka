from h import *
import time
with sync_playwright() as pw:
    st = shop_store("h1", "hoteli", "dhahabu", extra={"user_x":{"t":"user","k":"cfg","name":"Mama","role":"owner","pinHash":"x","active":True}})
    for url in ["index.html?duka=h1","pos.html?duka=h1"]:
        p = open_page(pw, url, st); p.wait_for_timeout(800); print(url, "->", p.url.split("/")[-1], "|", p.inner_text("#app")[:60].replace("\n"," ")); p.browser_.close()
    # unsigned device on index
    p = open_page(pw, "index.html?duka=h1", st, email=None); p.wait_for_timeout(800); print("unsigned ->", p.url.split("/")[-1], "|", p.inner_text("#app")[:80].replace("\n"," ")); p.browser_.close()
    # expired
    st2 = shop_store("h2", "hoteli", "dhahabu", days=-2)
    p = open_page(pw, "pakiti.html?duka=h2", st2); p.wait_for_timeout(500); print("expired:", p.inner_text("#app")[:120].replace("\n"," ")); shot(p,"int-expired"); p.browser_.close()
    # admin preview
    p = open_page(pw, "pakiti.html?duka=h1", st, email=ADMIN); p.wait_for_timeout(500); print("admin:", p.inner_text("#app")[:150].replace("\n"," ")); p.browser_.close()
    # spea shop on pakiti -> back to index
    st3 = shop_store("sp1", "spea", "")
    p = open_page(pw, "pakiti.html?duka=sp1", st3); p.wait_for_timeout(900); print("spea pakiti ->", p.url.split("/")[-1]); p.browser_.close()
    # kiwanda as admin
    allst = {**st, **st3}
    allst["shops/h1"]["createdAt"]=time.time()*1000; allst["shops/sp1"]["createdAt"]=time.time()*1000-1000
    p = open_page(pw, "kiwanda.html", allst, email=ADMIN); p.wait_for_timeout(800)
    links = p.evaluate("[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>h&&h.includes('duka='))"); print("kiwanda links:", links)
    p.click("text=Duka la Hoteli"); p.click("button:has-text(\"Badilisha\")"); p.wait_for_timeout(300)
    try:
        p.click("button:has-text(\"Kuingia\")"); p.wait_for_timeout(500); print(p.inner_text(".box")[:300])
        p.fill("#pkpin-user_x","4321"); p.click("text=Weka PIN"); p.wait_for_timeout(300); print("pin:", store(p)["shops/h1/data/user_x"]["pinHash"][:12])
    except Exception as e: print("kuingia err", e)
    shot(p,"int-kiwanda"); print("ERRS", p.errs); p.browser_.close()
    p = open_page(pw, "katalogi.html", {}, email=None); p.wait_for_timeout(500); print("katalogi:", p.inner_text("body")[:200].replace("\n"," ")); print("ERRS", p.errs); shot(p,"int-katalogi")
