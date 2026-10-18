// Painel da doceria: aberto/fechado, pedidos em tempo real, cardápio e configurações.
import { iniciarStore } from "./store.js";
import { gerarPix } from "./pix.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = n => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const soDigitos = s => String(s || "").replace(/\D/g, "");
const fotoOk = f => /^(img\/|data:image\/|https:\/\/)/.test(String(f || ""));
const TITULO = document.title;

let store, cfg = null, produtos = [], pedidos = [], filtro = "ativos", vistos = null, desligar = [];

let toastT;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600);
}
async function tentar(fn, ok) {
  try { await fn(); if (ok) toast(ok); return true; }
  catch (e) { console.error(e); toast("Não foi possível salvar. Verifique a internet e tente de novo."); return false; }
}

/* ---------------- Login ---------------- */
function tela(v) { ["login", "noadmin", "app"].forEach(x => { $("v-" + x).hidden = x !== v; }); document.querySelector(".skip").hidden = v !== "app"; }
function aoEntrar(u, admin) {
  desligar.forEach(f => f && f()); desligar = [];
  if (!u) { tela("login"); return; }
  if (!admin) { tela("noadmin"); return; }
  tela("app");
  vistos = null;
  desligar = [
    store.onConfig(c => { cfg = c; renderLoja(); renderCardapio(); renderCats(); preencherConfig(); }),
    store.onProdutos(l => { produtos = l; renderCardapio(); if (cfg) renderCats(); }),
    store.onPedidos(l => { novosPedidos(l); pedidos = l; renderPedidos(); })
  ];
}
$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  $("login-err").textContent = "";
  const email = $("l-email").value.trim(), senha = $("l-senha").value;
  if (store.modo !== "demo" && (!email || !senha)) { $("login-err").textContent = "Preencha e-mail e senha."; return; }
  try { await store.entrar(email, senha); }
  catch (err) {
    const c = err.code || "";
    $("login-err").textContent = /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? "E-mail ou senha incorretos."
      : /too-many-requests/.test(c) ? "Muitas tentativas. Espere alguns minutos e tente de novo."
      : err.message || "Não foi possível entrar.";
    $("l-senha").focus();
  }
});
document.addEventListener("click", e => { if (e.target.closest("[data-sair]")) store.sair(); });

/* ---------------- Aberto / fechado ---------------- */
function renderLoja() {
  const ab = cfg.aberto !== false, b = $("loja-btn");
  b.className = "loja-btn " + (ab ? "on" : "off");
  $("loja-txt").textContent = ab ? "Loja ABERTA" : "Loja FECHADA";
  b.setAttribute("aria-pressed", String(ab));
}
$("loja-btn").onclick = () => {
  if (cfg.aberto === false) return tentar(() => store.salvarConfig({ aberto: true }), "Loja aberta: o site aceita pedidos");
  $("fechar-confirm").hidden = false; $("fechar-sim").focus();
};
$("fechar-nao").onclick = () => { $("fechar-confirm").hidden = true; $("loja-btn").focus(); };
$("fechar-sim").onclick = async () => {
  $("fechar-confirm").hidden = true;
  await tentar(() => store.salvarConfig({ aberto: false }), "Loja fechada: pedidos vão para o WhatsApp");
  $("loja-btn").focus();
};

/* ---------------- Abas ---------------- */
const abas = ["pedidos", "cardapio", "config"];
function abrirAba(n, foco) {
  abas.forEach(a => {
    const t = $("t-" + a), on = a === n;
    t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; $("p-" + a).hidden = !on;
  });
  if (foco) $("t-" + n).focus();
}
abas.forEach((a, i) => {
  $("t-" + a).onclick = () => abrirAba(a);
  $("t-" + a).onkeydown = e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); abrirAba(abas[(i + d + abas.length) % abas.length], true); }
  };
});

