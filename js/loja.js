// Loja: cardápio, sacola e checkout (Pix, link de cartão pelo WhatsApp ou combinar no WhatsApp).
import { iniciarStore } from "./store.js";
import { gerarPix } from "./pix.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = n => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const soDigitos = s => String(s || "").replace(/\D/g, "");
const fotoOk = f => /^(img\/|data:image\/|https:\/\/)/.test(String(f || ""));
const LS_SACOLA = "le_sacola";
const lerLS = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } };
const gravarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

let store, cfg = null, produtos = [], sacola = lerLS(LS_SACOLA, {}), view = "sacola", abridor = null, enviando = false, carregou = false;
const aberto = () => !cfg || cfg.aberto !== false;
const produto = id => produtos.find(p => p.id === id);

/* ---------------- Utilidades de interface ---------------- */
let toastT;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600);
}
const waLink = msg => `https://wa.me/${soDigitos(cfg?.whatsapp || "5521975222904")}?text=${encodeURIComponent(msg)}`;
function ligarWa(raiz = document) {
  raiz.querySelectorAll("[data-wa]").forEach(a => { a.href = waLink(a.dataset.wa); a.target = "_blank"; a.rel = "noopener"; });
}
async function copiar(texto, campo) {
  try { await navigator.clipboard.writeText(texto); toast("Copiado!"); }
  catch (e) { if (campo) { campo.focus(); campo.select(); } toast("Selecione o texto e copie"); }
}
const fotoHtml = p => fotoOk(p.foto)
  ? `<img src="${esc(p.foto)}" alt="" width="56" height="56" loading="lazy">`
  : `<span class="mono" aria-hidden="true">${esc((p.nome || "L").trim()[0])}</span>`;

/* ---------------- Sacola ---------------- */
function itensSacola() {
  return Object.entries(sacola).map(([id, qtd]) => ({ p: produto(id), qtd })).filter(x => x.p && x.p.disponivel !== false && x.qtd > 0);
}
const qtdTotal = () => itensSacola().reduce((s, x) => s + x.qtd, 0);
const subtotal = () => itensSacola().reduce((s, x) => s + x.qtd * Number(x.p.preco || 0), 0);

function mudarQtd(id, delta) {
  if (!aberto() && delta > 0) return toast("A doceria está fechada agora");
  const p = produto(id); if (!p || (p.disponivel === false && delta > 0)) return;
  const q = Math.max(0, Math.min(99, (sacola[id] || 0) + delta));
  if (q) sacola[id] = q; else delete sacola[id];
  gravarLS(LS_SACOLA, sacola);
  if (delta > 0 && q === 1) toast(`${p.nome} na sacola`);
  atualizarSacola();
}
function atualizarSacola() {
  const n = qtdTotal(), drawerAberto = $("drawer").classList.contains("on");
  $("cart-count").textContent = n;
  $("open-cart").setAttribute("aria-label", `Abrir sacola, ${n} ${n === 1 ? "item" : "itens"}`);
  $("cf-qty").textContent = `${n} ${n === 1 ? "item" : "itens"}`;
  $("cf-total").textContent = brl(subtotal());
  $("cart-float").hidden = !n || !aberto() || drawerAberto;
  document.querySelectorAll("[data-acao]").forEach(el => { el.innerHTML = acaoHtml(produto(el.dataset.acao)); });
  if (drawerAberto && view === "sacola") renderSacola();
  if (drawerAberto && view === "dados") renderTotais();
}

