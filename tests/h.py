"""Playwright harness for Msango packs (mock Firebase). Usage: from h import *"""
import json, time, subprocess, os, socket
from playwright.sync_api import sync_playwright

PORT = int(os.environ.get("PORT", 8799))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = f"http://localhost:{PORT}/"
ADMIN = "ericemmanuelmsango2004@gmail.com"
FAKE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fakefb.js")).read()
DAY = 864e5

def ensure_server():
    s = socket.socket()
    try:
        s.connect(("localhost", PORT)); s.close(); return
    except Exception:
        pass
    subprocess.Popen(["python3", "-m", "http.server", str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)

def shop_store(code, industry, theme=None, email="mteja@test.com", days=20, extra=None):
    now = time.time() * 1000
    shop = {"name": "Duka la " + industry.title(), "industry": industry, "edition": "pro", "members": [email], "active": True,
            "paidUntil": now + days * DAY, "brand": {"theme": theme or "", "color": "", "tagline": ""}, "phone": "0755000111", "location": "Mwanza"}
    st = {f"shops/{code}": shop, f"brands/{code}": {"name": shop["name"], "theme": theme or "", "industry": industry}}
    if extra:
        for k, v in extra.items():
            st[f"shops/{code}/data/{k}"] = {**v, "id": k}
    return st

def open_page(pw, url, store, email="mteja@test.com", w=1280, h=860, mobile=False):
    ensure_server()
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={"width": w, "height": h}, is_mobile=mobile, has_touch=mobile)
    scen = {"store": store, "user": {"email": email} if email else None, "admin": ADMIN, "rules": "strict"}
    ctx.add_init_script("localStorage.setItem('SCEN', %s);" % json.dumps(json.dumps(scen)))
    def route(r):
        u = r.request.url
        if "firebase-app-compat" in u: return r.fulfill(body=FAKE, content_type="application/javascript")
        if "gstatic" in u: return r.fulfill(body="", content_type="application/javascript")
        if "fonts.g" in u or "jsdelivr" in u: return r.fulfill(body="", content_type="text/css")
        return r.continue_()
    ctx.route("**/*", route)
    p = ctx.new_page()
    errs = []
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.on("console", lambda m: m.type == "error" and errs.append(m.text))
    p.goto(BASE + url)
    p.wait_for_timeout(700)
    p.errs = errs; p.browser_ = b
    return p

def setup_owner(p, name="Eric", pin="1234"):
    p.fill("#su-name", name); p.fill("#su-pin", pin); p.fill("#su-pin2", pin); p.click("button:has-text(\"Anza\")"); p.wait_for_timeout(300)

def shot(p, name):
    path = os.path.join(os.environ.get("SHOTS", "/tmp/msango-shots"), name + ".png"); os.makedirs(os.path.dirname(path), exist_ok=True)
    p.screenshot(path=path, full_page=False); return path

def store(p):
    return p.evaluate("window.__store")
