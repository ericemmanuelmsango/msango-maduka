"""QuantVision Mobile: dashboard, trades, signals, control na akaunti."""
from h import *
import time
now = time.time() * 1000
st = {"k": "x", "login": "51234567", "name": "Eric Msango", "server": "Exness-MT5Trial", "currency": "USD", "demo": True, "balance": 1000, "equity": 1012.4,
      "freeMargin": 980, "today": 18.2, "todayPct": 1.8, "tradesToday": 1, "maxTrades": 3, "dailyStop": False, "maxDailyLoss": 3, "auto": False, "paused": False, "risk": 1,
      "symbol": "XAUUSD", "tf": "M5", "digits": 2, "bid": 4123.45, "ask": 4123.70, "spread": 25, "htf": 1, "htfName": "H1", "live": True, "dir": 1, "score": 80, "minScore": 70,
      "trigger": True, "kz": "London", "entry": 4123.5, "sl": 4118.2, "tp": 4134.1, "rr": 2.0,
      "checklist": [{"label": "H1 bias bullish", "w": 20, "ok": True, "veto": False}, {"label": "Price in discount", "w": 10, "ok": False, "veto": False}],
      "positions": [{"ticket": "1", "side": "BUY", "vol": 0.05, "open": 4120.1, "sl": 4115.0, "tp": 4131.0, "price": 4123.45, "profit": 12.4, "r": 0.66, "time": now}],
      "zones": [{"type": "Demand OB", "top": 4119, "bot": 4116}], "dr": {"ok": True, "lo": 4100, "hi": 4140, "dir": 1}, "lastSignal": now - 6e5, "ver": "1.40", "err": "", "t": now,
      "guards": {"market": "", "account": "", "news": "next: USD CPI m/m 15:30", "newsBlock": False, "newsOn": True, "regime": "TREND", "er": 0.31, "atrPct": 62, "regimeMode": 0,
                 "spreadAtr": 0.06, "spreadAtrMax": 0.15, "dd": 6.2, "peak": 1080, "ddReduceAt": 5, "ddStopAt": 10, "ddStop": False, "riskEff": 0.5, "week": -22.5, "weekPct": -2.2,
                 "weekMax": 6, "weekStop": False, "kill": False, "killAvg": 0.18, "killN": 12, "killNeed": 20, "killAt": -0.25}}
import math
bars = []; t0 = int(now - 150 * 3e5); px_ = 4100.0
for i in range(150):
    o = px_; c = o + math.sin(i / 9) * 3 + (i % 7 - 3) * 0.6; bars += [t0 + i * 3e5, o, max(o, c) + 1.2, min(o, c) - 1.1, c]; px_ = c
CH = {"k": "x", "t": now, "tf": "M5", "symbol": "XAUUSD", "digits": 2, "bars": bars,
      "zones": [{"kind": "OB", "dir": 1, "top": 4110, "bot": 4106, "t0": t0 + 60 * 3e5}, {"kind": "FVG", "dir": -1, "top": 4125, "bot": 4122, "t0": t0 + 120 * 3e5}],
      "events": [{"type": "BOS", "dir": 1, "level": 4115, "t0": t0 + 80 * 3e5, "t1": t0 + 100 * 3e5}, {"type": "CHoCH", "dir": -1, "level": 4108, "t0": t0 + 110 * 3e5, "t1": t0 + 130 * 3e5}],
      "sweeps": [{"dir": 1, "level": 4098, "t": t0 + 90 * 3e5}], "dr": {"ok": True, "lo": 4095, "hi": 4130, "dir": 1, "t0": t0 + 70 * 3e5},
      "plan": {"live": True, "dir": 1, "entry": 4112, "sl": 4104, "tp": 4128}}