/* ---------------- Cardápio ---------------- */
function acaoHtml(p) {
  if (!p) return "";
  const q = sacola[p.id] || 0, nome = esc(p.nome);
  if (q && aberto() && p.disponivel !== false) return `<div class="stepper" role="group" aria-label="Quantidade de ${nome}">
    <button type="button" data-dec="${esc(p.id)}" aria-label="Tirar um ${nome}">−</button><span aria-live="polite">${q}</span>
    <button type="button" data-inc="${esc(p.id)}" aria-label="Mais um ${nome}">+</button></div>`;
  return `<button class="add" type="button" data-inc="${esc(p.id)}" aria-label="Adicionar ${nome}"${aberto() && p.disponivel !== false ? "" : " disabled"}>Adicionar</button>`;
}
function renderMenu() {
  if (!cfg) return;
  renderDestaques();
  const cats = [...(cfg.categorias || [])];
  produtos.forEach(p => { if (!cats.some(c => c.id === p.categoria)) cats.push({ id: p.categoria || "outros", nome: p.categoria || "Outros" }); });
  const grupos = cats.map(c => ({ c, itens: produtos.filter(p => (p.categoria || "outros") === c.id) })).filter(g => g.itens.length);
  if (!grupos.length) {
    if (!carregou) return;
    $("cats").innerHTML = "";
    $("menu").innerHTML = `<p class="menu-loading">Cardápio em atualização. <a href="#" data-wa="Olá! Quais doces vocês têm hoje?">Pergunte no WhatsApp</a> o que tem hoje.</p>`;
    return ligarWa($("menu"));
  }
  const slug = id => "cat-" + String(id).replace(/[^a-z0-9-]/gi, "-");
  $("cats").innerHTML = grupos.map(({ c }, i) => `<a href="#${slug(c.id)}"${i ? "" : ' class="on"'}>${esc(c.nome)}</a>`).join("");
  $("menu").innerHTML = grupos.map(({ c, itens }) => `<div class="cat" id="${slug(c.id)}">
    <div class="cat-head"><h3>${esc(c.nome)}</h3></div>${c.nota ? `<p class="cat-note">${esc(c.nota)}</p>` : ""}
    <div class="items">${itens.map(p => {
      const off = p.disponivel === false;
      return `<article class="item${off ? " off" : ""}" id="prod-${esc(p.id)}">
        <div class="ph${fotoOk(p.foto) ? "" : " mono"}">${fotoOk(p.foto) ? `<img src="${esc(p.foto)}" alt="" width="104" height="104" loading="lazy">` : esc((p.nome || "L").trim()[0])}</div>
        <h4>${esc(p.nome)}</h4>${p.desc ? `<p>${esc(p.desc)}</p>` : ""}${off ? `<span class="tag-off">Indisponível hoje</span>` : ""}
        <div class="row"><span class="price">${brl(p.preco)}</span><span data-acao="${esc(p.id)}">${acaoHtml(p)}</span></div>
      </article>`;
    }).join("")}</div></div>`).join("");
  observarCats();
}
const nomeCurto = n => String(n).replace(/^(Torta de |Torta |Bolo Fatia |Pizza Brownie |Sorvete )/, "");
function renderDestaques() {
  const lista = produtos.filter(p => p.destaque && p.disponivel !== false).slice(0, 6);
  $("destaques-wrap").hidden = !lista.length;
  $("destaques").innerHTML = lista.map(p => `<li><a href="#prod-${esc(p.id)}" aria-label="${esc(p.nome)}: ver no cardápio">
    ${fotoOk(p.foto) ? `<img src="${esc(p.foto)}" alt="" width="104" height="104" loading="lazy">` : ""}<span>${esc(nomeCurto(p.nome))}</span></a></li>`).join("");
}
let obs;
function observarCats() {
  obs?.disconnect();
  if (!("IntersectionObserver" in window)) return;
  obs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    $("cats").querySelectorAll("a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
  }), { rootMargin: "-140px 0px -60% 0px" });
  document.querySelectorAll("#menu .cat").forEach(el => obs.observe(el));
}

/* ---------------- Status aberto/fechado ---------------- */
function renderStatus() {
  const ab = aberto();
  $("status-dot").className = "dot " + (ab ? "open" : "closed");
  $("status-text").textContent = ab ? `Aberto agora · ${cfg.horarioTexto || ""}`.replace(/ · $/, "") : "Fechado";
  $("closed-bar").hidden = ab;
  $("closed-msg").textContent = [cfg.mensagemFechado, cfg.horarioTexto ? `Horário: ${cfg.horarioTexto}.` : ""].filter(Boolean).join(" ");
  $("horario-texto").textContent = cfg.horarioTexto || "";
  const d = soDigitos(cfg.whatsapp).replace(/^55/, "");
  if (d.length >= 10) $("tel").textContent = `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}`;
  if (!ab && view === "dados" && $("drawer").classList.contains("on")) {
    $("dados-err").textContent = "A doceria acabou de fechar e não está recebendo pedidos pelo site. Fale com a gente no WhatsApp.";
  }
  ligarWa();
}

