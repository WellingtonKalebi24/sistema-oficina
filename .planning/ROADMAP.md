# Roadmap: JO.IA - Sistema de GestÃ£o para Oficina Automotiva

**Created:** 2026-07-14
**Project mode:** Vertical MVP
**Requirements covered:** 115/115

## Phase Overview

| # | Phase | Goal | Requirements | UI hint |
|---|-------|------|--------------|---------|
| 1 | FundaÃ§Ã£o TÃ©cnica e Contrato Visual | 1/3 | In Progress|  |
| 2 | AutenticaÃ§Ã£o, Tenant e PermissÃµes | 6/6 | Complete   | 2026-07-19 |
| 3 | Clientes e VeÃ­culos | 3/3 | Complete   | 2026-07-21 |
| 4 | ServiÃ§os, Produtos, Compras e Estoque | 4/4 | Complete   | 2026-07-22 |
| 5 | Agenda e RecepÃ§Ã£o | 10/10 | Complete    | 2026-07-28 |
| 6 | DiagnÃ³stico e OrÃ§amento | 4/4 | Complete   | 2026-07-28 |
| 7 | AprovaÃ§Ã£o PÃºblica Segura | Permitir decisÃ£o do cliente por token vinculado Ã  versÃ£o exata | QTE-12..QTE-18 | yes |
| 8 | Ordem de ServiÃ§o | Converter orÃ§amento aprovado em OS auditÃ¡vel e transacional | WOP-01..WOP-08, WOP-12..WOP-14 | yes |
| 9 | ProduÃ§Ã£o e Tarefas | Organizar execuÃ§Ã£o operacional em quadro de tarefas | WOP-09..WOP-11 | yes |
| 10 | Financeiro | Registrar recebimentos, obrigaÃ§Ãµes, caixa e estornos | FIN-01..FIN-15 | yes |
| 11 | Dashboard, HistÃ³rico e Portal | Consolidar dados operacionais e consultas seguras | DPR-01..DPR-05 | yes |
| 12 | RelatÃ³rios e ProduÃ§Ã£o | Preparar relatÃ³rios, auditoria final, backup, testes e deploy | DPR-06..DPR-11 | yes |

## Phases

### Phase 1: FundaÃ§Ã£o TÃ©cnica e Contrato Visual

**Goal:** Criar uma base tÃ©cnica executÃ¡vel, testÃ¡vel e preparada para evoluÃ§Ã£o, com contrato visual mÃ­nimo da JO.IA antes das telas principais.
**Mode:** mvp
**Requirements:** FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, FND-08, VUX-01, VUX-02, VUX-03, VUX-04, VUX-05
**UI hint:** yes
**Plans:** 3/3 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md â€” Gated npm workspace scaffold and RED walking-skeleton contract.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md â€” Prisma, PostgreSQL, Express health, error/logging and foundation write/read API.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md â€” Web UI interaction, Docker web service, local docs, visual contract and SKELETON.md.

**Scope**

- Estrutura de frontend, backend e banco.
- Docker Compose com PostgreSQL.
- Prisma, migrations e seed controlado.
- Health check, tratamento global de erros e logs estruturados.
- Lint, formataÃ§Ã£o, type check, testes e documentaÃ§Ã£o local.
- Contrato visual JO.IA cobrindo paleta, tipografia, espaÃ§amento, componentes, estados, acessibilidade e formatos de data/moeda.

**Dependencies**

- Nenhuma fase anterior.

**Risks**

- Escolher estrutura que dificulte mÃ³dulos posteriores.
- Criar UI sem contrato visual e gerar inconsistÃªncia futura.
- Seed ou ambiente local depender de configuraÃ§Ã£o manual nÃ£o documentada.

**Success Criteria**

1. O projeto sobe localmente com Docker Compose.
2. Frontend abre, API responde health check e API conecta ao PostgreSQL.
3. Migration inicial executa em banco limpo.
4. Lint, type check e testes iniciais passam.
5. Contrato visual estÃ¡ documentado e pronto para guiar as prÃ³ximas telas.