import random
random.seed(4)
SIG = {}
for i in range(40):
    f = {k: random.random() < 0.5 for k in ["htf", "ms", "pd", "ote", "poi", "conf", "liq", "kz"]}
    win = random.random() < (0.55 if f["liq"] else 0.3)
    SIG[f"qv/51234567/signals/X_{i}"] = {"side": "BUY", "entry": 4100, "sl": 4095, "tp": 4110, "rr": 2, "score": 75, "kz": "London", "auto": False, "blk": "news USD CPI" if i % 9 == 0 else "",
        "regime": "TREND" if i % 2 else "RANGE", "feat": f, "result": "TP" if win else "SL", "r": 1.95 if win else -1.04, "bars": 12, "t": now - (i + 2) * 36e5}
store_ = dict(SIG); store_.update({"qv/51234567": st, "qvkeys/51234567": {"key": "abc"}, "qvctl/51234567": {"auto": False, "paused": False, "risk": 1},
          "qv/51234567/signals/s1": {"side": "BUY", "entry": 4123.5, "sl": 4118.2, "tp": 4134.1, "rr": 2, "score": 80, "kz": "London", "auto": False, "t": now - 6e5},
          "qv/51234567/chart/now": CH,
          "qv/51234567/trades/d1": {"position": "9", "side": "SELL", "profit": 25.5, "r": 1.0, "reason": "TP hit", "partial": True, "t": now - 3e6},
          "qv/51234567/trades/d2": {"position": "9", "side": "SELL", "profit": 30.1, "r": 1.1, "reason": "TP hit", "partial": False, "t": now - 2e6},
          "qv/51234567/trades/d3": {"position": "8", "side": "BUY", "profit": -20, "r": -1, "reason": "SL hit", "partial": False, "t": now - 9e6}})