/* ---------------- Gaveta ---------------- */
const TITULOS = { sacola: "Sua sacola", dados: "Seus dados", fim: "Seu pedido" };
function mostrar(v) {
  view = v;
  document.querySelectorAll("#drawer [data-view]").forEach(el => { el.hidden = el.dataset.view !== v; });
  $("d-title").textContent = TITULOS[v];
  if (v === "sacola") renderSacola();
  if (v === "dados") prepararDados();
}
function abrir(v = "sacola") {
  const d = $("drawer");
  if (!d.classList.contains("on")) abridor = document.activeElement;
  mostrar(v);
  d.inert = false; d.setAttribute("aria-hidden", "false"); d.classList.add("on"); $("scrim").classList.add("on");
  atualizarSacola();
  (focaveis()[0] || $("close-cart")).focus();
}
function fechar() {
  const d = $("drawer");
  if (!d.classList.contains("on")) return;
  d.classList.remove("on"); d.setAttribute("aria-hidden", "true"); d.inert = true; $("scrim").classList.remove("on");
  if (view === "fim") mostrar("sacola");
  atualizarSacola();
  (abridor && document.contains(abridor) && abridor.offsetParent !== null ? abridor : $("open-cart")).focus();
}
const focaveis = () => [...$("drawer").querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])')]
  .filter(el => !el.closest("[hidden]") && el.getClientRects().length);

function renderSacola() {
  const itens = itensSacola();
  if (!itens.length) {
    $("v-sacola").innerHTML = `<div class="empty"><div class="mono-big" aria-hidden="true">L</div><p>Sua sacola está vazia.</p></div>`;
    $("f-sacola").innerHTML = `<button class="btn btn-ghost btn-block" type="button" data-fechar>Ver cardápio</button>`;
    return;
  }
  $("v-sacola").innerHTML = itens.map(({ p, qtd }) => `<div class="line">
    ${fotoHtml(p)}<div><b>${esc(p.nome)}</b><small>${qtd} × ${brl(p.preco)}</small></div>
    <span data-acao="${esc(p.id)}">${acaoHtml(p)}</span></div>`).join("");
  const min = Number(cfg?.pedidoMinimo || 0), falta = min > 0 && subtotal() < min;
  $("f-sacola").innerHTML = `<div class="totals"><div class="grand"><span>Subtotal</span><span>${brl(subtotal())}</span></div></div>
    ${!aberto() ? `<p class="err">A doceria está fechada agora. <a href="#" data-wa="Olá! Gostaria de fazer uma encomenda.">Fale no WhatsApp</a>.</p>` : ""}
    ${falta ? `<p class="err">Pedido mínimo de ${brl(min)}. Faltam ${brl(min - subtotal())}.</p>` : ""}
    <button class="btn btn-primary btn-block" type="button" id="ir-dados"${!aberto() || falta ? " disabled" : ""}>Continuar</button>
    <button class="btn btn-sm" type="button" data-fechar>Continuar comprando</button>`;
  ligarWa($("f-sacola"));
}

/* ---------------- Checkout ---------------- */
const temPix = () => cfg.aceitaPix && !!String(cfg.pix?.chave || "").trim();
const temCartao = () => !!cfg.aceitaCartao;
const taxaNum = () => typeof cfg.taxaEntrega === "number" && cfg.taxaEntrega >= 0;
const radio = nome => document.querySelector(`input[name="${nome}"]:checked`)?.value || "";

function prepararDados() {
  const ent = cfg.entregaAtiva !== false, ret = cfg.retiradaAtiva !== false || !ent;
  $("opt-entrega").hidden = !ent; $("opt-retirada").hidden = !ret;
  $("taxa-label").textContent = taxaNum() ? (cfg.taxaEntrega ? `Taxa ${brl(cfg.taxaEntrega)}` : "Sem taxa") : "Taxa a combinar";
  document.querySelectorAll('input[name="tipo"]').forEach(r => { if (r.closest("label").hidden) r.checked = false; });
  if (ent !== ret) document.querySelector(`input[name="tipo"][value="${ent ? "entrega" : "retirada"}"]`).checked = true;

  $("opt-pix").hidden = !temPix(); $("opt-cartao").hidden = !temCartao();
  let wa = $("opt-wa");
  if (!temPix() && !temCartao()) {
    if (!wa) {
      $("pag-choice").insertAdjacentHTML("beforeend", `<label id="opt-wa"><input type="radio" name="pag" value="whatsapp"><span><b>Combinar pagamento no WhatsApp</b><small>A doceria fala com você</small></span></label>`);
      wa = $("opt-wa");
    }
    wa.hidden = false;
  } else if (wa) wa.hidden = true;
  document.querySelectorAll('input[name="pag"]').forEach(r => { if (r.closest("label").hidden) r.checked = false; });
  const visiveis = [...document.querySelectorAll('input[name="pag"]')].filter(r => !r.closest("label").hidden);
  if (visiveis.length === 1) visiveis[0].checked = true;

  $("endereco").hidden = radio("tipo") !== "entrega";
  $("dados-err").textContent = aberto() ? "" : "A doceria está fechada agora e não está recebendo pedidos pelo site.";
  renderTotais();
}
function calcular() {
  const tipo = radio("tipo"), sub = subtotal();
  const taxa = tipo === "entrega" ? (taxaNum() ? cfg.taxaEntrega : null) : 0;
  return { tipo, sub, taxa, total: sub + (taxa || 0) };
}
function renderTotais() {
  const { tipo, sub, taxa, total } = calcular();
  $("dados-totais").innerHTML = `<div><span>Subtotal</span><span>${brl(sub)}</span></div>
    ${tipo === "entrega" ? `<div><span>Entrega</span><span>${taxa === null ? "a combinar" : brl(taxa)}</span></div>` : ""}
    <div class="grand"><span>Total</span><span>${brl(total)}${taxa === null ? " + entrega" : ""}</span></div>`;
  $("enviar").disabled = !aberto() || enviando || !qtdTotal();
}