### Phase 2: AutenticaÃ§Ã£o, Tenant e PermissÃµes

**Goal:** Garantir acesso seguro, configuraÃ§Ã£o da oficina e isolamento entre empresas.
**Mode:** mvp
**Requirements:** IDT-01, IDT-02, IDT-03, IDT-04, IDT-05, IDT-06, IDT-07, IDT-08, IDT-09, IDT-10, IDT-11, IDT-12, IDT-13
**UI hint:** yes
**Plans:** 6/6 plans complete

Plans:
**Wave 1**

- [x] 02-01-PLAN.md â€” Package legitimacy checkpoint and approved auth/admin dependency installation.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md â€” Identity, tenant, session, permission and audit schema with RED auth fixture tests.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md â€” Bootstrap, login, browser-managed opaque refresh sessions, current-session logout and current-user API.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md â€” Password reset, change password, EmailSender adapter, sanitized auth audit and requireAuth middleware.

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 02-05-PLAN.md â€” Permission resolver, tenant scope helpers, admin routes, backend authorization, tenant isolation and audit.

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 02-06-PLAN.md â€” Authenticated admin UI, visual-contract compliance, local setup updates and final phase verification.

**Scope**

- `Tenant`, `CompanySetting`, usuÃ¡rios, roles, permissÃµes e permissÃµes especÃ­ficas.
- Login, refresh token, logout, recuperaÃ§Ã£o de senha e troca de senha.
- ProteÃ§Ã£o de rotas, autorizaÃ§Ã£o backend e auditoria de acesso/permissÃµes.
- Testes de isolamento entre tenants.

**Dependencies**

- Phase 1.

**Risks**

- AutorizaÃ§Ã£o ficar apenas no frontend.
- Tokens nÃ£o serem invalidados corretamente.
- Consultas sem filtro de tenant.

**Success Criteria**

1. Administrador consegue entrar e configurar a oficina.
2. UsuÃ¡rio sem permissÃ£o recebe bloqueio adequado no backend.
3. UsuÃ¡rio de um tenant nÃ£o acessa dados de outro.
4. Refresh token e logout invalidam sessÃµes de forma segura.
5. Eventos relevantes de acesso e permissÃµes sÃ£o auditados.

### Phase 3: Clientes e VeÃ­culos

**Goal:** Permitir gestÃ£o segura da base de clientes e veÃ­culos da oficina.
**Mode:** mvp
**Requirements:** CAV-01, CAV-02, CAV-03, CAV-04, CAV-05, CAV-06, CAV-07, CAV-08, CAV-09
**UI hint:** yes
**Plans:** 3/3 plans complete

Plans:
**Wave 1**

- [x] 03-01-PLAN.md â€” Customer/vehicle schema, permissions, tenant helpers and RED backend contracts.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md â€” Protected tenant-scoped customer/vehicle API routes, services, audit, history and isolation.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-03-PLAN.md â€” Authenticated customer/vehicle UI, setup notes and final Phase 3 verification. (completed 2026-07-21)

**Scope**

- Cadastro, ediÃ§Ã£o, listagem, busca e exclusÃ£o lÃ³gica de clientes e veÃ­culos.
- Relacionamento cliente-veÃ­culo.
- Busca por nome, telefone, documento, placa e cliente relacionado.
- HistÃ³rico bÃ¡sico, validaÃ§Ãµes de duplicidade e auditoria.

**Dependencies**

- Phase 2.

**Risks**

- Excluir logicamente um registro e quebrar histÃ³rico.
- Permitir vÃ­nculo com cliente ou veÃ­culo de outro tenant.
- Falta de auditoria em dados sensÃ­veis.

**Success Criteria**