/* ---------------- Pedidos ---------------- */
const STATUS = { novo: "Novo", preparo: "Em preparo", saiu: "Saiu para entrega", pronto: "Pronto para retirada", concluido: "Concluído", cancelado: "Cancelado" };
const proximo = p => ({ novo: "preparo", preparo: p.tipo === "entrega" ? "saiu" : "pronto", saiu: "concluido", pronto: "concluido" }[p.status]);
const GRUPO = { ativos: ["novo", "preparo", "saiu", "pronto"], concluidos: ["concluido"], cancelados: ["cancelado"] };
const PAG = { pix: "Pix", cartao_link: "Cartão (link Mercado Pago)", whatsapp: "Combinar no WhatsApp" };

let audio = null;
document.addEventListener("pointerdown", () => {
  if (audio) return;
  try { audio = new (window.AudioContext || window.webkitAudioContext)(); $("som-dica").hidden = true; } catch (e) {}
}, { once: false });
function bip() {
  if (!audio) return;
  try {
    [0, 0.22].forEach(t => {
      const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + t;
      o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.start(t0); o.stop(t0 + 0.2);
    });
  } catch (e) {}
}
let frescos = new Set();
function novosPedidos(lista) {
  if (vistos === null) { vistos = new Set(lista.map(p => p.id)); return; }
  const novos = lista.filter(p => !vistos.has(p.id));
  novos.forEach(p => { vistos.add(p.id); frescos.add(p.id); });
  if (novos.length) { bip(); toast(novos.length === 1 ? `Novo pedido #${novos[0].numero}` : `${novos.length} pedidos novos`); }
}
function msgCliente(p) {
  const nome = (p.cliente?.nome || "").split(" ")[0];
  const txt = {
    novo: `recebemos o seu pedido #${p.numero} e já vamos preparar.`,
    preparo: `seu pedido #${p.numero} está sendo preparado.`,
    saiu: `seu pedido #${p.numero} saiu para entrega!`,
    pronto: `seu pedido #${p.numero} está pronto para retirada na Rua Afonso Franco, 250.`,
    concluido: `obrigada pelo pedido #${p.numero}!`,
    cancelado: `sobre o seu pedido #${p.numero}:`
  }[p.status] || `sobre o seu pedido #${p.numero}:`;
  return `Olá, ${nome}! Aqui é da Larissa Eiras Doceria: ${txt}`;
}
// A Larissa cola o link do Mercado Pago no fim da mensagem antes de enviar.
function msgLink(p) {
  const nome = (p.cliente?.nome || "").split(" ")[0];
  return `Olá, ${nome}! Aqui é da Larissa Eiras Doceria. Segue o link de pagamento com cartão do seu pedido #${p.numero}, no valor de ${brl(p.total)}${p.taxa === null ? " (a entrega é combinada à parte)" : ""}:
`;
}
function cartaoPedido(p) {
  const tel = soDigitos(p.cliente?.telefone), e = p.endereco, prox = proximo(p);
  const quando = new Date(p.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const end = e ? `${e.rua}, ${e.numero} - ${e.bairro}` : "";
  const mapa = e ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end + ", Paracambi - RJ")}` : "";
  return `<article class="order st-${esc(p.status)}${frescos.has(p.id) ? " fresh" : ""}" data-id="${esc(p.id)}" aria-label="Pedido ${esc(p.numero)}">
    <h3><span>#${esc(p.numero)}</span><small>${esc(quando)}</small></h3>
    <div class="acts"><span class="st ${p.status === "novo" ? "novo" : ""}">${esc(STATUS[p.status] || p.status)}</span>${p.pago ? `<span class="st pago">Pago</span>` : ""}</div>
    <p><b>${esc(p.cliente?.nome)}</b> · ${esc(tel)}</p>
    <p>${p.tipo === "entrega" ? `<b>Entrega:</b> ${esc(end)}${e.complemento ? ` (${esc(e.complemento)})` : ""}${e.referencia ? `<br>Ref.: ${esc(e.referencia)}` : ""}<br><a href="${esc(mapa)}" target="_blank" rel="noopener">Abrir no Google Maps</a>` : "<b>Retirada</b> na doceria"}</p>
    <ul>${(p.itens || []).map(i => `<li>${esc(i.qtd)}× ${esc(i.nome)} <span class="muted">(${brl(i.qtd * i.preco)})</span></li>`).join("")}</ul>
    ${p.obs ? `<p class="note-box" style="background:var(--blush);border-radius:12px;padding:8px 10px"><b>Obs.:</b> ${esc(p.obs)}</p>` : ""}
    <p>Subtotal ${brl(p.subtotal)}${p.tipo === "entrega" ? ` · Entrega ${p.taxa === null ? "a combinar" : brl(p.taxa)}` : ""}<br><b>Total ${brl(p.total)}${p.taxa === null ? " + entrega" : ""}</b> · ${esc(PAG[p.pagamento] || p.pagamento)}</p>
    <div class="acts">
      <label class="switch"><input type="checkbox" data-pago${p.pago ? " checked" : ""}><span class="track"></span>Pago</label>
      ${p.pagamento === "cartao_link" && !p.pago && tel ? `<a class="btn btn-ghost btn-sm" href="https://wa.me/55${esc(tel)}?text=${encodeURIComponent(msgLink(p))}" target="_blank" rel="noopener">Enviar link de pagamento</a>` : ""}
    </div>
    <div class="acts">
      ${tel ? `<a class="btn btn-wa btn-sm" href="https://wa.me/55${esc(tel)}?text=${encodeURIComponent(msgCliente(p))}" target="_blank" rel="noopener">WhatsApp do cliente</a>` : ""}
      ${prox ? `<button class="btn btn-primary btn-sm" type="button" data-status="${prox}">${esc(STATUS[prox])}</button>` : ""}
      ${GRUPO.ativos.includes(p.status) ? `<button class="btn btn-sm btn-ghost btn-danger" type="button" data-cancelar>Cancelar</button>` : ""}
      ${p.status === "cancelado" ? `<button class="btn btn-sm" type="button" data-status="novo">Reabrir</button>` : ""}
    </div>
  </article>`;
}
function renderPedidos() {
  const novos = pedidos.filter(p => p.status === "novo").length;
  document.title = novos ? `(${novos}) ${TITULO}` : TITULO;
  $("n-novos").hidden = !novos; $("n-novos").textContent = novos;
  const lista = pedidos.filter(p => GRUPO[filtro].includes(p.status));
  $("pedidos").innerHTML = lista.length ? lista.map(cartaoPedido).join("")
    : `<p class="empty">${{ ativos: "Nenhum pedido ativo agora.", concluidos: "Nenhum pedido concluído.", cancelados: "Nenhum pedido cancelado." }[filtro]}</p>`;
}
$("filtros").onclick = e => {
  const b = e.target.closest("[data-f]"); if (!b) return;
  filtro = b.dataset.f;
  $("filtros").querySelectorAll("[data-f]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  renderPedidos();
};
$("pedidos").addEventListener("click", async e => {
  const card = e.target.closest(".order"); if (!card) return;
  const id = card.dataset.id, p = pedidos.find(x => x.id === id);
  if (frescos.delete(id)) card.classList.remove("fresh");
  const st = e.target.closest("[data-status]");
  if (st) return tentar(() => store.atualizarPedido(id, { status: st.dataset.status }), `Pedido #${p.numero}: ${STATUS[st.dataset.status]}`);
  if (e.target.closest("[data-cancelar]")) {
    return confirmar("Cancelar pedido", `Cancelar o pedido #${p.numero} de ${p.cliente?.nome}?`, "Cancelar pedido",
      () => tentar(() => store.atualizarPedido(id, { status: "cancelado" }), "Pedido cancelado"));
  }
});
$("pedidos").addEventListener("change", e => {
  if (!e.target.matches("[data-pago]")) return;
  const id = e.target.closest(".order").dataset.id;
  tentar(() => store.atualizarPedido(id, { pago: e.target.checked }), e.target.checked ? "Marcado como pago" : "Marcado como não pago");
});
/* ---------------- Modais ---------------- */
let modalAberto = null, modalAbridor = null;
function abrirModal(id) {
  modalAbridor = document.activeElement; modalAberto = $(id);
  modalAberto.inert = false; modalAberto.setAttribute("aria-hidden", "false"); modalAberto.classList.add("on"); $("scrim").classList.add("on");
  modalAberto.querySelector("input,textarea,select,button:not([data-fechar-modal])")?.focus();
}
function fecharModal() {
  if (!modalAberto) return;
  modalAberto.classList.remove("on"); modalAberto.setAttribute("aria-hidden", "true"); modalAberto.inert = true; $("scrim").classList.remove("on");
  modalAberto = null;
  if (modalAbridor && document.contains(modalAbridor)) modalAbridor.focus();
}
document.addEventListener("click", e => { if (e.target.closest("[data-fechar-modal]") || e.target === $("scrim")) fecharModal(); });
document.addEventListener("keydown", e => {
  if (!modalAberto) return;
  if (e.key === "Escape") return fecharModal();
  if (e.key !== "Tab") return;
  const f = [...modalAberto.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]),textarea,select")].filter(el => el.getClientRects().length);
  const i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});