function validar() {
  const erros = [];
  const val = id => $(id).value.trim();
  const marcar = (el, ok) => el.setAttribute("aria-invalid", ok ? "false" : "true");
  ["c-nome", "c-tel", "c-rua", "c-num", "c-bairro"].forEach(id => $(id).removeAttribute("aria-invalid"));
  if (val("c-nome").length < 2) { erros.push(["c-nome", "Informe seu nome."]); marcar($("c-nome"), false); }
  let tel = soDigitos(val("c-tel")); if (tel.length > 11 && tel.startsWith("55")) tel = tel.slice(2);
  if (tel.length < 10 || tel.length > 11) { erros.push(["c-tel", "WhatsApp inválido: use DDD + número (10 ou 11 dígitos)."]); marcar($("c-tel"), false); }
  const tipo = radio("tipo");
  if (!tipo) erros.push([document.querySelector('#tipo-choice label:not([hidden]) input'), "Escolha entrega ou retirada."]);
  if (tipo === "entrega") {
    [["c-rua", "a rua"], ["c-num", "o número"], ["c-bairro", "o bairro"]].forEach(([id, n]) => {
      if (!val(id)) { erros.push([id, `Informe ${n} para a entrega.`]); marcar($(id), false); }
    });
  }
  if (!radio("pag")) erros.push([document.querySelector('#pag-choice label:not([hidden]) input'), "Escolha a forma de pagamento."]);
  const min = Number(cfg.pedidoMinimo || 0);
  if (min > 0 && subtotal() < min) erros.push(["enviar", `Pedido mínimo de ${brl(min)}.`]);
  if (!qtdTotal()) erros.push(["enviar", "Sua sacola está vazia."]);
  return { erros, tel };
}

async function enviar() {
  if (enviando) return;
  if (!aberto()) { $("dados-err").textContent = "A doceria está fechada agora e não está recebendo pedidos pelo site. Fale com a gente no WhatsApp."; return; }
  const { erros, tel } = validar();
  if (erros.length) {
    $("dados-err").textContent = erros.map(e => e[1]).join(" ");
    const alvo = typeof erros[0][0] === "string" ? $(erros[0][0]) : erros[0][0];
    alvo?.focus();
    return;
  }
  $("dados-err").textContent = "";
  const { tipo, sub, taxa, total } = calcular(), pagamento = radio("pag"), v = id => $(id).value.trim();
  const pedido = {
    cliente: { nome: v("c-nome"), telefone: tel },
    tipo,
    endereco: tipo === "entrega" ? { rua: v("c-rua"), numero: v("c-num"), bairro: v("c-bairro"), complemento: v("c-comp"), referencia: v("c-ref") } : null,
    itens: itensSacola().map(({ p, qtd }) => ({ id: p.id, nome: p.nome, preco: Number(p.preco), qtd })),
    subtotal: sub, taxa, total, pagamento, obs: v("c-obs")
  };
  enviando = true; $("enviar").disabled = true; $("enviar").textContent = "Enviando…";
  let res;
  try { res = await store.criarPedido(pedido); }
  catch (e) {
    console.error(e);
    $("dados-err").textContent = "Não foi possível enviar o pedido. Verifique sua internet e tente de novo, ou fale no WhatsApp.";
    return;
  } finally { enviando = false; $("enviar").textContent = "Finalizar pedido"; renderTotais(); }
  sacola = {}; gravarLS(LS_SACOLA, sacola);
  const ped = { ...pedido, ...res };
  atualizarSacola();
  if (pagamento === "pix") telaPix(ped);
  else if (pagamento === "cartao_link") telaCartao(ped);
  else telaCombinar(ped);
}

