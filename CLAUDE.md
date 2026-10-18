# Site da Larissa Eiras Doceria Artesanal

Site comercial da doceria (Paracambi, RJ): loja própria com cardápio, sacola, entrega/retirada, Pix e cartão (link do Mercado Pago enviado pela doceria no WhatsApp) e painel da dona. Substitui o Instadelivery.

## Stack (confirmada)
- HTML, CSS e JavaScript puros (ES modules). Sem framework e sem etapa de build.
- Fontes: Google Fonts (Bodoni Moda + Figtree). QR Code: `qrcode-generator` via cdnjs.
- Dados: Firebase (Firestore + Auth) via SDK da gstatic; sem `FIREBASE_CONFIG` roda em modo demonstração (localStorage).
- Hospedagem prevista: GitHub Pages + domínio próprio (ainda não configurados).
- Testes: Playwright + axe-core (`tests/`).

## Comandos
- `npm run dev` → servidor local em http://localhost:5173 (`python -m http.server`).
- `npm test` → fluxos da loja/painel, Pix, acessibilidade (claro/escuro) e layout (desktop e celular), servidos por `tests/servidor.js`. Na primeira vez: `npm install` e `npx playwright install chromium`. Se o download do Chromium falhar: `PW_CHANNEL=chrome npm test` (usa o Chrome instalado).

## Estrutura
- `index.html` + `js/loja.js` → loja. `admin.html` + `js/painel.js` → painel (login, aberto/fechado, pedidos, cardápio, configurações).
- `css/base.css` → tokens e componentes compartilhados.
- `js/config.js` → configuração da loja e cardápio inicial. `js/store.js` → dados (Firebase ou demo). `js/pix.js` → código Pix copia e cola.
- `firestore.rules` (+ `firebase.json`) → regras do banco. `LEIA-ME.md` → passo a passo de Firebase, Pages e domínio para a dona.
- `img/` → fotos já otimizadas (não abrir sem necessidade).

## Status
- Loja, painel, regras e testes prontos e rodando em modo demonstração.
- `SITE_URL` (js/config.js) e as URLs absolutas de og:url, og:image e JSON-LD no `index.html` apontam para o GitHub Pages: trocar para https://larissaeiras.com.br/ quando o domínio estiver ativo.
- Pendente (dona): criar o projeto Firebase e colar `FIREBASE_CONFIG`, chave Pix, taxa de entrega, GitHub Pages e domínio.

## Padrões
- Cores e fontes só via tokens de `css/base.css` (claro e escuro). Não usar cores literais em componentes.
- Mobile first; nada de rolagem horizontal; respeitar safe areas.
- Textos em português do Brasil, diretos. Não inventar produtos, preços, depoimentos ou dados da doceria: usar só o que a Lívia/Larissa confirmaram.
- Mudanças pequenas e direcionadas; não reescrever o que funciona; não adicionar dependências sem necessidade.

## Segurança
- Nunca commitar segredos (`.env`, tokens, senhas). A config web do Firebase é pública por natureza; a proteção vem das regras do Firestore.
- Pedidos são criados por visitantes anônimos: validar dados nas regras do Firestore e escapar todo texto do usuário ao renderizar (`esc()`), nunca `innerHTML` com dado cru.
- Preços enviados pelo cliente não são confiáveis: a Larissa confere o total no painel.
- Pagamento por cartão: manual, link do Mercado Pago enviado pelo WhatsApp (`cartao_link`). Não guardar dados de cartão.

## Acessibilidade e desempenho
- WCAG 2.1 AA: contraste ≥ 4.5:1, foco visível, rótulos em todos os campos, botões com nome acessível, `prefers-reduced-motion`.
- Imagens com `width/height`, `loading="lazy"` fora da primeira dobra, JPEG ≤ ~200 KB.
- `npm test` precisa passar antes de publicar.

## Skills do projeto (`.claude/skills/`)
- `frontend-design`, `ui-ux-pro-max` → decisões visuais e de UX (a identidade atual já está definida: preservar).
- `web-design-guidelines` → revisão de UI/acessibilidade (regras fixadas localmente).
- `webapp-testing` → testes no navegador com Playwright.
- `systematic-debugging`, `verification-before-completion` → depurar pela causa e só declarar pronto com evidência.
- `token-efficiency` → regras de trabalho enxuto. Carregue as skills só quando a tarefa pedir.

## Economia de contexto
- Ler este arquivo primeiro; buscar com Grep/Glob antes de abrir arquivos grandes; não explorar `img/`, `node_modules/` nem `.claude/skills/*/data/`.
- Respostas curtas: o que mudou, o que foi testado, o que falta.
