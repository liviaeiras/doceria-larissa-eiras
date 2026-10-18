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
