# Site da Larissa Eiras Doceria Artesanal

Site comercial da doceria (Paracambi, RJ): cardápio, fotos, contato e, em construção, loja própria com carrinho, entrega/retirada, Pix e cartão, para substituir o Instadelivery.

## Stack (confirmada)
- HTML, CSS e JavaScript puros (ES modules). Sem framework e sem etapa de build.
- Fontes: Google Fonts (Bodoni Moda + Figtree). QR Code: `qrcode-generator` via cdnjs.
- Dados da loja (em construção): Firebase (Firestore + Auth) via SDK da gstatic; sem `FIREBASE_CONFIG` roda em modo demonstração (localStorage).
- Hospedagem prevista: GitHub Pages + domínio próprio (ainda não configurados).
- Testes: Playwright + axe-core (`tests/`).

## Comandos
- `npm run dev` → servidor local em http://localhost:5173 (precisa de Python 3).
- `npm test` → testes de fumaça e acessibilidade (desktop e celular). Na primeira vez: `npm install` e `npx playwright install chromium`.

## Estrutura
- `index.html` → site publicado hoje (estático, links para Instadelivery/99Food/WhatsApp).
- `index.src.html`, `js/`, `css/base.css` → loja nova em construção (`js/loja.js` e `admin.html` ainda não existem).
- `js/config.js` → configuração da loja e cardápio inicial. `js/store.js` → dados (Firebase ou demo). `js/pix.js` → código Pix copia e cola.
- `img/` → fotos já otimizadas (não abrir sem necessidade).

## Padrões
- Cores e fontes só via tokens de `css/base.css` (claro e escuro). Não usar cores literais em componentes.
- Mobile first; nada de rolagem horizontal; respeitar safe areas.
- Textos em português do Brasil, diretos. Não inventar produtos, preços, depoimentos ou dados da doceria: usar só o que a Lívia/Larissa confirmaram.
- Mudanças pequenas e direcionadas; não reescrever o que funciona; não adicionar dependências sem necessidade.

## Segurança
- Nunca commitar segredos (`.env`, tokens, senhas). A config web do Firebase é pública por natureza; a proteção vem das regras do Firestore.
- Pedidos são criados por visitantes anônimos: validar dados nas regras do Firestore e escapar todo texto do usuário ao renderizar (`esc()`), nunca `innerHTML` com dado cru.
- Preços enviados pelo cliente não são confiáveis: a Larissa confere o total no painel.
- Pagamento por cartão: InfinitePay (link de checkout). Não guardar dados de cartão.

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