1. UsuÃ¡rio cadastra cliente e veÃ­culo e relaciona ambos.
2. UsuÃ¡rio encontra registros por diferentes campos.
3. Duplicidades configuradas sÃ£o bloqueadas.
4. ExclusÃ£o lÃ³gica preserva registros relacionados.
5. Testes comprovam bloqueio de acesso entre tenants.

### Phase 4: ServiÃ§os, Produtos, Compras e Estoque

**Goal:** Disponibilizar recursos de precificaÃ§Ã£o e controle transacional de peÃ§as.
**Mode:** mvp
**Requirements:** STK-01, STK-02, STK-03, STK-04, STK-05, STK-06, STK-07, STK-08, STK-09, STK-10, STK-11, STK-12, STK-13, STK-14
**UI hint:** yes
**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 04-01-PLAN.md â€” Tenant-scoped catalog schema, permissions, service/product/supplier APIs and RED contracts.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md â€” Transactional purchases, stock entries/exits/adjustments, movement history and concurrency safety.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-03-PLAN.md â€” Reservations and cancellation semantics with availability-safe transactions.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-04-PLAN.md â€” Authenticated Estoque UI, stock web client and final Phase 4 verification. (completed 2026-07-22)

**Scope**

- CatÃ¡logo de serviÃ§os.
- Produtos, categorias, fornecedores, compras e itens de compra.
- Entrada, saÃ­da, ajuste autorizado, reserva e cancelamento de reserva.
- Estoque mÃ­nimo, alertas visuais, histÃ³rico de movimentaÃ§Ãµes e rastreabilidade.

**Dependencies**

- Phase 2.
- Phase 3 for future links to vehicles/customers is useful but not strictly required for catalog setup.

**Risks**

- Corrida de concorrÃªncia alterar saldo incorretamente.
- Reserva afetar saldo fÃ­sico em vez de disponibilidade.
- Ajuste sem permissÃ£o ou sem auditoria.

**Success Criteria**

1. Entrada de compra aumenta saldo via movimento transacional.
2. SaÃ­da reduz saldo com origem rastreÃ¡vel.
3. Reserva e cancelamento alteram disponibilidade sem corromper saldo fÃ­sico.
4. Ajuste exige permissÃ£o e registra auditoria.
5. OperaÃ§Ãµes concorrentes nÃ£o produzem saldos negativos ou incorretos.

### Phase 5: Agenda e RecepÃ§Ã£o

**Goal:** Cobrir o agendamento e a entrada fÃ­sica do veÃ­culo na oficina.
**Mode:** mvp
**Requirements:** REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07, REC-08
**UI hint:** yes
**Plans:** 10/10 plans complete

Plans:
**Wave 1**

- [x] 05-01-PLAN.md â€” Schema, permissoes e contratos RED de agendamentos tenant-scoped.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md â€” API protegida de agenda com CRUD, listagem diaria/semanal, tenant isolation e auditoria.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-03-PLAN.md â€” UI Agenda table-first com criacao, edicao, cancelamento e comportamento mobile.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 05-04-PLAN.md â€” Schema, permissoes e contratos RED de check-in, checklist e auditoria.

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 05-05-PLAN.md â€” API transacional de check-in e checklist por agendamento ou direto.

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 05-06-PLAN.md â€” UI de check-in, consulta posterior, edicao auditada e hardening de isolamento.

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 05-07-PLAN.md â€” Dependencia aprovada, configuracao e schema de anexos protegidos.

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 05-08-PLAN.md â€” API de anexos com upload, download, delete autorizado, soft-delete e auditoria.

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 05-09-PLAN.md â€” UI de anexos opcionais no detalhe do check-in.

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 05-10-PLAN.md â€” Preferencia tenant-level de visualizacao, smoke docs e validacao final da Phase 5.

**Scope**

- Agenda diÃ¡ria e semanal.
- CriaÃ§Ã£o e ediÃ§Ã£o de agendamentos.
- Check-in vinculado a cliente e veÃ­culo.
- Checklist de entrada, quilometragem, combustÃ­vel, avarias, fotos, anexos e itens deixados.

