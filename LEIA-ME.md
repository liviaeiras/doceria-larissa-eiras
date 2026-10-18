# Site da Larissa Eiras Doceria Artesanal

Loja própria da doceria: o cliente monta a sacola, escolhe **entrega** ou **retirada** e paga por **Pix** (QR Code com o valor certo) ou **cartão** (a Larissa envia o link de pagamento do Mercado Pago pelo WhatsApp). A Larissa acompanha tudo no **painel** (`admin.html`).

- `index.html` → loja (o que o cliente vê)
- `admin.html` → painel da doceria (pedidos, cardápio, configurações, aberto/fechado)
- `js/config.js` → onde se cola a configuração do Firebase
- `firestore.rules` → regras de segurança do banco

Enquanto o Firebase não for configurado, o site funciona em **modo demonstração** (veja o passo 7).

---

## 1. Criar o projeto no Firebase

1. Entre em <https://console.firebase.google.com> com a conta Google da doceria e clique em **Adicionar projeto** (ex.: `larissa-eiras`). O Google Analytics pode ficar desligado. Use o plano gratuito (Spark).
2. Na página do projeto, clique no ícone **Web** (`</>`), dê um apelido (ex.: `site`) e **não** marque Firebase Hosting.
3. O Firebase mostra um bloco `const firebaseConfig = { ... }`. Copie só o que está entre as chaves e cole em `js/config.js`, trocando `export const FIREBASE_CONFIG = null;` por:

   ```js
   export const FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     appId: "..."
   };
   ```

   Esses dados são públicos por natureza (todo site com Firebase mostra). Quem protege o banco são as regras do passo 2.

## 2. Ativar o banco (Firestore) e publicar as regras

1. No menu do Firebase: **Firestore Database → Criar banco de dados**.
2. Escolha **modo de produção** e a região **southamerica-east1 (São Paulo)**. A região não pode ser trocada depois.
3. Abra a aba **Regras**, apague o que estiver lá, cole todo o conteúdo do arquivo `firestore.rules` deste repositório e clique em **Publicar**.

(Quem usa o Firebase CLI pode publicar com `firebase deploy --only firestore:rules`; o `firebase.json` já aponta para o arquivo.)

## 3. Login da Larissa (Authentication) e permissão de administradora

1. **Authentication → Começar → E-mail/senha → Ativar → Salvar**.
2. Aba **Usuários → Adicionar usuário**: e-mail e uma senha forte da Larissa.
3. Copie o **UID do usuário** (coluna "UID do usuário").
4. Em **Firestore Database → Dados → Iniciar coleção**: ID da coleção `admins`. No ID do documento, cole o **UID**. Adicione um campo qualquer (ex.: `nome` = `Larissa`) e salve.

Só quem tem um documento em `admins` consegue ver pedidos e mudar o cardápio. Para dar acesso à Lívia também, repita os passos 2 a 4 com o usuário dela.

## 4. Primeiro acesso ao painel

1. Abra `admin.html` (ou clique em **Área da doceria** no rodapé do site) e entre com o e-mail e a senha da Larissa.
2. Aba **Cardápio → Importar cardápio inicial** (traz os itens e fotos que já estão no site).
3. Aba **Configurações**: preencha a **chave Pix**, o nome do recebedor e a cidade (confira a prévia), se aceita **cartão**, a **taxa de entrega** (vazio = "a combinar") e o pedido mínimo. Clique em **Salvar configurações**.
4. No topo, o botão **Loja ABERTA / Loja FECHADA** controla se o site aceita pedidos. Fechada, o site manda os clientes para o WhatsApp.

Dica: deixe o painel aberto no celular ou computador e toque uma vez na página para liberar o **som** de pedido novo.

## 5. Publicar no GitHub Pages

1. No GitHub, abra o repositório → **Settings → Pages**.
2. Em **Build and deployment**: *Source* = **Deploy from a branch**, *Branch* = **main**, pasta **/ (root)** → **Save**.
3. Em alguns minutos o site fica em `https://liviaeiras.github.io/doceria-larissa-eiras/`.
4. No Firebase: **Authentication → Configurações → Domínios autorizados → Adicionar domínio** e inclua `liviaeiras.github.io` (e, depois do passo 6, `larissaeiras.com.br` e `www.larissaeiras.com.br`).

## 6. Domínio próprio (larissaeiras.com.br)

1. Registre `larissaeiras.com.br` em <https://registro.br> **no CPF ou CNPJ da Larissa**.
2. Crie na raiz do repositório um arquivo chamado `CNAME` (sem extensão) contendo só a linha `www.larissaeiras.com.br` (ou `larissaeiras.com.br`, se preferir sem www) e faça commit. Também é possível digitar o domínio em **Settings → Pages → Custom domain**, que cria o arquivo.
3. No registro.br, em **DNS → Editar zona**, crie (confira os valores atuais na documentação do GitHub: <https://docs.github.com/pt/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site>):
   - 4 registros **A** para `larissaeiras.com.br`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 4 registros **AAAA** para `larissaeiras.com.br`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - 1 registro **CNAME** para `www` apontando para `liviaeiras.github.io`
4. Depois que o DNS propagar (pode levar algumas horas), marque **Enforce HTTPS** em **Settings → Pages**.
5. Não esqueça de adicionar o domínio no Firebase (passo 5.4).

## 7. Testar no modo demonstração

Com `FIREBASE_CONFIG = null`, tudo fica salvo só no navegador de quem está testando (aparece uma faixa dourada "Modo demonstração").

1. No computador, rode `npm run dev` e abra <http://localhost:5173>.
2. Monte um pedido e finalize. Para testar o Pix, primeiro entre no painel e preencha uma chave Pix em Configurações.
3. Abra <http://localhost:5173/admin.html>, entre com qualquer e-mail e a senha **demo** e veja o pedido chegar.
4. Para recomeçar: Configurações → **Apagar dados de demonstração**.

Testes automáticos: `npm test` (na primeira vez: `npm install` e `npx playwright install chromium`).

## 8. Limitações conhecidas

- **O total é calculado no navegador do cliente.** Alguém mal-intencionado poderia alterar valores. A Larissa deve conferir o total de cada pedido no painel antes de confirmar.
- **Cartão (manual):** quando o cliente escolhe cartão, o pedido chega com o botão **Enviar link de pagamento**. Ele abre o WhatsApp do cliente com a mensagem e o total prontos; cole no fim o link gerado no app do Mercado Pago (Cobrar → Link de pagamento) e envie. Marque **Pago** quando o pagamento aparecer no Mercado Pago.
- **Melhoria futura:** Checkout Pro do Mercado Pago via servidor (uma pequena função, por exemplo Cloudflare Workers ou Firebase Functions, que gere o link e receba a confirmação automática do pagamento).
- **Pix:** o código é estático (copia e cola com valor). O banco não avisa o site quando o Pix cai; a Larissa confere o comprovante enviado pelo WhatsApp ou o extrato.
- **Fotos novas** enviadas pelo painel ficam guardadas dentro do próprio banco, reduzidas (até 400 px, ~120 KB), porque o Firebase Storage exige plano pago.