function mensagemWa(p, extra = "") {
  const L = [`Olá! Fiz o pedido #${p.numero} pelo site.`, "", "*Itens*"];
  p.itens.forEach(i => L.push(`${i.qtd}x ${i.nome} (${brl(i.qtd * i.preco)})`));
  L.push("", `Subtotal: ${brl(p.subtotal)}`);
  if (p.tipo === "entrega") L.push(`Entrega: ${p.taxa === null ? "a combinar" : brl(p.taxa)}`);
  L.push(`Total: ${brl(p.total)}${p.taxa === null ? " + entrega" : ""}`, "");
  if (p.tipo === "entrega") {
    const e = p.endereco;
    L.push(`*Entrega:* ${e.rua}, ${e.numero} - ${e.bairro}${e.complemento ? ` (${e.complemento})` : ""}`);
    if (e.referencia) L.push(`Referência: ${e.referencia}`);
  } else L.push(`*Retirada* na ${cfg.endereco || "doceria"}`);
  L.push(`Pagamento: ${{ pix: "Pix", cartao_link: "Cartão (link do Mercado Pago)", whatsapp: "combinar no WhatsApp" }[p.pagamento]}`);
  L.push(`Nome: ${p.cliente.nome}`, `WhatsApp: ${p.cliente.telefone}`);
  if (p.obs) L.push(`Observações: ${p.obs}`);
  if (extra) L.push("", extra);
  return L.join("\n");
}