**Dependencies**

- Phase 2.
- Phase 3.

**Risks**

- Anexos sem isolamento de tenant.
- Check-in sem vÃ­nculo rastreÃ¡vel ao cliente/veÃ­culo.
- Dados de recepÃ§Ã£o nÃ£o auditados.

**Success Criteria**

1. UsuÃ¡rio cria agendamento e visualiza na agenda.
2. UsuÃ¡rio realiza check-in vinculado ao cliente e veÃ­culo.
3. Checklist, fotos, quilometragem, combustÃ­vel e avarias ficam consultÃ¡veis.
4. Anexos respeitam tenant.
5. AlteraÃ§Ãµes relevantes sÃ£o auditadas.

### Phase 6: DiagnÃ³stico e OrÃ§amento

**Goal:** Transformar diagnÃ³stico tÃ©cnico em proposta comercial versionada, calculada e compartilhÃ¡vel manualmente.
**Mode:** mvp
**Requirements:** QTE-01, QTE-02, QTE-03, QTE-04, QTE-05, QTE-06, QTE-07, QTE-08, QTE-09, QTE-10, QTE-11
**UI hint:** yes
**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Pacotes aprovados, schema, permissoes e setup base de orcamentos.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — API de diagnostico e orcamento em rascunho com itens e totais backend-authoritative.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-03-PLAN.md — Publicacao imutavel, nova versao, PDF e link manual a partir de snapshot.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-04-PLAN.md — UI autenticada de Orcamentos com criacao, publicacao, PDF e copia manual.

**Scope**

- DiagnÃ³stico, serviÃ§os e peÃ§as recomendadas.
- OrÃ§amento em rascunho com itens de serviÃ§o/produto, desconto, acrÃ©scimo, validade e prazo.
- CÃ¡lculo de subtotal e total.
- PublicaÃ§Ã£o de versÃ£o imutÃ¡vel, nova versÃ£o, PDF, impressÃ£o e cÃ³pia manual do link seguro.

**Dependencies**

- Phase 3.
- Phase 4.
- Phase 5.

**Risks**

- Alterar versÃ£o publicada em vez de criar nova.
- Desconto sem permissÃ£o.
- PDF divergente do orÃ§amento persistido.
- Introduzir botÃµes de envio automÃ¡tico proibidos.

**Success Criteria**

1. UsuÃ¡rio cria diagnÃ³stico e orÃ§amento com serviÃ§os e peÃ§as.
2. Totais, descontos e acrÃ©scimos sÃ£o calculados corretamente.
3. Desconto acima do limite exibe alerta e permanece permitido, conforme decisÃ£o D-08.
4. VersÃ£o publicada fica imutÃ¡vel e nova versÃ£o preserva a anterior.
5. PDF e link podem ser gerados para entrega manual, sem envio automÃ¡tico.

### Phase 7: AprovaÃ§Ã£o PÃºblica Segura

**Goal:** Permitir que o cliente consulte e decida sobre uma versÃ£o exata do orÃ§amento por token seguro.
**Mode:** mvp
**Requirements:** QTE-12, QTE-13, QTE-14, QTE-15, QTE-16, QTE-17, QTE-18
**UI hint:** yes

**Scope**

- PÃ¡gina pÃºblica por token.
- VisualizaÃ§Ã£o apenas de dados autorizados.
- AprovaÃ§Ã£o total, aprovaÃ§Ã£o parcial, recusa, observaÃ§Ã£o e confirmaÃ§Ã£o de nome.
- Registro de visualizaÃ§Ã£o, decisÃ£o, itens aprovados/recusados, IP/user agent quando permitido e auditoria.

**Dependencies**

- Phase 6.

**Risks**

- Token previsÃ­vel ou vazando existÃªncia de registros.
- AprovaÃ§Ã£o nÃ£o vinculada Ã  versÃ£o exata.
- ExposiÃ§Ã£o de dados internos, custos, margem ou fornecedores.

