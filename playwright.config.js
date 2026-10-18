// Testes de fumaça: carregamento, erros de console, layout no celular e acessibilidade (axe-core).
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: { command: "python3 -m http.server 5173 --bind 127.0.0.1", url: "http://127.0.0.1:5173", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "celular", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