let aoConfirmar = null;
function confirmar(titulo, texto, botao, fn) {
  $("m-conf-t").textContent = titulo; $("m-conf-d").textContent = texto; $("m-conf-sim").textContent = botao;
  aoConfirmar = fn; abrirModal("m-conf");
}
$("m-conf-sim").onclick = () => { const fn = aoConfirmar; aoConfirmar = null; fecharModal(); fn && fn(); };

/* ---------------- Cardápio ---------------- */
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat";
function categorias() {
  const cats = [...(cfg?.categorias || [])];
  produtos.forEach(p => { if (p.categoria && !cats.some(c => c.id === p.categoria)) cats.push({ id: p.categoria, nome: p.categoria }); });
  return cats;
}
function renderCardapio() {
  if (!cfg) return;
  if (!produtos.length) {
    $("cardapio").innerHTML = `<div class="empty"><p>Nenhum item no cardápio ainda.</p><button class="btn btn-primary" type="button" id="importar">Importar cardápio inicial</button></div>`;
    $("importar").onclick = () => tentar(() => store.importarCardapio(), "Cardápio importado");
    return;
  }
  $("cardapio").innerHTML = categorias().map(c => {
    const itens = produtos.filter(p => p.categoria === c.id);
    if (!itens.length) return "";
    return `<div class="cat-block"><h3>${esc(c.nome)}</h3>${itens.map(p => `<div class="prod${p.disponivel === false ? " off" : ""}" data-id="${esc(p.id)}">
      ${fotoOk(p.foto) ? `<img src="${esc(p.foto)}" alt="" width="48" height="48" loading="lazy">` : `<span class="mono" aria-hidden="true">${esc((p.nome || "L")[0])}</span>`}
      <b>${esc(p.nome)}</b>
      <span></span>
      <div class="ctrl">
        <label class="sr" for="pr-${esc(p.id)}">Preço de ${esc(p.nome)}</label><span aria-hidden="true">R$</span>
        <input class="input preco" id="pr-${esc(p.id)}" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(p.preco)}" data-preco>
        <label class="switch"><input type="checkbox" data-disp${p.disponivel === false ? "" : " checked"}><span class="track"></span>Disponível</label>
        <label class="switch"><input type="checkbox" data-dest${p.destaque ? " checked" : ""}><span class="track"></span>Destaque</label>
        <button class="btn btn-sm btn-ghost" type="button" data-editar aria-label="Editar ${esc(p.nome)}">Editar</button>
        <button class="btn btn-sm btn-danger" type="button" data-excluir aria-label="Excluir ${esc(p.nome)}">Excluir</button>
      </div></div>`).join("")}</div>`;
  }).join("");
}
$("cardapio").addEventListener("change", e => {
  const row = e.target.closest(".prod"); if (!row) return;
  const id = row.dataset.id;
  if (e.target.matches("[data-dest]")) {
    const n = produtos.filter(x => x.destaque && x.id !== id).length;
    if (e.target.checked && n >= 6) toast("O início mostra só 6 destaques disponíveis");
    tentar(() => store.salvarProduto({ id, destaque: e.target.checked }), e.target.checked ? "Em destaque no início" : "Fora dos destaques");
  }
  if (e.target.matches("[data-disp]")) tentar(() => store.salvarProduto({ id, disponivel: e.target.checked }), e.target.checked ? "Disponível" : "Marcado como esgotado");
  if (e.target.matches("[data-preco]")) {
    const v = Number(e.target.value);
    if (!(v >= 0) || e.target.value === "") { toast("Preço inválido"); return; }
    tentar(() => store.salvarProduto({ id, preco: Math.round(v * 100) / 100 }), "Preço salvo");
  }
});
$("cardapio").addEventListener("click", e => {
  const row = e.target.closest(".prod"); if (!row) return;
  const p = produtos.find(x => x.id === row.dataset.id);
  if (e.target.closest("[data-editar]")) editar(p);
  if (e.target.closest("[data-excluir]")) confirmar("Excluir item", `Excluir "${p.nome}" do cardápio? Isso não pode ser desfeito.`, "Excluir",
    () => tentar(() => store.excluirProduto(p.id), "Item excluído"));
});