function telaPix(p) {
  const aCombinar = p.tipo === "entrega" && p.taxa === null, valor = aCombinar ? p.subtotal : p.total;
  const codigo = gerarPix({ chave: cfg.pix.chave, nome: cfg.pix.nome, cidade: cfg.pix.cidade, valor, txid: p.numero });
  let svg = "";
  try { const q = qrcode(0, "M"); q.addData(codigo); q.make(); svg = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { console.error(e); }
  mostrarFim(`<div class="done-mark" aria-hidden="true">✓</div>
    <p class="order-no">Pedido #${esc(p.numero)}</p>
    <p class="muted" style="margin:0;text-align:center">Recebemos seu pedido. Pague com Pix para a doceria começar a preparar.</p>
    <div class="pix-box">
      ${svg ? `<div class="pix-qr" id="pix-qr" role="img" aria-label="QR Code Pix de ${esc(brl(valor))}">${svg}</div>` : `<p class="err">Não foi possível gerar o QR Code. Use o Pix copia e cola.</p>`}
      <p style="margin:0"><span class="muted">Valor do Pix</span><br><b style="font-size:1.4rem">${brl(valor)}</b></p>
      <label class="label" for="pix-code">Pix copia e cola</label>
      <textarea class="pix-code" id="pix-code" readonly rows="3">${esc(codigo)}</textarea>
      <button class="btn btn-ghost btn-sm" type="button" id="copiar-pix">Copiar código Pix</button>
    </div>
    <div class="note-box">${aCombinar ? "<b>A taxa de entrega é combinada e paga à parte.</b> " : ""}Confirme o pedido no WhatsApp e envie o comprovante do Pix por lá.</div>`,
    `<a class="btn btn-wa btn-block" href="${esc(waLink(mensagemWa(p, "Vou pagar pelo Pix e envio o comprovante aqui.")))}" target="_blank" rel="noopener">Confirmar pedido no WhatsApp</a>
     <button class="btn btn-sm" type="button" data-fechar>Fechar</button>`);
  $("copiar-pix").onclick = () => copiar(codigo, $("pix-code"));
}

function telaCombinar(p) {
  mostrarFim(`<div class="done-mark" aria-hidden="true">✓</div><p class="order-no">Pedido #${esc(p.numero)}</p>
    <div class="note-box">Seu pedido foi registrado. Confirme no WhatsApp para combinar o pagamento${p.tipo === "entrega" ? " e a entrega" : ""} com a doceria.</div>`,
    `<a class="btn btn-wa btn-block" href="${esc(waLink(mensagemWa(p)))}" target="_blank" rel="noopener">Confirmar pedido no WhatsApp</a>
     <button class="btn btn-sm" type="button" data-fechar>Fechar</button>`);
}

function telaCartao(p) {
  mostrarFim(`<div class="done-mark" aria-hidden="true">✓</div><p class="order-no">Pedido #${esc(p.numero)}</p>
    <p class="muted" style="margin:0;text-align:center">Total: <b>${brl(p.total)}${p.taxa === null ? " + entrega" : ""}</b></p>
    <div class="note-box"><b>A Larissa vai te enviar o link de pagamento do Mercado Pago pelo WhatsApp.</b> Confirme o pedido por lá para receber o link.</div>`,
    `<a class="btn btn-wa btn-block" href="${esc(waLink(mensagemWa(p, "Quero pagar com cartão: pode me enviar o link de pagamento do Mercado Pago?")))}" target="_blank" rel="noopener">Confirmar pedido no WhatsApp</a>
     <button class="btn btn-sm" type="button" data-fechar>Fechar</button>`);
}

function mostrarFim(corpo, rodape) {
  $("v-fim").innerHTML = corpo; $("f-fim").innerHTML = rodape;
  if ($("drawer").classList.contains("on")) mostrar("fim"); else abrir("fim");
  (focaveis()[0] || $("close-cart")).focus();
}

/* ---------------- Início ---------------- */
function ligarEventos() {
  $("menu").addEventListener("click", e => {
    const b = e.target.closest("[data-inc],[data-dec]"); if (!b) return;
    const id = b.dataset.inc || b.dataset.dec, inc = !!b.dataset.inc;
    mudarQtd(id, inc ? 1 : -1);
    const alvo = document.querySelector(`#menu [data-acao="${CSS.escape(id)}"]`);
    (alvo?.querySelector(inc ? "[data-inc]:not(.add)" : "[data-dec]") || alvo?.querySelector("button"))?.focus();
  });
  $("drawer").addEventListener("click", e => {
    if (e.target.closest("[data-fechar]")) return fechar();
    if (e.target.closest("#ir-dados")) return mostrar("dados"), $("c-nome").focus();
    const b = e.target.closest("[data-inc],[data-dec]");
    if (b) {
      const id = b.dataset.inc || b.dataset.dec;
      mudarQtd(id, b.dataset.inc ? 1 : -1);
      ($(`v-sacola`).querySelector(`[data-acao="${CSS.escape(id)}"] button`) || focaveis()[0])?.focus();
    }
  });
  $("open-cart").onclick = () => abrir("sacola");
  $("cart-float").onclick = () => abrir("sacola");
  $("close-cart").onclick = fechar;
  $("scrim").onclick = fechar;
  $("voltar").onclick = () => { mostrar("sacola"); (focaveis()[0] || $("close-cart")).focus(); };
  $("enviar").onclick = enviar;
  $("v-dados").addEventListener("submit", e => { e.preventDefault(); enviar(); });
  $("v-dados").addEventListener("change", e => {
    if (e.target.name === "tipo") $("endereco").hidden = radio("tipo") !== "entrega";
    renderTotais();
  });
  document.addEventListener("keydown", e => {
    if (!$("drawer").classList.contains("on")) return;
    if (e.key === "Escape") return fechar();
    if (e.key !== "Tab") return;
    const f = focaveis(); if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
  });
  $("copy-tel").onclick = () => copiar($("tel").textContent);
  [["c-nome", 80], ["c-tel", 20], ["c-rua", 120], ["c-num", 20], ["c-bairro", 80], ["c-comp", 80], ["c-ref", 120], ["c-obs", 500]]
    .forEach(([id, n]) => { $(id).maxLength = n; });
}

async function iniciar() {
  $("ano").textContent = new Date().getFullYear();
  $("drawer").inert = true;
  ligarEventos();
  ligarWa();
  store = await iniciarStore();
  $("demo-bar").hidden = store.modo !== "demo";
  store.onConfig(c => { cfg = c; renderStatus(); renderMenu(); atualizarSacola(); });
  store.onProdutos(lista => {
    produtos = lista; carregou = true;
    if (lista.length) {
      const antes = Object.keys(sacola).length;
      sacola = Object.fromEntries(Object.entries(sacola).filter(([id]) => { const p = produto(id); return p && p.disponivel !== false; }));
      if (Object.keys(sacola).length < antes) { gravarLS(LS_SACOLA, sacola); toast("Um item da sacola ficou indisponível e foi retirado"); }
    }
    renderMenu(); atualizarSacola();
  });
}
iniciar();
