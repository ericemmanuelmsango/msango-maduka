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
store_ = {"qv/51234567": st, "qvkeys/51234567": {"key": "abc"}, "qvctl/51234567": {"auto": False, "paused": False, "risk": 1},
          "qv/51234567/signals/s1": {"side": "BUY", "entry": 4123.5, "sl": 4118.2, "tp": 4134.1, "rr": 2, "score": 80, "kz": "London", "auto": False, "t": now - 6e5},
          "qv/51234567/trades/d1": {"position": "9", "side": "SELL", "profit": 25.5, "r": 1.0, "reason": "TP hit", "partial": True, "t": now - 3e6},
          "qv/51234567/trades/d2": {"position": "9", "side": "SELL", "profit": 30.1, "r": 1.1, "reason": "TP hit", "partial": False, "t": now - 2e6},
          "qv/51234567/trades/d3": {"position": "8", "side": "BUY", "profit": -20, "r": -1, "reason": "SL hit", "partial": False, "t": now - 9e6}}
with sync_playwright() as pw:
    p = open_page(pw, "qv/index.html", store_, email=ADMIN, w=400, h=860, mobile=True); p.wait_for_timeout(800)
    print(p.inner_text("main")[:260].replace("\n", " | ")); shot(p, "qv-home")
    p.click("nav.tabs >> text=Trade"); p.wait_for_timeout(200); print(p.inner_text("main")[:200].replace("\n", " | ")); shot(p, "qv-trades")
    p.click("nav.tabs >> text=Signal"); p.wait_for_timeout(200); assert "Entry" in p.inner_text("main")
    p.click("nav.tabs >> text=Udhibiti"); p.wait_for_timeout(200); p.click("[aria-label=Auto-trading]"); p.wait_for_timeout(300)
    print("ctl:", store(p)["qvctl/51234567"]); assert store(p)["qvctl/51234567"]["auto"] is True; shot(p, "qv-control")
    p.click("text=Funga trade zote sasa"); p.click("text=Ndiyo, funga zote"); p.wait_for_timeout(300); assert store(p)["qvctl/51234567"].get("closeAll")
    p.click("nav.tabs >> text=Akaunti"); p.wait_for_timeout(200); p.click("text=＋ Ongeza"); p.fill("#ac-login", "60000001"); p.click("text=Tengeneza key"); p.wait_for_timeout(400)
    print("new key:", store(p).get("qvkeys/60000001")); shot(p, "qv-acct")
    print("ERRS", p.errs); p.browser_.close()
    p = open_page(pw, "qv/index.html", {}, email=None, w=400, h=860, mobile=True); p.wait_for_timeout(500); assert "Ingia" in p.inner_text("body"); shot(p, "qv-login")
    print("ERRS", p.errs)
