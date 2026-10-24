"""Logo ya mteja inaonekana kwenye kila aina ya biashara (pakiti zote + spea)."""
from h import *
import re
inds = ["spea","supermarket","hoteli","mgahawa","famasia","saluni","boutique","simu","msambazaji"]
print("aina:", inds)
LOGO = None
with sync_playwright() as pw:
    for ind in inds:
        st = shop_store("x1", ind)
        st["shops/x1"]["brand"]["logo"] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        st["brands/x1"]["logo"] = st["shops/x1"]["brand"]["logo"]
        url = "pos.html?duka=x1" if ind == "spea" else "pakiti.html?duka=x1"
        p = open_page(pw, url, st, w=420, h=860); p.wait_for_timeout(900)
        if ind != "spea":
            try: setup_owner(p)
            except Exception: pass
            p.wait_for_timeout(300)
            side = p.evaluate("!!document.querySelector('.pk-logo img')")
            p.evaluate("receipt({title:'RISITI',no:1,items:[{name:'Bidhaa',qty:2,price:3000}],total:6000})"); p.wait_for_timeout(200)
            rc = p.evaluate("!!document.querySelector('.rc .rc-lg img')")
        else:
            side = p.evaluate("!!document.querySelector('.logo .mk img')"); rc = side
        print(f"{ind:12} kichwa:{'✅' if side else '❌'}  risiti:{'✅' if rc else '❌'}  ERRS {p.errs}")
        p.browser_.close()
