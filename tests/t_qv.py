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
      "zones": [{"type": "Demand OB", "top": 4119, "bot": 4116}], "dr": {"ok": True, "lo": 4100, "hi": 4140, "dir": 1}, "lastSignal": now - 6e5, "ver": "1.20", "err": "", "t": now}
import math
bars = []; t0 = int(now - 150 * 3e5); px_ = 4100.0
for i in range(150):
    o = px_; c = o + math.sin(i / 9) * 3 + (i % 7 - 3) * 0.6; bars += [t0 + i * 3e5, o, max(o, c) + 1.2, min(o, c) - 1.1, c]; px_ = c
CH = {"k": "x", "t": now, "tf": "M5", "symbol": "XAUUSD", "digits": 2, "bars": bars,
      "zones": [{"kind": "OB", "dir": 1, "top": 4110, "bot": 4106, "t0": t0 + 60 * 3e5}, {"kind": "FVG", "dir": -1, "top": 4125, "bot": 4122, "t0": t0 + 120 * 3e5}],
      "events": [{"type": "BOS", "dir": 1, "level": 4115, "t0": t0 + 80 * 3e5, "t1": t0 + 100 * 3e5}, {"type": "CHoCH", "dir": -1, "level": 4108, "t0": t0 + 110 * 3e5, "t1": t0 + 130 * 3e5}],
      "sweeps": [{"dir": 1, "level": 4098, "t": t0 + 90 * 3e5}], "dr": {"ok": True, "lo": 4095, "hi": 4130, "dir": 1, "t0": t0 + 70 * 3e5},
      "plan": {"live": True, "dir": 1, "entry": 4112, "sl": 4104, "tp": 4128}}
store_ = {"qv/51234567": st, "qvkeys/51234567": {"key": "abc"}, "qvctl/51234567": {"auto": False, "paused": False, "risk": 1},
          "qv/51234567/signals/s1": {"side": "BUY", "entry": 4123.5, "sl": 4118.2, "tp": 4134.1, "rr": 2, "score": 80, "kz": "London", "auto": False, "t": now - 6e5},
          "qv/51234567/chart/now": CH,
          "qv/51234567/trades/d1": {"position": "9", "side": "SELL", "profit": 25.5, "r": 1.0, "reason": "TP hit", "partial": True, "t": now - 3e6},
          "qv/51234567/trades/d2": {"position": "9", "side": "SELL", "profit": 30.1, "r": 1.1, "reason": "TP hit", "partial": False, "t": now - 2e6},
          "qv/51234567/trades/d3": {"position": "8", "side": "BUY", "profit": -20, "r": -1, "reason": "SL hit", "partial": False, "t": now - 9e6}}
with sync_playwright() as pw:
    p = open_page(pw, "qv/index.html", store_, email=ADMIN, w=400, h=860, mobile=True); p.wait_for_timeout(800)
    print(p.inner_text("main")[:260].replace("\n", " | ")); shot(p, "qv-home")
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
    p.click("nav.tabs >> text=Signal"); p.wait_for_timeout(200); assert "Entry" in p.inner_text("main")
    p.click("nav.tabs >> text=Udhibiti"); p.wait_for_timeout(200); p.click("[aria-label=Auto-trading]"); p.wait_for_timeout(300)
    print("ctl:", store(p)["qvctl/51234567"]); assert store(p)["qvctl/51234567"]["auto"] is True; shot(p, "qv-control")
    p.click("text=Funga trade zote sasa"); p.click("text=Ndiyo, funga zote"); p.wait_for_timeout(300); assert store(p)["qvctl/51234567"].get("closeAll")
    p.click("[aria-label=Akaunti]"); p.wait_for_timeout(200); p.click("text=＋ Ongeza"); p.fill("#ac-login", "60000001"); p.click("text=Tengeneza key"); p.wait_for_timeout(400)
    print("new key:", store(p).get("qvkeys/60000001")); shot(p, "qv-acct")
    print("ERRS", p.errs); p.browser_.close()
    p = open_page(pw, "qv/index.html", {}, email=None, w=400, h=860, mobile=True); p.wait_for_timeout(500); assert "Ingia" in p.inner_text("body"); shot(p, "qv-login")
    print("ERRS", p.errs)
