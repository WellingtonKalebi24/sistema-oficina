# Roadmap: JO.IA - Sistema de Gestão para Oficina Automotiva

**Created:** 2026-07-14
**Project mode:** Vertical MVP
**Requirements covered:** 115/115

## Phase Overview

| # | Phase | Goal | Requirements | UI hint |
|---|-------|------|--------------|---------|
| 1 | Fundação Técnica e Contrato Visual | 1/3 | In Progress|  |
| 2 | Autenticação, Tenant e Permissões | 6/6 | Complete   | 2026-07-19 |
| 3 | Clientes e Veículos | 3/3 | Complete   | 2026-07-21 |
| 4 | Serviços, Produtos, Compras e Estoque | 1/4 | In Progress|  |
| 5 | Agenda e Recepção | Cobrir agendamento, check-in, checklist e anexos | REC-01..REC-08 | yes |
| 6 | Diagnóstico e Orçamento | Criar orçamento versionado com cálculo, PDF e link manual | QTE-01..QTE-11 | yes |
| 7 | Aprovação Pública Segura | Permitir decisão do cliente por token vinculado à versão exata | QTE-12..QTE-18 | yes |
| 8 | Ordem de Serviço | Converter orçamento aprovado em OS auditável e transacional | WOP-01..WOP-08, WOP-12..WOP-14 | yes |
| 9 | Produção e Tarefas | Organizar execução operacional em quadro de tarefas | WOP-09..WOP-11 | yes |
| 10 | Financeiro | Registrar recebimentos, obrigações, caixa e estornos | FIN-01..FIN-15 | yes |
| 11 | Dashboard, Histórico e Portal | Consolidar dados operacionais e consultas seguras | DPR-01..DPR-05 | yes |
| 12 | Relatórios e Produção | Preparar relatórios, auditoria final, backup, testes e deploy | DPR-06..DPR-11 | yes |

## Phases

### Phase 1: Fundação Técnica e Contrato Visual

**Goal:** Criar uma base técnica executável, testável e preparada para evolução, com contrato visual mínimo da JO.IA antes das telas principais.
**Mode:** mvp
**Requirements:** FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, FND-08, VUX-01, VUX-02, VUX-03, VUX-04, VUX-05
**UI hint:** yes
**Plans:** 3/3 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Gated npm workspace scaffold and RED walking-skeleton contract.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Prisma, PostgreSQL, Express health, error/logging and foundation write/read API.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Web UI interaction, Docker web service, local docs, visual contract and SKELETON.md.

**Scope**

- Estrutura de frontend, backend e banco.
- Docker Compose com PostgreSQL.
- Prisma, migrations e seed controlado.
- Health check, tratamento global de erros e logs estruturados.
- Lint, formatação, type check, testes e documentação local.
- Contrato visual JO.IA cobrindo paleta, tipografia, espaçamento, componentes, estados, acessibilidade e formatos de data/moeda.

**Dependencies**

- Nenhuma fase anterior.

**Risks**

- Escolher estrutura que dificulte módulos posteriores.
- Criar UI sem contrato visual e gerar inconsistência futura.
- Seed ou ambiente local depender de configuração manual não documentada.

**Success Criteria**

1. O projeto sobe localmente com Docker Compose.
2. Frontend abre, API responde health check e API conecta ao PostgreSQL.
3. Migration inicial executa em banco limpo.
4. Lint, type check e testes iniciais passam.
5. Contrato visual está documentado e pronto para guiar as próximas telas.

### Phase 2: Autenticação, Tenant e Permissões

**Goal:** Garantir acesso seguro, configuração da oficina e isolamento entre empresas.
**Mode:** mvp
**Requirements:** IDT-01, IDT-02, IDT-03, IDT-04, IDT-05, IDT-06, IDT-07, IDT-08, IDT-09, IDT-10, IDT-11, IDT-12, IDT-13
**UI hint:** yes
**Plans:** 6/6 plans complete

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Package legitimacy checkpoint and approved auth/admin dependency installation.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Identity, tenant, session, permission and audit schema with RED auth fixture tests.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Bootstrap, login, browser-managed opaque refresh sessions, current-session logout and current-user API.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — Password reset, change password, EmailSender adapter, sanitized auth audit and requireAuth middleware.

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 02-05-PLAN.md — Permission resolver, tenant scope helpers, admin routes, backend authorization, tenant isolation and audit.

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 02-06-PLAN.md — Authenticated admin UI, visual-contract compliance, local setup updates and final phase verification.

**Scope**