**Success Criteria**

1. Token vÃ¡lido exibe somente a versÃ£o e os dados autorizados.
2. Token invÃ¡lido, expirado ou incorreto nÃ£o revela informaÃ§Ãµes protegidas.
3. Cliente aprova todos, aprova parcialmente ou recusa.
4. DecisÃ£o fica vinculada Ã  versÃ£o exata.
5. Dados tÃ©cnicos e auditoria sÃ£o registrados sem armazenar segredos.

### Phase 8: Ordem de ServiÃ§o

**Goal:** Controlar formalmente a execuÃ§Ã£o dos trabalhos autorizados com snapshots, status e consumo de peÃ§as.
**Mode:** mvp
**Requirements:** WOP-01, WOP-02, WOP-03, WOP-04, WOP-05, WOP-06, WOP-07, WOP-08, WOP-12, WOP-13, WOP-14
**UI hint:** yes

**Scope**

- ConversÃ£o transacional de orÃ§amento aprovado em OS.
- Itens com snapshots de descriÃ§Ãµes e preÃ§os.
- Status, histÃ³rico, responsÃ¡veis, prazos, fotos e anexos.
- Regras de finalizaÃ§Ã£o, reabertura autorizada, utilizaÃ§Ã£o de peÃ§as e auditoria.

**Dependencies**

- Phase 7.
- Phase 4.

**Risks**

- Converter itens recusados.
- Usar preÃ§os mutÃ¡veis do catÃ¡logo.
- Consumir peÃ§as sem transaÃ§Ã£o.
- Reabrir OS sem autorizaÃ§Ã£o.

**Success Criteria**

1. OrÃ§amento aprovado gera OS apenas com itens aprovados.
2. DescriÃ§Ãµes e preÃ§os permanecem preservados apÃ³s alteraÃ§Ãµes no catÃ¡logo.
3. TransiÃ§Ãµes invÃ¡lidas sÃ£o bloqueadas.
4. Reabertura exige permissÃ£o.
5. Uso de peÃ§as atualiza estoque corretamente e registra auditoria.

### Phase 9: ProduÃ§Ã£o e Tarefas

**Goal:** Organizar a execuÃ§Ã£o operacional da ordem de serviÃ§o em tarefas e quadro de produÃ§Ã£o.
**Mode:** mvp
**Requirements:** WOP-09, WOP-10, WOP-11
**UI hint:** yes

**Scope**

- Tarefas da OS, responsÃ¡vel, prioridade, prazo, tempo estimado e ordenaÃ§Ã£o.
- Quadro Kanban, alteraÃ§Ã£o de status e identificaÃ§Ã£o de atrasos.
- Regras de autorizaÃ§Ã£o e histÃ³rico relevante.

**Dependencies**

- Phase 8.

**Risks**

- Quadro refletir estado visual diferente do persistido.
- TransiÃ§Ã£o sem permissÃ£o.
- Alertas virarem notificaÃ§Ãµes persistentes.

**Success Criteria**

1. UsuÃ¡rio cria tarefa e atribui responsÃ¡vel.
2. UsuÃ¡rio altera status e o quadro reflete a mudanÃ§a.
3. TransiÃ§Ã£o sem permissÃ£o Ã© bloqueada.
4. Tarefas atrasadas sÃ£o identificadas por cÃ¡lculo.
5. HistÃ³rico relevante Ã© preservado.

### Phase 10: Financeiro

**Goal:** Registrar recebimentos, obrigaÃ§Ãµes, despesas e movimentaÃ§Ãµes de caixa com integridade.
**Mode:** mvp
**Requirements:** FIN-01, FIN-02, FIN-03, FIN-04, FIN-05, FIN-06, FIN-07, FIN-08, FIN-09, FIN-10, FIN-11, FIN-12, FIN-13, FIN-14, FIN-15
**UI hint:** yes

**Scope**

