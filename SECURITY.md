# Política de segurança

## Como relatar uma vulnerabilidade

Se você encontrou uma falha de segurança neste site (por exemplo, acesso indevido a pedidos ou ao painel), **não abra uma issue pública**.

Use o recurso **"Report a vulnerability"** (Security Advisories privados) na aba *Security* deste repositório no GitHub.

> **Pendente:** o responsável pelo projeto precisa ativar o *Private vulnerability reporting* nas configurações do repositório (Settings → Security). Ainda não há e-mail de segurança definido; se for criado, adicione-o aqui.

Inclua, se possível: o que você encontrou, como reproduzir e o impacto. Responderemos assim que possível.

## Escopo

- Site público e loja (páginas HTML/JS deste repositório).
- Painel administrativo e regras do banco de dados (Firestore).

Fora do escopo: serviços de terceiros (Firebase, InfinitePay, GitHub Pages, 99Food), que têm canais próprios.

## Observações

Este documento trata só da comunicação de vulnerabilidades. As regras de segurança seguidas no desenvolvimento estão no `CLAUDE.md` e nas regras do Firestore (`firestore.rules`): leitura pública só de `loja/config` e `produtos`; pedidos são criados por visitantes com validação de campos e só administradoras (documento em `admins/<uid>`) leem e alteram pedidos, cardápio e configurações.
