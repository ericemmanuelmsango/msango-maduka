from h import *
with sync_playwright() as pw:
    st = shop_store("sp1", "spea", "")
    for u in ["index.html?duka=sp1","pos.html?duka=sp1"]:
        p = open_page(pw, u, st); p.wait_for_timeout(1200); print(u, "->", p.url.split("/")[-1], "|", p.inner_text("body")[:120].replace("\n"," "), p.errs); p.browser_.close()