- Categorias financeiras, contas a receber, contas a pagar, despesas e comissÃµes.
- Pagamentos integrais/parciais, parcelamento, estorno, caixa e movimentos de caixa.
- SituaÃ§Ã£o financeira da OS, fluxo de caixa e alertas visuais de vencimento.

**Dependencies**

- Phase 8.

**Risks**

- Pagamentos e movimentos de caixa divergirem.
- Estorno apagar histÃ³rico em vez de gerar movimento inverso.
- OperaÃ§Ãµes financeiras sem transaÃ§Ã£o.

**Success Criteria**

1. Pagamento parcial atualiza saldo pendente.
2. Pagamento integral liquida a obrigaÃ§Ã£o.
3. Estorno exige autorizaÃ§Ã£o e gera movimento inverso rastreÃ¡vel.
4. Totais do caixa correspondem Ã s movimentaÃ§Ãµes.
5. OperaÃ§Ãµes crÃ­ticas usam transaÃ§Ãµes e sÃ£o auditadas.

### Phase 11: Dashboard, HistÃ³rico e Portal

**Goal:** Consolidar informaÃ§Ãµes operacionais e disponibilizar consultas seguras para oficina e cliente.
**Mode:** mvp
**Requirements:** DPR-01, DPR-02, DPR-03, DPR-04, DPR-05
**UI hint:** yes

**Scope**

- Dashboard com OS abertas, produÃ§Ã£o, orÃ§amentos, estoque, agenda, pagamentos, despesas e faturamento.
- Alertas visuais calculados.
- HistÃ³rico completo do veÃ­culo.
- Portal do cliente com dados autorizados e sem notificaÃ§Ãµes.

**Dependencies**

- Phase 10.

**Risks**

- Dashboard usar dados estÃ¡ticos.
- Portal expor custos internos, margens, fornecedores ou dados de outro cliente.
- Alertas visuais se transformarem em central de notificaÃ§Ãµes.

**Success Criteria**

1. Dashboard apresenta dados reais.
2. Alertas sÃ£o calculados sem criar registros de notificaÃ§Ã£o.
3. HistÃ³rico do veÃ­culo consolida registros relacionados.
4. Cliente acessa apenas os prÃ³prios dados autorizados.
5. InformaÃ§Ãµes internas nÃ£o aparecem no portal.

### Phase 12: RelatÃ³rios e ProduÃ§Ã£o

**Goal:** Preparar a aplicaÃ§Ã£o para operaÃ§Ã£o real com relatÃ³rios, auditoria final, testes crÃ­ticos, backup e documentaÃ§Ã£o.
**Mode:** mvp
**Requirements:** DPR-06, DPR-07, DPR-08, DPR-09, DPR-10, DPR-11
**UI hint:** yes

**Scope**

- RelatÃ³rios essenciais e exportaÃ§Ãµes.
- Auditoria administrativa.
- RevisÃ£o de seguranÃ§a e isolamento entre tenants.
- Testes de integraÃ§Ã£o e end-to-end dos fluxos crÃ­ticos.
- Backup, restauraÃ§Ã£o testada, observabilidade, variÃ¡veis de ambiente, deploy e documentaÃ§Ã£o.

**Dependencies**

- Phase 11.

**Risks**

- RelatÃ³rios ignorarem filtros de tenant.
- Backup nÃ£o restaurar.
- Fluxo crÃ­tico nÃ£o ser validado com dados reais.
- VariÃ¡veis de produÃ§Ã£o ficarem implÃ­citas ou inseguras.

**Success Criteria**

1. RelatÃ³rios apresentam dados corretos e respeitam tenant.
2. ExportaÃ§Ãµes respeitam filtros e isolamento.
3. Backup pode ser restaurado em ambiente controlado.
4. Fluxos crÃ­ticos do MVP passam em ambiente prÃ³ximo de produÃ§Ã£o.
5. DocumentaÃ§Ã£o permite instalaÃ§Ã£o, operaÃ§Ã£o e validaÃ§Ã£o do sistema.

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
