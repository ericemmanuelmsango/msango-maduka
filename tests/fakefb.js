// Minimal in-memory stand-in for the Firebase compat SDK, for local testing only.
(function () {
  const SCEN = JSON.parse(localStorage.getItem("SCEN") || "{}");
  const store = SCEN.store || {};           // path -> data
  const log = (window.__fblog = []);
  const subs = [];
  function notify() { subs.forEach((f) => f()); }
  function snapDoc(path) { const d = store[path]; return { id: path.split("/").pop(), exists: !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined), metadata: { fromCache: false, hasPendingWrites: false } }; }
  function denied(path, write) {
    const em = SCEN.user && SCEN.user.email;
    if ((SCEN.rules || "open") === "open") return false;
    const admin = em === SCEN.admin, seg = path.split("/");
    if (seg[0] === "brands") return write && !admin;
    if (seg[0] === "settings") return seg[1] === "public" && !write ? !em : !admin;
    if (seg[0] === "clients") return !admin;
    if (seg[0] === "errors") return write ? !em : !admin;
    if (seg[0] === "shops") {
      if (admin) return false;
      const shop = store["shops/" + seg[1]];
      if (seg.length === 2) return write || !(shop && (shop.members || []).includes(em));
      return !(shop && (shop.members || []).includes(em) && shop.active && shop.paidUntil > Date.now());
    }
    return true;
  }
  const err = () => Object.assign(new Error("denied"), { code: "permission-denied" });
  function docRef(path) {
    return {
      id: path.split("/").pop(), path,
      get: async () => { log.push("get " + path); if (denied(path)) throw err(); return snapDoc(path); },
      set: async (data, opt) => { log.push("set " + path); if (denied(path, true)) throw err(); store[path] = opt && opt.merge ? { ...(store[path] || {}), ...data } : data; notify(); },
      update: async (data) => { log.push("update " + path); if (denied(path, true)) throw err(); const cur = { ...(store[path] || {}) }; Object.entries(data).forEach(([k, v]) => { const ks = k.split("."); let o = cur; ks.slice(0, -1).forEach((x) => { o[x] = o[x] && typeof o[x] === "object" ? { ...o[x] } : {}; o = o[x]; }); const key = ks[ks.length - 1]; o[key] = v && v.__inc != null ? (Number(o[key]) || 0) + v.__inc : v && v.__union ? (o[key] || []).concat(v.__union.filter((y) => !(o[key] || []).some((z) => JSON.stringify(z) === JSON.stringify(y)))) : v; }); store[path] = cur; notify(); },
      delete: async () => { delete store[path]; notify(); },
      onSnapshot: (opt, next, error) => { if (typeof opt === "function") { error = next; next = opt; } const f = () => { if (denied(path)) return error && error(err()); next(snapDoc(path)); }; setTimeout(f, 0); subs.push(f); return () => {}; },
      collection: (c) => colRef(path + "/" + c),
    };
  }
  function colRef(path, filters) {
    filters = filters || [];
    const list = () => Object.keys(store).filter((k) => k.startsWith(path + "/") && k.split("/").length === path.split("/").length + 1)
      .filter((k) => filters.every(([f, op, v]) => { const x = store[k][f]; return op === "array-contains" ? (x || []).includes(v) : op === ">=" ? x != null && x >= v : op === "<=" ? x != null && x <= v : op === ">" ? x != null && x > v : op === "<" ? x != null && x < v : x === v; }));
    const qs = () => { const docs = list().map(snapDoc); docs.forEach((d) => (d.ref = docRef(path + "/" + d.id))); return { docs, empty: !docs.length, size: docs.length, forEach: (cb) => docs.forEach(cb), metadata: { fromCache: false, hasPendingWrites: false } }; };
    return {
      path, doc: (id) => docRef(path + "/" + (id || Math.random().toString(36).slice(2))),
      add: async (d) => { const r = docRef(path + "/" + Math.random().toString(36).slice(2)); await r.set(d); return r; },
      where: (f, op, v) => colRef(path, filters.concat([[f, op, v]])), limit: function () { return this; }, orderBy: function () { return this; },
      get: async () => { log.push("query " + path + JSON.stringify(filters)); if (path === "shops" && SCEN.rules !== "open" && (!SCEN.user || SCEN.user.email !== SCEN.admin) && !filters.length) throw err();
        if (denied(path + "/x") && !(path === "shops" && filters.length)) throw err(); return qs(); },
      onSnapshot: (opt, next, error) => { if (typeof opt === "function") { error = next; next = opt; } const f = () => { if (denied(path + "/x")) return error && error(err()); next(qs()); }; setTimeout(f, 0); subs.push(f); return () => {}; },
    };
  }
  const fs = { enablePersistence: async () => {}, collection: (c) => colRef(c), doc: (p) => docRef(p), batch: () => { const ops = []; return { set: (r, d, o) => ops.push(() => r.set(d, o)), delete: (r) => ops.push(() => r.delete()), commit: async () => { for (const o of ops) await o(); } }; },
    runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, d, o) => r.set(d, o), delete: (r) => r.delete() }) };
  function mkAuth(main) {
    const a = { currentUser: main ? SCEN.user || null : null, _cbs: [],
      onAuthStateChanged(cb) { a._cbs.push(cb); setTimeout(() => cb(a.currentUser), 0); },
      signInAnonymously: async () => { a.currentUser = { uid: "anon", isAnonymous: true, delete: async () => {} }; if (main) a._cbs.forEach((c) => c(a.currentUser)); },
      signInWithEmailAndPassword: async (e) => { a.currentUser = { email: e, isAnonymous: false }; },
      createUserWithEmailAndPassword: async (e) => { log.push("createUser " + e); a.currentUser = { email: e, isAnonymous: false }; },
      sendPasswordResetEmail: async () => {}, signOut: async () => { a.currentUser = null; } };
    return a;
  }
  const mainAuth = mkAuth(true);
  const apps = [];
  window.firebase = {
    apps,
    initializeApp: (cfg, name) => { const app = { name: name || "[DEFAULT]", auth: () => app._auth || (app._auth = name ? mkAuth(false) : mainAuth), firestore: () => fs }; apps.push(app); return app; },
    firestore: Object.assign(() => fs, { FieldValue: { arrayUnion: (...v) => ({ __union: v }), delete: () => undefined, increment: (n) => ({ __inc: n }) } }),
    auth: () => mainAuth,
  };
  window.__store = store;
})();
