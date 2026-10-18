const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

// Fontes do Google podem não carregar em ambientes sem internet: responde vazio para não poluir o teste.
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
});

test("página inicial carrega sem erros e sem rolagem lateral", async ({ page }) => {
  const erros = [];
  page.on("pageerror", e => erros.push(e.message));
  page.on("console", m => { if (m.type() === "error") erros.push(m.text()); });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#menu .item").first()).toBeVisible();
  const largura = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(largura, "rolagem horizontal").toBeLessThanOrEqual(0);
  expect(erros).toEqual([]);
});

test("acessibilidade: sem violações sérias ou críticas (axe)", async ({ page }) => {
  await page.goto("/");
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const graves = r.violations.filter(v => ["serious", "critical"].includes(v.impact));
  expect(graves.map(v => `${v.id}: ${v.nodes.length} elemento(s)`)).toEqual([]);
});
