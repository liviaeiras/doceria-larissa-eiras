// Testes de fumaça: carregamento, erros de console, layout no celular e acessibilidade (axe-core).
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  timeout: 30000,
  // PW_CHANNEL=chrome usa o Chrome instalado se o download do Chromium do Playwright falhar.
  use: { baseURL: "http://127.0.0.1:5173", channel: process.env.PW_CHANNEL || undefined },
  webServer: { command: "node tests/servidor.js", url: "http://127.0.0.1:5173", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "celular", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
