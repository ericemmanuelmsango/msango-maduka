"""Hitilafu zinajiandika + ripoti ya mteja + Kiwanda inaziona."""
from h import *
import time
with sync_playwright() as pw:
    st = shop_store("h1", "hoteli", "dhahabu")
    p = open_page(pw, "pakiti.html?duka=h1", st); setup_owner(p)
    p.evaluate("setTimeout(()=>{throw new Error('jaribio la hitilafu')},0)"); p.wait_for_timeout(300)
    p.click(".pk-side button:has-text(\"Ripoti tatizo\")"); p.fill("#duka-rep-t", "Nikibonyeza Lipa haifanyi kitu"); p.fill("#duka-rep-p", "0755"); p.click("#duka-rep-s"); p.wait_for_timeout(400)
    errs = [v for k, v in store(p).items() if k.startswith("errors/")]
    print("errors saved:", [(e["type"], e["msg"][:40], e["shop"]) for e in errs])
    assert any(e["type"] == "error" for e in errs) and any(e["type"] == "report" for e in errs), "hitilafu hazikuhifadhiwa"
    p.browser_.close()
    st2 = {**st, **{f"errors/e{i}": {**e, "id": f"e{i}"} for i, e in enumerate(errs)}}; st2["shops/h1"]["createdAt"] = time.time() * 1000
    p = open_page(pw, "kiwanda.html", st2, email=ADMIN); p.wait_for_timeout(600)
    p.click("summary:has-text('Hitilafu')"); p.wait_for_timeout(500)
    txt = p.inner_text("details:has(summary:has-text('Hitilafu'))"); print(txt[:300])
    assert "jaribio la hitilafu" in txt and "Nikibonyeza Lipa" in txt
    p.page_errs = [e for e in p.errs]
    print("ERRS", [e for e in p.errs if "jaribio" not in e])
