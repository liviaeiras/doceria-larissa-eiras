// Fluxos da loja e do painel no modo demonstração (dados no localStorage do navegador de teste).
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const CHAVE = "123e4567-e12b-12d1-a456-426655440000";

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
});

async function configurar(page, cfg) {
  await page.goto("/");
  await page.evaluate(c => localStorage.setItem("le_demo_config", JSON.stringify(c)), cfg);
  await page.reload();
}
async function adicionar(page, n) {
  for (let i = 0; i < n; i++) await page.locator("#menu button.add:not([disabled])").first().click();
}
async function entrarPainel(page) {
  await page.goto("/admin.html");
  await page.fill("#l-email", "larissa@exemplo.com");
  await page.fill("#l-senha", "demo");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#v-app")).toBeVisible();
}

test("fluxo completo: sacola → retirada + Pix → pedido no painel → em preparo", async ({ page }) => {
  await configurar(page, { pix: { chave: CHAVE } });
  await adicionar(page, 2);
  await expect(page.locator("#cart-count")).toHaveText("2");
  await page.click("#open-cart");
  await page.click("#ir-dados");
  await page.fill("#c-nome", "Cliente Teste");
  await page.fill("#c-tel", "(21) 99999-0000");
  await page.locator("#opt-retirada").click();
  await page.locator("#opt-pix").click();
  await page.click("#enviar");
  await expect(page.locator("#pix-qr svg")).toBeVisible();
  await expect(page.locator("#pix-code")).toHaveValue(/^000201.*6304[0-9A-F]{4}$/);
  const numero = (await page.locator("#v-fim .order-no").textContent()).replace(/\D*#/, "").trim();
  await expect(page.locator("#cart-count")).toHaveText("0");

  await entrarPainel(page);
  await page.click("#t-pedidos");
  const card = page.locator(".order", { hasText: "#" + numero });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Cliente Teste");
  await card.getByRole("button", { name: "Em preparo" }).click();
  await expect(card.locator(".st").first()).toHaveText("Em preparo");
});

test("fechada pelo painel: a loja não deixa adicionar e mostra o WhatsApp", async ({ page }) => {
  await entrarPainel(page);
  await page.click("#loja-btn");
  await page.click("#fechar-sim");
  await expect(page.locator("#loja-txt")).toHaveText("Loja FECHADA");
  await page.goto("/");
  await expect(page.locator("#closed-bar")).toBeVisible();
  await expect(page.locator("#closed-bar a")).toHaveAttribute("href", /^https:\/\/wa\.me\/5521975222904\?text=/);
  await expect(page.locator("#status-text")).toHaveText("Fechado");
  await expect(page.locator("#menu .item").first()).toBeVisible();
  expect(await page.locator("#menu button.add:not([disabled])").count()).toBe(0);
  await expect(page.locator("#cart-float")).toBeHidden();
});

test("validação: entrega sem endereço mostra erro e foca a rua", async ({ page }) => {
  await page.goto("/");
  await adicionar(page, 1);
  await page.click("#open-cart");
  await page.click("#ir-dados");
  await page.fill("#c-nome", "Cliente Teste");
  await page.fill("#c-tel", "21999990000");
  await page.locator("#opt-entrega").click();
  await page.click("#enviar");
  await expect(page.locator("#dados-err")).toContainText("rua");
  await expect(page.locator("#c-rua")).toBeFocused();
  await expect(page.locator("#c-rua")).toHaveAttribute("aria-invalid", "true");
});

test("validação: WhatsApp com poucos dígitos é recusado", async ({ page }) => {
  await page.goto("/");
  await adicionar(page, 1);
  await page.click("#open-cart");
  await page.click("#ir-dados");
  await page.fill("#c-nome", "Cliente Teste");
  await page.fill("#c-tel", "9999");
  await page.click("#enviar");
  await expect(page.locator("#dados-err")).toContainText("WhatsApp");
  await expect(page.locator("#c-tel")).toBeFocused();
});

test("Pix: exemplo oficial do Banco Central e caso com valor", async ({ page }) => {
  await page.goto("/");
  const r = await page.evaluate(async chave => {
    const { gerarPix } = await import("/js/pix.js");
    return {
      oficial: gerarPix({ chave, nome: "Fulano de Tal", cidade: "BRASILIA", txid: "***" }),
      valor: gerarPix({ chave: "21 97522-2904", nome: "Larissa Eiras", cidade: "Paracambi", valor: 36.5, txid: "AB12C" })
    };
  }, CHAVE);
  expect(r.oficial).toBe("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D");
  expect(r.valor).toContain("540536.50");
  expect(r.valor).toContain("0114+5521975222904");
  expect(r.valor).toContain("0505AB12C");
  // CRC16-CCITT calculado de forma independente
  const corpo = r.valor.slice(0, -4);
  let crc = 0xffff;
  for (const ch of corpo) { crc ^= ch.charCodeAt(0) << 8; for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff; }
  expect(r.valor.slice(-4)).toBe(crc.toString(16).toUpperCase().padStart(4, "0"));
});

for (const esquema of ["light", "dark"]) {
  test(`acessibilidade (${esquema}): loja e painel sem violações sérias ou críticas`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: esquema });
    const checar = async nome => {
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const graves = r.violations.filter(v => ["serious", "critical"].includes(v.impact));
      expect(graves.map(v => `${nome} → ${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
    };
    await configurar(page, { pix: { chave: CHAVE } });
    await expect(page.locator("#menu .item").first()).toBeVisible();
    await checar("loja");
    await adicionar(page, 1);
    await page.click("#open-cart");
    await page.click("#ir-dados");
    await checar("checkout");
    await page.goto("/admin.html");
    await expect(page.locator("#v-login")).toBeVisible();
    await checar("login");
    await entrarPainel(page);
    await checar("resumo");
    await page.click("#t-pedidos");
    await checar("pedidos");
    await page.click("#t-cardapio");
    await checar("cardápio");
    await page.click("#t-config");
    await checar("configurações");
  });
}

test("sem rolagem horizontal em 390px (loja e painel)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const largura = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await page.goto("/");
  await expect(page.locator("#menu .item").first()).toBeVisible();
  expect(await largura(), "loja").toBeLessThanOrEqual(0);
  await entrarPainel(page);
  for (const aba of ["#t-resumo", "#t-pedidos", "#t-cardapio", "#t-config"]) {
    await page.click(aba);
    expect(await largura(), "painel " + aba).toBeLessThanOrEqual(0);
  }
});

// ---------- Vitrine, cartão por link, total divergente, Resumo e privacidade ----------
const ped = (o) => ({ cliente: { nome: "Teste", telefone: "21999990000" }, tipo: "retirada", endereco: null, taxa: 0, obs: "",
  status: "novo", pago: false, criadoEm: Date.now(), ...o });
async function semearPedidos(page, lista) {
  await page.goto("/admin.html");
  await page.evaluate(l => localStorage.setItem("le_demo_pedidos", JSON.stringify(l)), lista);
}

test("início: moldura com a logo, faixa Fatias da casa e nenhuma etiqueta de preço na foto", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero-art .arch img")).toHaveAttribute("src", "img/fatia-limao-hero.jpg");
  await expect(page.locator(".hero-art .hero-logo img")).toBeVisible();
  await expect(page.locator(".hero-art")).not.toContainText("R$");
  await expect(page.locator(".hero h1 em")).toHaveText("fatia por fatia.");
  const fatias = page.locator("#destaques li");
  await expect(fatias.first()).toBeVisible();
  expect(await fatias.count()).toBeLessThanOrEqual(6);
  await expect(page.locator("#destaques")).toContainText("Limão");
  const alvo = await fatias.first().locator("a").getAttribute("href");
  await expect(page.locator(alvo)).toContainText("Torta de Limão");
});

test("cardápio: Torta de Limão por R$ 18,00", async ({ page }) => {
  await page.goto("/");
  const item = page.locator("#menu .item", { hasText: "Torta de Limão" });
  await expect(item).toContainText(/R\$\s18,00/);
  await expect(item.locator("button.add")).toBeEnabled();
});

test("cartão: pedido cartao_link pede o link no WhatsApp e o painel envia o link", async ({ page }) => {
  await page.goto("/");
  await adicionar(page, 1);
  await page.click("#open-cart");
  await page.click("#ir-dados");
  await page.fill("#c-nome", "Cliente Cartão");
  await page.fill("#c-tel", "21988887777");
  await page.locator("#opt-retirada").click();
  await page.locator("#opt-cartao").click();
  await page.click("#enviar");
  await expect(page.locator("#v-fim")).toContainText("A Larissa vai te enviar o link de pagamento do Mercado Pago pelo WhatsApp");
  const botao = page.getByRole("link", { name: "Confirmar pedido no WhatsApp" });
  await expect(botao).toHaveAttribute("href", /^https:\/\/wa\.me\/5521975222904\?text=.*link%20de%20pagamento/);
  await entrarPainel(page);
  await page.click("#t-pedidos");
  const card = page.locator(".order", { hasText: "Cliente Cartão" });
  await expect(card).toContainText("Cartão (link Mercado Pago)");
  const link = card.getByRole("link", { name: "Enviar link de pagamento" });
  await expect(link).toHaveAttribute("href", /^https:\/\/wa\.me\/5521988887777\?text=.*R%24/);
});

test("painel: alerta quando o total não bate com o cardápio", async ({ page }) => {
  await semearPedidos(page, [
    ped({ id: "dok", numero: "OK1", itens: [{ id: "p0", nome: "Torta de Limão", preco: 18, qtd: 2 }], subtotal: 36, total: 36, pagamento: "pix" }),
    ped({ id: "dbad", numero: "BAD1", itens: [{ id: "p0", nome: "Torta de Limão", preco: 1, qtd: 2 }], subtotal: 2, total: 2, pagamento: "pix" })
  ]);
  await entrarPainel(page);
  await page.click("#t-pedidos");
  await expect(page.locator(".order", { hasText: "#BAD1" })).toContainText("Total diferente do cardápio");
  await expect(page.locator(".order", { hasText: "#OK1" })).not.toContainText("Total diferente do cardápio");
});

test("painel: Resumo soma pedidos não cancelados com valores conhecidos", async ({ page }) => {
  await semearPedidos(page, [
    ped({ id: "d1", numero: "A1", itens: [{ id: "p0", nome: "Torta de Limão", preco: 18, qtd: 2 }], subtotal: 36, total: 36, pagamento: "pix" }),
    ped({ id: "d2", numero: "A2", tipo: "entrega", endereco: { rua: "Rua A", numero: "1", bairro: "Centro", complemento: "", referencia: "" },
      itens: [{ id: "p11", nome: "Pizza Brownie Ferrero", preco: 15, qtd: 1 }], subtotal: 15, total: 15, pagamento: "cartao_link" }),
    ped({ id: "d3", numero: "A3", status: "cancelado", itens: [{ id: "p0", nome: "Torta de Limão", preco: 18, qtd: 5 }], subtotal: 90, total: 90, pagamento: "pix" })
  ]);
  await entrarPainel(page);
  await expect(page.locator("#p-resumo")).toBeVisible();
  const tiles = page.locator("#r-periodos .tile");
  for (let i = 0; i < 3; i++) {
    await expect(tiles.nth(i)).toContainText(/R\$\s51,00/);
    await expect(tiles.nth(i)).toContainText(/2 pedidos · ticket médio R\$\s25,50/);
  }
  await expect(page.locator("#r-top .bar-row").first()).toContainText(/Torta de Limão\s*2 un\. · R\$\s36,00/);
  await expect(page.locator("#r-pag")).toContainText(/Pix\s*1 · R\$\s36,00/);
  await expect(page.locator("#r-pag")).toContainText(/Cartão\s*1 · R\$\s15,00/);
  await expect(page.locator("#r-tipo")).toContainText(/Entrega\s*1 · R\$\s15,00/);
  await expect(page.locator("#r-tipo")).toContainText(/Retirada\s*1 · R\$\s36,00/);
});

test("privacidade: link no rodapé e no checkout, página carrega", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("footer a[href='privacidade.html']")).toBeVisible();
  await adicionar(page, 1);
  await page.click("#open-cart");
  await page.click("#ir-dados");
  await expect(page.locator("#v-dados a[href='privacidade.html']")).toBeVisible();
  await page.goto("/privacidade.html");
  await expect(page.locator("h1")).toHaveText("Como usamos os seus dados");
  await expect(page.locator("main")).toContainText("exclusão");
});

test("prévia de link: og:image, og:url e JSON-LD com URL absoluta do SITE_URL", async ({ page }) => {
  await page.goto("/");
  const site = await page.evaluate(async () => (await import("/js/config.js")).SITE_URL);
  expect(site).toMatch(/^https:\/\/.+\/$/);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", site);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", site + "img/og.jpg");
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(ld.image).toBe(site + "img/og.jpg");
});

for (const esquema of ["light", "dark"]) {
  test(`acessibilidade (${esquema}): privacidade sem violações sérias ou críticas`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: esquema });
    await page.goto("/privacidade.html");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(r.violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id)).toEqual([]);
  });
}

test("sem rolagem horizontal em 390px: privacidade", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/privacidade.html");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
