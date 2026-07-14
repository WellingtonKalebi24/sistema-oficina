# JO.IA - Sistema de Gestão para Oficina Automotiva

## What This Is

JO.IA é um sistema multiempresa de gestão para oficinas automotivas, construído para cobrir o fluxo operacional completo: cadastro do cliente e veículo, agenda, recepção, diagnóstico, orçamento, aprovação por link seguro, ordem de serviço, produção, estoque, financeiro, histórico, portal do cliente, relatórios e auditoria.

O produto será desenvolvido progressivamente como uma aplicação web comercializável, com frontend em React/Vite/TypeScript, backend em Node.js/Express/TypeScript, PostgreSQL, Prisma e Docker Compose. A prioridade é entregar um MVP funcional e seguro que opere uma oficina de ponta a ponta com dados reais.

## Core Value

Uma oficina consegue executar e auditar todo o ciclo de atendimento de um veículo, da entrada ao pagamento, com isolamento seguro por tenant e sem depender de comunicações automáticas com o cliente.

## Business Context

- **Customer**: Oficinas automotivas que precisam controlar operação, estoque, orçamento, OS e financeiro em um único sistema.
- **Revenue model**: Produto comercializável pela JO.IA, preparado para operação multiempresa.
- **Success metric**: Concluir o fluxo crítico do MVP com dados reais, permissões, auditoria, isolamento de tenant, backup e validações executáveis.
- **Strategy notes**: O escopo inicial está definido em `PROJETO.md`; mudanças relevantes exigem decisão registrada.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Estrutura técnica executável com frontend, backend, banco, Prisma, Docker, lint, type check, testes e documentação local.
- [ ] Autenticação, autorização, permissões granulares, refresh token e isolamento multiempresa por tenant.
- [ ] Cadastro e consulta de clientes, veículos e histórico básico com auditoria e exclusão lógica.
- [ ] Catálogo de serviços, produtos, fornecedores, compras, movimentações e reservas de estoque com transações.
- [ ] Agenda, check-in, checklist, fotos, anexos e registro de recepção do veículo.
- [ ] Diagnóstico e orçamento versionado com itens, cálculos, descontos autorizados, PDF e link seguro.
- [ ] Aprovação pública do orçamento por token seguro, vinculada à versão exata e sem envio automático de mensagens.
- [ ] Ordem de serviço com snapshots, status, tarefas, produção, uso de peças e auditoria.
- [ ] Financeiro com pagamentos, contas, caixa, despesas, estornos, comissões e integridade transacional.
- [ ] Dashboard, histórico do veículo, portal do cliente, relatórios essenciais, auditoria administrativa e preparação para produção.

### Out of Scope

- Notificações automáticas ao cliente - explicitamente proibidas para o MVP e para versões futuras enquanto esta decisão não for alterada.
- Integração automática com WhatsApp, e-mail, SMS ou push - o sistema apenas disponibiliza PDF, impressão e link para cópia manual.
- Central de notificações interna ou externa - alertas visuais calculados são permitidos, mas não registros persistentes de notificação.
- Entidades `Notification`, `NotificationTemplate`, `NotificationPreference`, `MessageQueue`, `WhatsAppIntegration` e `EmailIntegration` - proibidas por requisito do produto.
- Implementação monolítica do sistema inteiro em uma única fase - proibida; o projeto deve avançar por fases pequenas e verificáveis.

## Context

- O projeto começou como greenfield em `E:\sistema_oficina2`, com `PROJETO.md` como especificação inicial.
- A metodologia permitida é GSD. BMAD, story points, cerimônias ágeis obrigatórias e divisão artificial por metodologia são proibidos.
- O sistema precisa ser original, funcional, seguro, consistente, auditável, multiempresa, preparado para produção e comercializável pela JO.IA.
- Todas as operações operacionais devem respeitar `tenant_id`; isolamento não pode depender apenas do frontend.
- Toda fase que introduzir registros operacionais deve incluir teste de isolamento entre tenants.
- Operações críticas de orçamento, estoque, OS e financeiro devem usar transações de banco.
- Auditoria é requisito transversal para autenticação, permissões, clientes, veículos, estoque, orçamento, aprovação, OS, financeiro, exportações e administração.
- O portal do cliente pode existir, mas não pode expor dados internos nem possuir notificações.
- Antes das principais telas, deve existir contrato visual da JO.IA cobrindo paleta, tipografia, componentes, estados, responsividade e acessibilidade mínima.

## Constraints

- **Tech stack**: React, Vite, TypeScript, Node.js, Express, TypeScript, PostgreSQL, Prisma e Docker Compose - mudanças exigem justificativa técnica e decisão registrada.
- **Security**: Autorização deve ser aplicada no backend; esconder botões no frontend não substitui validação.
- **Tenancy**: Todos os registros operacionais devem ser filtrados e validados pelo tenant autenticado.
- **Communications**: O sistema não envia mensagens, não abre WhatsApp automaticamente e não registra entrega/leitura de comunicações.
- **Data integrity**: Estoque, orçamento, OS e financeiro precisam de transações para evitar estados parciais.
- **Auditability**: Ações críticas devem registrar tenant, usuário, ação, entidade, registro, data/hora e valores relevantes sem armazenar segredos.
- **Quality**: Fases não podem ser concluídas com lint, type check, testes, migrations ou validações críticas falhando.
- **Validation**: Arquivos existentes, telas visíveis ou endpoints criados não provam conclusão; cada fase precisa de verificação executável.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Usar GSD como fluxo de planejamento e execução | O documento inicial exige planejamento persistente, fases verificáveis e estado entre sessões | Pending |
| Tratar o projeto como greenfield | O diretório não continha código existente nem `.planning/` | Pending |
| Usar stack React/Vite/TypeScript + Node/Express/TypeScript + PostgreSQL/Prisma/Docker | Stack definida na especificação inicial | Pending |
| Proibir notificações e integrações automáticas de comunicação | Restrição explícita do produto para evitar escopo e responsabilidades de envio | Pending |
| Estruturar fases em modo MVP vertical | O objetivo é obter um sistema operável de ponta a ponta progressivamente | Pending |
| Manter docs de planejamento versionados no git | `commit_docs` recomendado em auto mode | Pending |

## Evolution

After each phase transition:
1. Move validated requirements to Validated with phase reference.
2. Move descoped or invalidated requirements to Out of Scope with reason.
3. Add newly discovered requirements to Active only when approved.
4. Record decisions that affect scope, security, architecture, database or business rules.
5. Update this document if the product description drifts.

After each milestone:
1. Recheck Core Value.
2. Review Business Context.
3. Audit Out of Scope boundaries.
4. Update Context with current state, feedback, metrics and known issues.

---
*Last updated: 2026-07-14 after initial GSD project initialization*
