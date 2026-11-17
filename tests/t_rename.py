"""Kubadilisha jina kwenye Products: jina jipya linafika kwenye stock (Dukani + Godown) na mizigo iliyopokelewa."""
import sys; sys.path.insert(0,'.')
exec(open('t_hariristock.py').read().split('with sync_playwright')[0])
DATA["deliveries"]=[{"id":"D1","store":"godown","supplier":"X","date":D,"rows":[{"name":"CHAIN KIT TVS","qty":50,"price":10000,"total":500000,"itemId":"g1","movementId":"m1"}],"total":500000}]
with sync_playwright() as pw:
    p = open_page(pw, "index.html?duka=sp1", store({})); p.wait_for_timeout(1200)
    p.evaluate("SESSION_UNLOCKED=true; setPage('products')"); p.wait_for_timeout(300)
    p.evaluate("UI.editingProductId=\x27p1\x27; document.body.insertAdjacentHTML(\x27beforeend\x27,\x27<input id=edit-name-p1 value=\"CHAIN KIT TVS HLX\"><input id=edit-price-p1 value=15000><input id=edit-buy-p1 value=\"\">\x27); saveProductPrice(\x27p1\x27)"); p.wait_for_timeout(700)
    r = p.evaluate("({p: productByName('CHAIN KIT TVS HLX')&&1, s: STATE.stockItems.filter(i=>i.name==='CHAIN KIT TVS HLX').length, d: STATE.deliveries[0].rows[0].name})")
    print(r, p.errs); assert r == {"p":1,"s":2,"d":"CHAIN KIT TVS HLX"} and not p.errs
print("RENAME OK")
