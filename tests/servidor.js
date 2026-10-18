// Servidor estático mínimo para os testes (o http.server do Python recusa conexões com vários testes em paralelo).
const http = require("http"), fs = require("fs"), path = require("path");
const raiz = path.resolve(__dirname, ".."), porta = Number(process.env.PORT || 5173);
const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp", ".webmanifest": "application/manifest+json" };

http.createServer((req, res) => {
  let arq = path.join(raiz, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!arq.startsWith(raiz)) { res.writeHead(403); return res.end(); }
  if (arq.endsWith(path.sep)) arq = path.join(arq, "index.html");
  fs.readFile(arq, (err, dados) => {
    if (err) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": tipos[path.extname(arq).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(dados);
  });
}).listen(porta, "127.0.0.1", 511);