let editando = null, fotoNova;
function editar(p) {
  editando = p || null; fotoNova = undefined;
  $("m-prod-t").textContent = p ? "Editar item" : "Novo item";
  $("mp-cat").innerHTML = categorias().map(c => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("");
  $("mp-nome").value = p?.nome || ""; $("mp-desc").value = p?.desc || "";
  $("mp-preco").value = p?.preco ?? ""; $("mp-ordem").value = p?.ordem ?? produtos.reduce((m, x) => Math.max(m, x.ordem || 0), 0) + 1;
  $("mp-cat").value = p?.categoria || categorias()[0]?.id || "";
  $("mp-disp").checked = p ? p.disponivel !== false : true;
  $("mp-dest").checked = !!p?.destaque;
  $("mp-foto").value = ""; $("mp-err").textContent = "";
  mostrarFoto(p?.foto || "");
  abrirModal("m-prod");
}
function mostrarFoto(f) {
  const ok = fotoOk(f);
  $("mp-prev").hidden = !ok; $("mp-sem-foto").hidden = !ok;
  if (ok) $("mp-prev").src = f; else $("mp-prev").removeAttribute("src");
}
$("novo-item").onclick = () => editar(null);
$("mp-sem-foto").onclick = () => { fotoNova = ""; mostrarFoto(""); };
$("mp-foto").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  $("mp-err").textContent = "Preparando a foto…";
  try { fotoNova = await reduzirFoto(f); mostrarFoto(fotoNova); $("mp-err").textContent = ""; }
  catch (err) { console.error(err); fotoNova = undefined; $("mp-err").textContent = "Não foi possível usar esta foto. Tente outra (JPG ou PNG)."; }
};
// Redimensiona para no máximo 400px e comprime em JPEG até ~120 KB (fica dentro do documento do Firestore).
async function reduzirFoto(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    let lado = 400;
    for (let t = 0; t < 4; t++, lado = Math.round(lado * 0.8)) {
      const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      for (let q = 0.85; q >= 0.45; q -= 0.1) { const d = c.toDataURL("image/jpeg", q); if (d.length <= 120 * 1024) return d; }
    }
    throw new Error("foto grande demais");
  } finally { URL.revokeObjectURL(url); }
}
$("m-prod").addEventListener("submit", async e => {
  e.preventDefault();
  const nome = $("mp-nome").value.trim(), preco = Number($("mp-preco").value);
  if (!nome) { $("mp-err").textContent = "Informe o nome do item."; return $("mp-nome").focus(); }
  if ($("mp-preco").value === "" || !(preco >= 0)) { $("mp-err").textContent = "Informe um preço válido."; return $("mp-preco").focus(); }
  const dados = {
    nome, desc: $("mp-desc").value.trim(), preco: Math.round(preco * 100) / 100,
    categoria: $("mp-cat").value, ordem: Number($("mp-ordem").value) || 0, disponivel: $("mp-disp").checked, destaque: $("mp-dest").checked,
    foto: fotoNova !== undefined ? fotoNova : (editando?.foto || "")
  };
  if (editando) dados.id = editando.id;
  if (await tentar(() => store.salvarProduto(dados), "Item salvo")) fecharModal();
});