- `Tenant`, `CompanySetting`, usuários, roles, permissões e permissões específicas.
- Login, refresh token, logout, recuperação de senha e troca de senha.
- Proteção de rotas, autorização backend e auditoria de acesso/permissões.
- Testes de isolamento entre tenants.

**Dependencies**

- Phase 1.

**Risks**

- Autorização ficar apenas no frontend.
- Tokens não serem invalidados corretamente.
- Consultas sem filtro de tenant.

**Success Criteria**

1. Administrador consegue entrar e configurar a oficina.
2. Usuário sem permissão recebe bloqueio adequado no backend.
3. Usuário de um tenant não acessa dados de outro.
4. Refresh token e logout invalidam sessões de forma segura.
5. Eventos relevantes de acesso e permissões são auditados.

### Phase 3: Clientes e Veículos

**Goal:** Permitir gestão segura da base de clientes e veículos da oficina.
**Mode:** mvp
**Requirements:** CAV-01, CAV-02, CAV-03, CAV-04, CAV-05, CAV-06, CAV-07, CAV-08, CAV-09
**UI hint:** yes
**Plans:** 3/3 plans complete

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Customer/vehicle schema, permissions, tenant helpers and RED backend contracts.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — Protected tenant-scoped customer/vehicle API routes, services, audit, history and isolation.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-03-PLAN.md — Authenticated customer/vehicle UI, setup notes and final Phase 3 verification. (completed 2026-07-21)

**Scope**

- Cadastro, edição, listagem, busca e exclusão lógica de clientes e veículos.
- Relacionamento cliente-veículo.
- Busca por nome, telefone, documento, placa e cliente relacionado.
- Histórico básico, validações de duplicidade e auditoria.

**Dependencies**

- Phase 2.

**Risks**

- Excluir logicamente um registro e quebrar histórico.
- Permitir vínculo com cliente ou veículo de outro tenant.
- Falta de auditoria em dados sensíveis.

**Success Criteria**

1. Usuário cadastra cliente e veículo e relaciona ambos.
2. Usuário encontra registros por diferentes campos.
3. Duplicidades configuradas são bloqueadas.
4. Exclusão lógica preserva registros relacionados.
5. Testes comprovam bloqueio de acesso entre tenants.

### Phase 4: Serviços, Produtos, Compras e Estoque

**Goal:** Disponibilizar recursos de precificação e controle transacional de peças.
**Mode:** mvp
**Requirements:** STK-01, STK-02, STK-03, STK-04, STK-05, STK-06, STK-07, STK-08, STK-09, STK-10, STK-11, STK-12, STK-13, STK-14
**UI hint:** yes
**Plans:** 1/4 plans executed

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Tenant-scoped catalog schema, permissions, service/product/supplier APIs and RED contracts.

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 04-02-PLAN.md — Transactional purchases, stock entries/exits/adjustments, movement history and concurrency safety.

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 04-03-PLAN.md — Reservations and cancellation semantics with availability-safe transactions.

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 04-04-PLAN.md — Authenticated Estoque UI, stock web client and final Phase 4 verification.

**Scope**

- Catálogo de serviços.
- Produtos, categorias, fornecedores, compras e itens de compra.
- Entrada, saída, ajuste autorizado, reserva e cancelamento de reserva.
- Estoque mínimo, alertas visuais, histórico de movimentações e rastreabilidade.

**Dependencies**

- Phase 2.
- Phase 3 for future links to vehicles/customers is useful but not strictly required for catalog setup.

**Risks**

- Corrida de concorrência alterar saldo incorretamente.
- Reserva afetar saldo físico em vez de disponibilidade.
- Ajuste sem permissão ou sem auditoria.

**Success Criteria**

1. Entrada de compra aumenta saldo via movimento transacional.
2. Saída reduz saldo com origem rastreável.
3. Reserva e cancelamento alteram disponibilidade sem corromper saldo físico.
4. Ajuste exige permissão e registra auditoria.
5. Operações concorrentes não produzem saldos negativos ou incorretos.

### Phase 5: Agenda e Recepção

**Goal:** Cobrir o agendamento e a entrada física do veículo na oficina.
**Mode:** mvp
**Requirements:** REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07, REC-08
**UI hint:** yes

**Scope**

- Agenda diária e semanal.
- Criação e edição de agendamentos.
- Check-in vinculado a cliente e veículo.
- Checklist de entrada, quilometragem, combustível, avarias, fotos, anexos e itens deixados.

**Dependencies**

- Phase 2.
- Phase 3.

**Risks**

- Anexos sem isolamento de tenant.
- Check-in sem vínculo rastreável ao cliente/veículo.
- Dados de recepção não auditados.

**Success Criteria**

