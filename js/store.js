// Camada de dados: Firebase (produção) ou modo demonstração (navegador).
import { FIREBASE_CONFIG, APP_CHECK_SITE_KEY, LOJA_PADRAO, PRODUTOS_INICIAIS } from "./config.js";

const novoNumero = () => Date.now().toString(36).slice(-5).toUpperCase();
const comPadrao = c => ({ ...LOJA_PADRAO, ...(c || {}), pix: { ...LOJA_PADRAO.pix, ...((c && c.pix) || {}) } });

export async function iniciarStore() {
  if (FIREBASE_CONFIG) {
    try { return await firebaseStore(FIREBASE_CONFIG); }
    catch (e) { console.error("Firebase indisponível, usando modo demonstração", e); }
  }
  return demoStore();
}

/* ---------------- Firebase ---------------- */
async function firebaseStore(cfg) {
  const V = "10.12.2", base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, F, A] = await Promise.all([
    import(base + "firebase-app.js"), import(base + "firebase-firestore.js"), import(base + "firebase-auth.js")
  ]);
  const app = initializeApp(cfg);
  if (APP_CHECK_SITE_KEY) {
    const C = await import(base + "firebase-app-check.js");
    C.initializeAppCheck(app, { provider: new C.ReCaptchaV3Provider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }
  const db = F.getFirestore(app), auth = A.getAuth(app);
  const cfgRef = F.doc(db, "loja", "config"), prodCol = F.collection(db, "produtos"), pedCol = F.collection(db, "pedidos");
  const ms = t => (t && t.toMillis ? t.toMillis() : (t || Date.now()));

  return {
    modo: "firebase",
    onConfig(cb) { return F.onSnapshot(cfgRef, s => cb(comPadrao(s.data())), () => cb(comPadrao())); },
    onProdutos(cb) {
      return F.onSnapshot(F.query(prodCol, F.orderBy("ordem")), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb([]));
    },
    async criarPedido(p) {
      const numero = novoNumero();
      const ref = await F.addDoc(pedCol, { ...p, numero, status: "novo", pago: false, criadoEm: F.serverTimestamp() });
      return { id: ref.id, numero };
    },
    // ---- painel ----
    onAuth(cb) {
      return A.onAuthStateChanged(auth, async u => {
        if (!u) return cb(null, false);
        let admin = false;
        try { admin = (await F.getDoc(F.doc(db, "admins", u.uid))).exists(); } catch (e) {}
        cb(u, admin);
      });
    },
    entrar: (email, senha) => A.signInWithEmailAndPassword(auth, email, senha),
    sair: () => A.signOut(auth),
    onPedidos(cb) {
      return F.onSnapshot(F.query(pedCol, F.orderBy("criadoEm", "desc"), F.limit(300)),
        s => cb(s.docs.map(d => ({ id: d.id, ...d.data(), criadoEm: ms(d.data().criadoEm) }))));
    },
    atualizarPedido: (id, patch) => F.updateDoc(F.doc(db, "pedidos", id), patch),
    salvarConfig: patch => F.setDoc(cfgRef, patch, { merge: true }),
    async salvarProduto(p) {
      const { id, ...dados } = p;
      if (id) await F.setDoc(F.doc(db, "produtos", id), dados, { merge: true });
      else await F.addDoc(prodCol, dados);
    },
    excluirProduto: id => F.deleteDoc(F.doc(db, "produtos", id)),
    async importarCardapio() {
      const b = F.writeBatch(db);
      PRODUTOS_INICIAIS.forEach(p => b.set(F.doc(prodCol), p));
      b.set(cfgRef, LOJA_PADRAO, { merge: true });
      await b.commit();
    }
  };
}

/* ---------------- Modo demonstração ---------------- */
function demoStore() {
  const mem = {};
  const get = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : mem[k]; } catch (e) { return mem[k]; } };
  const put = (k, v) => { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} avisar(k); };
  const K = { cfg: "le_demo_config", prod: "le_demo_produtos", ped: "le_demo_pedidos" };
  const ouvintes = { [K.cfg]: new Set(), [K.prod]: new Set(), [K.ped]: new Set() };
  let canal = null; try { canal = new BroadcastChannel("le-demo"); canal.onmessage = e => disparar(e.data); } catch (e) {}
  window.addEventListener("storage", e => { if (ouvintes[e.key]) disparar(e.key); });
  function disparar(k) { const v = ler(k); ouvintes[k]?.forEach(cb => cb(v)); }
  function avisar(k) { disparar(k); try { canal?.postMessage(k); } catch (e) {} }
  function ler(k) {
    if (k === K.cfg) return comPadrao(get(K.cfg));
    if (k === K.prod) return (get(K.prod) || []).slice().sort((a, b) => a.ordem - b.ordem);
    return (get(K.ped) || []).slice().sort((a, b) => b.criadoEm - a.criadoEm);
  }
  const ouvir = (k, cb) => { ouvintes[k].add(cb); queueMicrotask(() => cb(ler(k))); return () => ouvintes[k].delete(cb); };
  if (!get(K.prod)) put(K.prod, PRODUTOS_INICIAIS.map((p, i) => ({ id: "p" + i, ...p })));
  let usuario = null; const authCbs = new Set();
  try { if (sessionStorage.getItem("le_demo_login")) usuario = { email: "demo" }; } catch (e) {}

  return {
    modo: "demo",
    onConfig: cb => ouvir(K.cfg, cb),
    onProdutos: cb => ouvir(K.prod, cb),
    async criarPedido(p) {
      const numero = novoNumero(), id = "d" + Date.now();
      put(K.ped, [...(get(K.ped) || []), { ...p, id, numero, status: "novo", pago: false, criadoEm: Date.now() }]);
      return { id, numero };
    },
    onAuth(cb) { authCbs.add(cb); queueMicrotask(() => cb(usuario, !!usuario)); return () => authCbs.delete(cb); },
    async entrar(email, senha) {
      if (senha !== "demo") throw new Error("Senha incorreta. No modo demonstração a senha é: demo");
      usuario = { email: email || "demo" }; try { sessionStorage.setItem("le_demo_login", "1"); } catch (e) {}
      authCbs.forEach(cb => cb(usuario, true));
    },
    async sair() { usuario = null; try { sessionStorage.removeItem("le_demo_login"); } catch (e) {} authCbs.forEach(cb => cb(null, false)); },
    onPedidos: cb => ouvir(K.ped, cb),
    async atualizarPedido(id, patch) { put(K.ped, (get(K.ped) || []).map(x => x.id === id ? { ...x, ...patch } : x)); },
    async salvarConfig(patch) { const c = get(K.cfg) || {}; put(K.cfg, { ...c, ...patch, pix: { ...(c.pix || {}), ...(patch.pix || {}) } }); },
    async salvarProduto(p) {
      const lista = get(K.prod) || [];
      if (p.id && lista.some(x => x.id === p.id)) put(K.prod, lista.map(x => x.id === p.id ? { ...x, ...p } : x));
      else put(K.prod, [...lista, { ...p, id: "p" + Date.now() }]);
    },
    async excluirProduto(id) { put(K.prod, (get(K.prod) || []).filter(x => x.id !== id)); },
    async importarCardapio() { put(K.prod, PRODUTOS_INICIAIS.map((p, i) => ({ id: "p" + i, ...p }))); },
    async limparDemo() { [K.cfg, K.prod, K.ped].forEach(k => { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }); location.reload(); }
  };
}