/* ---------------- Categorias ---------------- */
$("ver-cats").onclick = () => {
  const c = $("cats-card"); c.hidden = !c.hidden; $("ver-cats").setAttribute("aria-expanded", String(!c.hidden));
};
function renderCats() {
  const cats = cfg.categorias || [];
  $("cats-lista").innerHTML = cats.map((c, i) => {
    const usada = produtos.some(p => p.categoria === c.id);
    return `<div class="cat-row" data-i="${i}">
      <label class="sr" for="cn-${i}">Nome da categoria ${i + 1}</label>
      <input class="input" id="cn-${i}" value="${esc(c.nome)}" maxlength="60" data-renomear>
      <button class="icon-btn" type="button" data-mover="-1" aria-label="Subir ${esc(c.nome)}"${i ? "" : " disabled"}>↑</button>
      <button class="icon-btn" type="button" data-mover="1" aria-label="Descer ${esc(c.nome)}"${i < cats.length - 1 ? "" : " disabled"}>↓</button>
      <button class="icon-btn" type="button" data-remover aria-label="Remover ${esc(c.nome)}"${usada ? ' disabled title="Tem itens nesta categoria"' : ""}>×</button>
    </div>`;
  }).join("");
}
const salvarCats = (cats, msg) => tentar(() => store.salvarConfig({ categorias: cats }), msg);
$("cats-lista").addEventListener("change", e => {
  if (!e.target.matches("[data-renomear]")) return;
  const i = +e.target.closest(".cat-row").dataset.i, nome = e.target.value.trim();
  if (!nome) { e.target.value = cfg.categorias[i].nome; return; }
  salvarCats(cfg.categorias.map((c, j) => j === i ? { ...c, nome } : c), "Categoria renomeada");
});
$("cats-lista").addEventListener("click", e => {
  const row = e.target.closest(".cat-row"); if (!row) return;
  const i = +row.dataset.i, cats = [...cfg.categorias];
  const m = e.target.closest("[data-mover]");
  if (m) { const j = i + +m.dataset.mover; [cats[i], cats[j]] = [cats[j], cats[i]]; salvarCats(cats, "Ordem salva"); }
  if (e.target.closest("[data-remover]")) confirmar("Remover categoria", `Remover a categoria "${cats[i].nome}"?`, "Remover",
    () => salvarCats(cats.filter((_, j) => j !== i), "Categoria removida"));
});
$("cat-nova").addEventListener("submit", e => {
  e.preventDefault();
  const nome = $("cat-nome").value.trim(); if (!nome) return $("cat-nome").focus();
  const cats = cfg.categorias || [];
  let id = slug(nome); while (cats.some(c => c.id === id)) id += "-2";
  salvarCats([...cats, { id, nome }], "Categoria adicionada").then(ok => { if (ok) $("cat-nome").value = ""; });
});

