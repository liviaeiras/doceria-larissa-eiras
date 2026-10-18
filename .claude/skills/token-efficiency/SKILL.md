---
name: token-efficiency
description: Working rules for doing tasks in this repo with minimal wasted context, tool calls and output while keeping quality. Use at the start of any non-trivial task in this project, or when asked to work efficiently.
---

# Token efficiency

Skill invocável: só entra no contexto quando chamada (ou quando o Claude decide que ela se aplica pela descrição). As regras permanentes e curtas ficam no CLAUDE.md; esta skill detalha.

## Inspeção
- Leia CLAUDE.md antes de mudar algo. Não releia o que já está no contexto.
- Localize com Grep/Glob antes de abrir arquivos; abra só o trecho necessário (offset/limit).
- Não explore `img/`, `.claude/skills/*/data/` nem `node_modules/`. Imagens só se a tarefa for visual.

## Implementação
- Reaproveite tokens de `css/base.css` e os padrões existentes; não crie novo framework, build ou dependência sem necessidade clara.
- Mudanças pequenas e direcionadas (Edit), sem reescrever código que funciona.
- Nada especulativo: sem features, abstrações ou arquivos que não foram pedidos.

## Execução
- Tarefa simples: faça direto. Tarefa grande: plano curto antes.
- Erro: ache a causa antes de mexer (skill `systematic-debugging`).
- Não repita a mesma verificação sem mudança no meio; reaproveite resultados.
- Rode os testes que cobrem o que mudou (`npm test`), não a suíte inteira por reflexo quando só um arquivo mudou e há teste específico.

## Respostas
- Curto: o que mudou, o que foi verificado, o que falta.
- Não colar arquivos inteiros nem logs longos; cite `arquivo:linha`.
- Não repetir explicações já dadas.

## Qualidade (não negociável)
- Nunca pular teste essencial, acessibilidade, segurança ou desempenho para economizar.
- Nunca dizer que um teste passou sem rodar; nunca esconder falha nem inventar resultado.
- Não apagar alterações do usuário.

## Contexto
- Carregue documentação extra (skills de design, guidelines) só quando a tarefa pedir.
- Não duplique aqui o que já está no CLAUDE.md; atualize o CLAUDE.md quando um fato do projeto mudar.
- Em sessões longas, use `/compact` com foco na tarefa atual ou `/clear` ao trocar de assunto.

## Limites conhecidos
- Esta skill é orientação, não um mecanismo: não reduz tokens sozinha nem roda automaticamente em toda tarefa.
