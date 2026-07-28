# Phase 6: Diagnóstico e Orçamento - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-28T13:30:00-03:00
**Phase:** 6-Diagnóstico e Orçamento
**Areas discussed:** Fluxo diagnóstico -> orçamento, Itens e valores do orçamento, Versões e bloqueios, PDF e link manual

---

## Fluxo diagnóstico -> orçamento

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Como deve começar o orçamento? | A partir do check-in; A partir de cliente/veículo direto; Os dois caminhos; Outro | Os dois caminhos |
| O diagnóstico deve ser obrigatório antes de publicar o orçamento? | Sim, sempre obrigatório; Obrigatório só quando veio do check-in; Não obrigatório; Outro | Obrigatório só quando veio do check-in |
| O que o diagnóstico deve guardar? | Problema + recomendação; Problema + causa + recomendação; Lista por item diagnosticado; Outro | Problema + causa + recomendação |
| Quem pode preencher ou alterar o diagnóstico? | Qualquer usuário com permissão de orçamento; Permissão separada para diagnóstico; Somente admin ou responsável técnico; Outro | Qualquer usuário com permissão de orçamento |

**Notes:** The user chose the flexible path: diagnosis is required for check-in-originated quotes but optional for direct customer/vehicle quotes.

---

## Itens e valores do orçamento

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Como montar os itens do orçamento? | Serviços e peças separados; Tudo em uma lista única; Lista única com agrupamento visual; Outro | Lista única com agrupamento visual |
| Como aplicar desconto e acréscimo? | Só no total; Por item e no total; Só por item; Outro | Por item e no total |
| Qual regra para desconto acima do limite? | Bloquear sem permissão; Permitir salvar rascunho, bloquear publicação; Apenas alertar; Outro | Apenas alertar |
| Registrar mesmo divergindo do requisito original? | Sim, apenas alertar; Não, bloquear por permissão; Meio termo | Sim, apenas alertar |
| Como validade e prazo funcionam? | Validade obrigatória, prazo opcional; Os dois obrigatórios; Os dois opcionais; Outro | Validade obrigatória, prazo opcional |

**Notes:** The user explicitly approved changing QTE-06 behavior from permission block to warning-only.

---

## Versões e bloqueios

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Quando o orçamento vira versão publicada? | Botão Publicar versão; Automaticamente ao gerar PDF/link; Ao salvar pela primeira vez; Outro | Botão Publicar versão |
| Depois de publicada, o que pode mudar? | Nada muda; Só dados não comerciais; Pode corrigir com auditoria; Outro | Só dados não comerciais |
| Como criar nova versão? | Copiar a versão publicada anterior; Começar vazio; Escolher origem; Outro | Copiar a versão publicada anterior |
| Quais status devem existir? | Rascunho/Publicado/Expirado/Cancelado; Rascunho/Publicado/Enviado/Expirado/Cancelado; Rascunho/Publicado/Aprovado/Recusado/Expirado/Cancelado; Outro | Incluir Enviado |
| Qual rótulo evita conflito com comunicação automática? | Entregue manualmente; Enviado manual documentado; Sem status de entrega | Enviado manual documentado |

**Notes:** `Enviado` is a manual status only. It must not imply automatic communication or delivery/read tracking.

---

## PDF e link manual

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| O que deve aparecer no PDF para o cliente? | Resumo comercial; Resumo comercial + diagnóstico; Completo com histórico interno; Outro | Resumo comercial + diagnóstico |
| Quando gerar o link seguro? | Só depois de publicar versão; Pode gerar em rascunho; Gerar junto com PDF; Outro | Gerar junto com PDF |
| Resolver conflito com publicação manual? | Publicar primeiro, depois gerar PDF/link; Gerar PDF/link publica automaticamente; PDF rascunho, link publicado | Publicar primeiro, depois gerar PDF/link |
| Como o usuário acessa/entrega o link? | Botão copiar link + botão imprimir/PDF; Campo com link visível; QR code no PDF; Outro | Botão copiar link + botão imprimir/PDF |
| O que o sistema não deve mostrar ao cliente? | Custos internos, margem, fornecedor e observações internas; Só custos e margem; Mostrar tudo; Outro | Custos internos, margem, fornecedor e observações internas |

**Notes:** The user resolved the temporary conflict by preserving explicit publication before PDF/link generation.

---

## The Agent's Discretion

- Exact data model, endpoint names, permission key names, PDF library and UI decomposition are left to planning/execution as long as the captured decisions are preserved.

## Deferred Ideas

- Public approval flow remains deferred to Phase 7.