/* ---------------- Configurações ---------------- */
let configPreenchida = false;
function preencherConfig() {
  if (configPreenchida) return; // não sobrescreve o que a dona está digitando
  configPreenchida = true;
  $("cf-horario").value = cfg.horarioTexto || ""; $("cf-msg").value = cfg.mensagemFechado || "";
  $("cf-wa").value = cfg.whatsapp || "";
  $("cf-entrega").checked = cfg.entregaAtiva !== false; $("cf-taxa").value = typeof cfg.taxaEntrega === "number" ? cfg.taxaEntrega : "";
  $("cf-retirada").checked = cfg.retiradaAtiva !== false; $("cf-min").value = cfg.pedidoMinimo || 0;
  $("cf-pix").checked = !!cfg.aceitaPix; $("cf-chave").value = cfg.pix?.chave || "";
  $("cf-pnome").value = cfg.pix?.nome || ""; $("cf-pcidade").value = cfg.pix?.cidade || "";
  $("cf-cartao").checked = !!cfg.aceitaCartao;
  previaPix();
}
function previaPix() {
  const chave = $("cf-chave").value.trim();
  $("pix-prev").textContent = chave ? gerarPix({ chave, nome: $("cf-pnome").value, cidade: $("cf-pcidade").value, valor: 0, txid: "***" }) : "Informe a chave Pix para ver o código.";
}
["cf-chave", "cf-pnome", "cf-pcidade"].forEach(id => $(id).addEventListener("input", previaPix));
$("cfg-form").addEventListener("submit", async e => {
  e.preventDefault();
  const err = (msg, id) => { $("cfg-err").textContent = msg; $(id).focus(); };
  let wa = soDigitos($("cf-wa").value); if (wa.length === 10 || wa.length === 11) wa = "55" + wa;
  if (!/^55\d{10,11}$/.test(wa)) return err("WhatsApp inválido: informe DDD + número.", "cf-wa");
  const taxaTxt = $("cf-taxa").value.trim(), taxa = taxaTxt === "" ? null : Number(taxaTxt);
  if (taxa !== null && !(taxa >= 0)) return err("Taxa de entrega inválida.", "cf-taxa");
  const min = Number($("cf-min").value || 0); if (!(min >= 0)) return err("Pedido mínimo inválido.", "cf-min");
  if (!$("cf-entrega").checked && !$("cf-retirada").checked) return err("Ative entrega ou retirada (ou as duas).", "cf-entrega");
  if ($("cf-pix").checked && !$("cf-chave").value.trim()) return err("Para aceitar Pix, informe a chave.", "cf-chave");
  $("cfg-err").textContent = "";
  const patch = {
    horarioTexto: $("cf-horario").value.trim(), mensagemFechado: $("cf-msg").value.trim(), whatsapp: wa,
    entregaAtiva: $("cf-entrega").checked, taxaEntrega: taxa === null ? null : Math.round(taxa * 100) / 100,
    retiradaAtiva: $("cf-retirada").checked, pedidoMinimo: min,
    aceitaPix: $("cf-pix").checked, pix: { chave: $("cf-chave").value.trim(), nome: $("cf-pnome").value.trim(), cidade: $("cf-pcidade").value.trim() },
    aceitaCartao: $("cf-cartao").checked
  };
  tentar(() => store.salvarConfig(patch), "Configurações salvas");
});
$("limpar-demo").onclick = () => confirmar("Apagar demonstração", "Apagar todos os pedidos, cardápio e configurações de teste deste navegador?", "Apagar", () => store.limparDemo());

/* ---------------- Início ---------------- */
(async function () {
  store = await iniciarStore();
  const demo = store.modo === "demo";
  $("demo-bar").hidden = !demo; $("login-demo").hidden = !demo; $("demo-card").hidden = !demo;
  if (demo) $("l-email").required = false;
  store.onAuth(aoEntrar);
})();