with sync_playwright() as pw:
    p = open_page(pw, "qv/index.html", store_, email=ADMIN, w=400, h=860, mobile=True); p.wait_for_timeout(800)
    print(p.inner_text("main")[:260].replace("\n", " | ")); shot(p, "qv-home")
    hm_ = p.inner_text("main"); assert "ULINZI WA PRO" in hm_.upper() and "Inayofuata: USD CPI" in hm_ and "Imepunguzwa" in hm_, hm_.replace("\n"," | ")[:1500]
    p.click("nav.tabs >> text=Chati"); p.wait_for_timeout(400)
    assert p.locator("#cv").count() == 1 and "Uliza Claude" in p.inner_text("main")
    lit = p.evaluate("(()=>{const c=document.querySelector('#cv').getContext('2d').getImageData(0,0,300,300).data;let n=0;for(let i=3;i<c.length;i+=4)if(c[i])n++;return n})()")
    print("chart pixels:", lit); assert lit > 2000
    p.click("text=Nifanye nini sasa?"); assert p.input_value("#ask-q") == "Nifanye nini sasa?"
    p.evaluate("document.querySelector('#ask-go').addEventListener('click',e=>e.preventDefault())"); p.click("#ask-go")
    href = p.get_attribute("#ask-go", "href"); print("claude url len:", len(href)); assert href.startswith("https://claude.ai/new?q=") and len(href) < 7000
    from urllib.parse import unquote; txt = unquote(href.split("q=")[1]); assert "SWALI: Nifanye nini sasa?" in txt and "BOS bullish" in txt and "Zone: OB" in txt
    p.mouse.move(200, 300); p.mouse.down(); p.mouse.move(260, 300); p.mouse.up(); p.click("[aria-label=Kuza]"); shot(p, "qv-chart")
    p.click("nav.tabs >> text=Trade"); p.wait_for_timeout(200); print(p.inner_text("main")[:200].replace("\n", " | ")); shot(p, "qv-trades")
    p.click("nav.tabs >> text=Signal"); p.wait_for_timeout(300); sg = p.inner_text("main"); assert "Entry" in sg and "TAKWIMU ZA STRATEGY" in sg.upper() and "KIGEZO KIPI" in sg.upper() and "Liquidity sweep" in sg
    print(sg[:420].replace("\n", " | ")); shot(p, "qv-stats")
    p.click("nav.tabs >> text=Udhibiti"); p.wait_for_timeout(200); p.click("[aria-label=Auto-trading]"); p.wait_for_timeout(300)
    print("ctl:", store(p)["qvctl/51234567"]); assert store(p)["qvctl/51234567"]["auto"] is True; shot(p, "qv-control")
    p.click("text=Reset ulinzi"); p.click("text=Ndiyo, reset"); p.wait_for_timeout(300); assert store(p)["qvctl/51234567"].get("reset")
    p.click("text=Funga trade zote sasa"); p.click("text=Ndiyo, funga zote"); p.wait_for_timeout(300); assert store(p)["qvctl/51234567"].get("closeAll")
    p.click("[aria-label=Akaunti]"); p.wait_for_timeout(200); p.click("text=＋ Ongeza"); p.fill("#ac-login", "60000001"); p.click("text=Tengeneza key"); p.wait_for_timeout(400)
    print("new key:", store(p).get("qvkeys/60000001")); shot(p, "qv-acct")
    print("ERRS", p.errs); assert not p.errs; p.browser_.close()
    # --- v1.50: portfolio (two symbols) + Maabara + VPS guide
    import copy, os
    s2 = dict(store_); g = dict(st["guards"], openRisk=1.2, maxPortRisk=3, posAll=1, maxPosAll=4, weights="20,15,10,10,20,5,15,5")
    x1 = dict(st, guards=g); x2 = dict(st, symbol="EURUSD", digits=5, live=False, positions=[], guards=dict(g, kill=True))
    s2["qv/51234567/sym/XAUUSD"] = x1; s2["qv/51234567/sym/EURUSD"] = x2; s2["qv/51234567/chart/XAUUSD"] = CH
    p = open_page(pw, "qv/index.html", s2, email=ADMIN, w=400, h=860, mobile=True); p.wait_for_timeout(800)
    t = p.inner_text("main"); assert "PORTFOLIO" in t.upper() and "EURUSD" in t and "kill switch" in t, t[:500]; shot(p, "qv-portfolio")
    p.select_option("header select[aria-label=Soko]", "EURUSD"); p.wait_for_timeout(200); assert "Inasubiri" in p.inner_text("main") or "Hakuna setup" in p.inner_text("main")
    p.select_option("header select[aria-label=Soko]", "XAUUSD"); p.click("nav.tabs >> text=Chati"); p.wait_for_timeout(300); assert p.locator("#cv").count() == 1
    p.click("nav.tabs >> text=Signal"); p.click("text=🧪 Maabara"); p.wait_for_timeout(200)
    p.set_input_files("input[type=file]", os.environ.get("QV_JOURNAL") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "qv_journal_sample.csv")); p.wait_for_timeout(1500)
    t = p.inner_text("main"); print(t[:900].replace("\n", " | "))
    assert "Uamuzi" in t or "UAMUZI" in t.upper(); assert "Walk-forward" in t or "WALK-FORWARD" in t.upper(); assert "InpW_LIQ" in t
    shot(p, "qv-lab"); p.click("text=Risk 2%"); p.wait_for_timeout(600); p.click("text=Jumuisha setup dhaifu"); p.wait_for_timeout(600)
    p.click("text=📡 Tumia signal za live badala yake"); p.wait_for_timeout(300); assert "SIGNAL ZA LIVE" in p.inner_text("main").upper()
    p.click("[aria-label=Akaunti]"); p.wait_for_timeout(200); assert "VPS" in p.inner_text("main")
    print("ERRS", p.errs); assert not p.errs; p.browser_.close()
    p = open_page(pw, "qv/index.html", {}, email=None, w=400, h=860, mobile=True); p.wait_for_timeout(500); assert "Ingia" in p.inner_text("body"); shot(p, "qv-login")
    print("ERRS", p.errs)