1. Usuário cria agendamento e visualiza na agenda.
2. Usuário realiza check-in vinculado ao cliente e veículo.
3. Checklist, fotos, quilometragem, combustível e avarias ficam consultáveis.
4. Anexos respeitam tenant.
5. Alterações relevantes são auditadas.

### Phase 6: Diagnóstico e Orçamento

**Goal:** Transformar diagnóstico técnico em proposta comercial versionada, calculada e compartilhável manualmente.
**Mode:** mvp
**Requirements:** QTE-01, QTE-02, QTE-03, QTE-04, QTE-05, QTE-06, QTE-07, QTE-08, QTE-09, QTE-10, QTE-11
**UI hint:** yes

**Scope**

- Diagnóstico, serviços e peças recomendadas.
- Orçamento em rascunho com itens de serviço/produto, desconto, acréscimo, validade e prazo.
- Cálculo de subtotal e total.
- Publicação de versão imutável, nova versão, PDF, impressão e cópia manual do link seguro.

**Dependencies**

- Phase 3.
- Phase 4.
- Phase 5.

**Risks**

- Alterar versão publicada em vez de criar nova.
- Desconto sem permissão.
- PDF divergente do orçamento persistido.
- Introduzir botões de envio automático proibidos.

**Success Criteria**

1. Usuário cria diagnóstico e orçamento com serviços e peças.
2. Totais, descontos e acréscimos são calculados corretamente.
3. Desconto acima do limite exige permissão.
4. Versão publicada fica imutável e nova versão preserva a anterior.
5. PDF e link podem ser gerados para entrega manual, sem envio automático.

### Phase 7: Aprovação Pública Segura

**Goal:** Permitir que o cliente consulte e decida sobre uma versão exata do orçamento por token seguro.
**Mode:** mvp
**Requirements:** QTE-12, QTE-13, QTE-14, QTE-15, QTE-16, QTE-17, QTE-18
**UI hint:** yes

**Scope**

- Página pública por token.
- Visualização apenas de dados autorizados.
- Aprovação total, aprovação parcial, recusa, observação e confirmação de nome.
- Registro de visualização, decisão, itens aprovados/recusados, IP/user agent quando permitido e auditoria.

**Dependencies**

- Phase 6.

**Risks**

- Token previsível ou vazando existência de registros.
- Aprovação não vinculada à versão exata.
- Exposição de dados internos, custos, margem ou fornecedores.

**Success Criteria**

1. Token válido exibe somente a versão e os dados autorizados.
2. Token inválido, expirado ou incorreto não revela informações protegidas.
3. Cliente aprova todos, aprova parcialmente ou recusa.
4. Decisão fica vinculada à versão exata.
5. Dados técnicos e auditoria são registrados sem armazenar segredos.

### Phase 8: Ordem de Serviço

**Goal:** Controlar formalmente a execução dos trabalhos autorizados com snapshots, status e consumo de peças.
**Mode:** mvp
**Requirements:** WOP-01, WOP-02, WOP-03, WOP-04, WOP-05, WOP-06, WOP-07, WOP-08, WOP-12, WOP-13, WOP-14
**UI hint:** yes

**Scope**

- Conversão transacional de orçamento aprovado em OS.
- Itens com snapshots de descrições e preços.
- Status, histórico, responsáveis, prazos, fotos e anexos.
- Regras de finalização, reabertura autorizada, utilização de peças e auditoria.

**Dependencies**

- Phase 7.
- Phase 4.

**Risks**

- Converter itens recusados.
- Usar preços mutáveis do catálogo.
- Consumir peças sem transação.
- Reabrir OS sem autorização.

**Success Criteria**

1. Orçamento aprovado gera OS apenas com itens aprovados.
2. Descrições e preços permanecem preservados após alterações no catálogo.
3. Transições inválidas são bloqueadas.
4. Reabertura exige permissão.
5. Uso de peças atualiza estoque corretamente e registra auditoria.

### Phase 9: Produção e Tarefas

**Goal:** Organizar a execução operacional da ordem de serviço em tarefas e quadro de produção.
**Mode:** mvp
**Requirements:** WOP-09, WOP-10, WOP-11
**UI hint:** yes

**Scope**

- Tarefas da OS, responsável, prioridade, prazo, tempo estimado e ordenação.
- Quadro Kanban, alteração de status e identificação de atrasos.
- Regras de autorização e histórico relevante.

**Dependencies**

- Phase 8.

**Risks**

- Quadro refletir estado visual diferente do persistido.
- Transição sem permissão.
- Alertas virarem notificações persistentes.

**Success Criteria**

1. Usuário cria tarefa e atribui responsável.
2. Usuário altera status e o quadro reflete a mudança.
3. Transição sem permissão é bloqueada.
4. Tarefas atrasadas são identificadas por cálculo.
5. Histórico relevante é preservado.

### Phase 10: Financeiro

**Goal:** Registrar recebimentos, obrigações, despesas e movimentações de caixa com integridade.
**Mode:** mvp
**Requirements:** FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08, FIN-09, FIN-10, FIN-11, FIN-12, FIN-13, FIN-14, FIN-15
**UI hint:** yes

**Scope**

- Categorias financeiras, contas a receber, contas a pagar, despesas e comissões.
- Pagamentos integrais/parciais, parcelamento, estorno, caixa e movimentos de caixa.
- Situação financeira da OS, fluxo de caixa e alertas visuais de vencimento.

**Dependencies**

- Phase 8.

**Risks**

- Pagamentos e movimentos de caixa divergirem.
- Estorno apagar histórico em vez de gerar movimento inverso.
- Operações financeiras sem transação.

**Success Criteria**

1. Pagamento parcial atualiza saldo pendente.
2. Pagamento integral liquida a obrigação.
3. Estorno exige autorização e gera movimento inverso rastreável.
4. Totais do caixa correspondem às movimentações.
5. Operações críticas usam transações e são auditadas.

### Phase 11: Dashboard, Histórico e Portal

**Goal:** Consolidar informações operacionais e disponibilizar consultas seguras para oficina e cliente.
**Mode:** mvp
**Requirements:** DPR-01, DPR-02, DPR-03, DPR-04, DPR-05
**UI hint:** yes

**Scope**

- Dashboard com OS abertas, produção, orçamentos, estoque, agenda, pagamentos, despesas e faturamento.
- Alertas visuais calculados.
- Histórico completo do veículo.
- Portal do cliente com dados autorizados e sem notificações.

**Dependencies**

- Phase 10.

**Risks**

- Dashboard usar dados estáticos.
- Portal expor custos internos, margens, fornecedores ou dados de outro cliente.
- Alertas visuais se transformarem em central de notificações.

**Success Criteria**

1. Dashboard apresenta dados reais.
2. Alertas são calculados sem criar registros de notificação.
3. Histórico do veículo consolida registros relacionados.
4. Cliente acessa apenas os próprios dados autorizados.
5. Informações internas não aparecem no portal.

### Phase 12: Relatórios e Produção

**Goal:** Preparar a aplicação para operação real com relatórios, auditoria final, testes críticos, backup e documentação.
**Mode:** mvp
**Requirements:** DPR-06, DPR-07, DPR-08, DPR-09, DPR-10, DPR-11
**UI hint:** yes

**Scope**

- Relatórios essenciais e exportações.
- Auditoria administrativa.
- Revisão de segurança e isolamento entre tenants.
- Testes de integração e end-to-end dos fluxos críticos.
- Backup, restauração testada, observabilidade, variáveis de ambiente, deploy e documentação.

**Dependencies**

- Phase 11.

**Risks**

- Relatórios ignorarem filtros de tenant.
- Backup não restaurar.
- Fluxo crítico não ser validado com dados reais.
- Variáveis de produção ficarem implícitas ou inseguras.

**Success Criteria**

1. Relatórios apresentam dados corretos e respeitam tenant.
2. Exportações respeitam filtros e isolamento.
3. Backup pode ser restaurado em ambiente controlado.
4. Fluxos críticos do MVP passam em ambiente próximo de produção.
5. Documentação permite instalação, operação e validação do sistema.

## Global MVP Completion

The MVP is complete only when a real-data flow can prove:

1. Login, office setup, users, roles and permissions.
2. Customer, vehicle, appointment, check-in and attachments.
3. Diagnosis, services, products, supplier, stock entry and quote.
4. Quote PDF, manual link copy, public approval, partial approval and refusal.
5. Work order conversion, production tasks, stock usage and OS finalization/reopening.
6. Payments, expenses, accounts payable/receivable and cash.
7. Dashboard, vehicle history, portal, reports and audit logs.
8. Tenant isolation, backup, restore and critical automated tests.

Automatic customer communications are not part of MVP completion.

## Verification Strategy

- Every phase must run lint, type check and relevant automated tests.
- Phases that introduce tenant data must include cross-tenant access tests.
- Phases involving stock, quote, OS or finance must include transaction-focused tests.
- UI phases must be checked against the visual contract.
- Completion claims must reference executable verification, not just created files.

---
*Roadmap created: 2026-07-14*
*Last updated: 2026-07-14 after initial GSD roadmap generation*
