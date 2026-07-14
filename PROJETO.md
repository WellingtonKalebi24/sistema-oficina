# JO.IA — Sistema de Gestão para Oficina Automotiva

## Prompt de sistema para desenvolvimento com GSD

---

## 1. Prioridade destas instruções

As instruções deste documento possuem prioridade sobre quaisquer instruções genéricas, padrões de desenvolvimento ou metodologias anteriores que entrem em conflito com elas.

Em caso de conflito, aplique a seguinte ordem de prioridade:

1. Decisões explicitamente confirmadas pelo proprietário do projeto.
2. Regras e restrições deste documento.
3. Decisões técnicas registradas durante o projeto.
4. Roadmap e planos de fase aprovados.
5. Convenções gerais de desenvolvimento.

Não altere silenciosamente requisitos definidos neste documento.

Quando uma decisão nova afetar escopo, segurança, arquitetura, banco de dados ou regras de negócio, registre-a antes da implementação.

---

# 2. Papel do GSD

Este projeto será desenvolvido utilizando **GSD — Get Shit Done**.

O GSD deve atuar como responsável por:

* compreender a visão do produto;
* identificar requisitos funcionais e não funcionais;
* levantar decisões ainda não definidas;
* fazer perguntas apenas sobre decisões relevantes;
* pesquisar tecnologias quando necessário;
* separar o MVP das versões futuras;
* identificar dependências entre módulos;
* criar um roadmap baseado em dependências;
* dividir o projeto em fases pequenas e verificáveis;
* planejar cada fase antes de executá-la;
* implementar tarefas de forma incremental;
* validar cada resultado;
* registrar decisões e progresso;
* manter o estado do projeto entre sessões por meio de documentação persistente.

Este documento deve ser utilizado como contexto inicial durante a criação do projeto.

Não tente implementar o sistema inteiro em uma única execução.

---

# 3. Metodologias proibidas

Não utilizar:

* estrutura do BMAD;
* agentes do BMAD;
* épicos no formato BMAD;
* stories no formato BMAD;
* `bmad-create-story`;
* `bmad-dev-story`;
* planejamento obrigatoriamente baseado em sprints;
* story points;
* cerimônias ágeis sem utilidade direta;
* divisão artificial do projeto apenas para se adequar a uma metodologia.

As funcionalidades devem ser agrupadas por dependência, domínio e resultado verificável.

Não transforme automaticamente cada item desta especificação em uma fase separada.

---

# 4. Objetivo do produto

Construir progressivamente um sistema de gestão para oficinas automotivas que seja:

* funcional;
* original;
* seguro;
* consistente;
* auditável;
* multiempresa;
* preparado para produção;
* comercializável pela **JO.IA**.

O sistema deverá atender o fluxo operacional completo da oficina, desde o cadastro do cliente e a recepção do veículo até a execução dos serviços, controle financeiro, histórico e auditoria.

---

# 5. Procedimento obrigatório ao iniciar o projeto

Ao receber esta especificação, não comece imediatamente a escrever código.

Primeiro, analise integralmente o documento e produza:

1. visão consolidada do produto;
2. objetivos do MVP;
3. requisitos funcionais do MVP;
4. requisitos não funcionais;
5. funcionalidades destinadas a versões futuras;
6. regras de negócio;
7. entidades e relacionamentos principais;
8. decisões técnicas já definidas;
9. decisões que precisam ser confirmadas;
10. riscos técnicos;
11. riscos de segurança;
12. operações que exigem transações de banco;
13. eventos que exigem auditoria;
14. roadmap baseado em dependências;
15. fases pequenas e verificáveis;
16. critérios mensuráveis de conclusão;
17. estratégia de validação;
18. estratégia de preparação para produção.

A implementação somente poderá começar depois que o projeto, o escopo e o roadmap estiverem definidos.

---

# 6. Saída esperada da análise inicial

A primeira resposta do GSD deve apresentar, nesta ordem:

## 6.1 Resumo do produto

Explique o sistema, seus usuários, seus principais fluxos e o valor entregue.

## 6.2 Escopo do MVP

Liste apenas o que é necessário para que a primeira versão possa operar uma oficina de ponta a ponta.

## 6.3 Escopo futuro

Separe funcionalidades importantes que não são necessárias para validar e operar o MVP.

## 6.4 Premissas

Registre todas as premissas utilizadas para interpretar requisitos ainda não confirmados.

## 6.5 Decisões pendentes

Apresente somente perguntas que bloqueiem ou afetem significativamente:

* arquitetura;
* segurança;
* privacidade;
* fluxo operacional;
* regras financeiras;
* permissões;
* isolamento entre empresas;
* armazenamento de arquivos;
* implantação;
* conformidade legal.

Não faça perguntas sobre decisões que possam ser adiadas sem risco.

## 6.6 Riscos

Identifique riscos de:

* segurança;
* autorização;
* isolamento de tenants;
* integridade financeira;
* integridade do estoque;
* concorrência;
* perda de dados;
* exposição de informações;
* aprovação indevida de orçamento;
* inconsistência entre orçamento e ordem de serviço;
* uso inadequado de dados pessoais.

## 6.7 Roadmap

Crie fases com base em dependências técnicas e funcionais.

Cada fase deve possuir:

* objetivo;
* escopo;
* dependências;
* decisões necessárias;
* tarefas principais;
* arquivos ou áreas afetadas;
* riscos;
* critérios de aceitação;
* verificações executáveis;
* condição objetiva de conclusão.

---

# 7. Estado persistente do projeto

Para manter continuidade entre sessões, registrar preferencialmente:

```text
docs/
├── PROJECT.md
├── REQUIREMENTS.md
├── ROADMAP.md
├── DECISIONS.md
├── ARCHITECTURE.md
├── SECURITY.md
├── DATA_MODEL.md
├── VISUAL_CONTRACT.md
├── VALIDATION.md
├── STATE.md
└── phases/
    ├── phase-01.md
    ├── phase-02.md
    └── ...
```

O arquivo `STATE.md` deve informar:

* fase atual;
* último trabalho concluído;
* decisões recentes;
* pendências;
* bloqueios;
* próximos passos;
* testes executados;
* problemas conhecidos.

Não dependa apenas da memória da conversa para manter o estado do projeto.

---

# 8. Stack tecnológica inicial

A arquitetura inicial deverá considerar:

## Frontend

* React;
* Vite;
* TypeScript.

## Backend

* Node.js;
* Express;
* TypeScript.

## Dados e infraestrutura

* PostgreSQL;
* Prisma;
* Docker Compose;
* variáveis de ambiente;
* armazenamento seguro de segredos;
* migrations versionadas;
* estratégia de backup.

Alterações relevantes nessa stack exigem justificativa técnica e registro de decisão.

---

# 9. Escopo prioritário do MVP

A primeira versão funcional deve priorizar:

* estrutura do projeto;
* ambiente Docker;
* banco PostgreSQL;
* Prisma;
* autenticação;
* autorização;
* configuração da oficina;
* multiempresa com tenants;
* usuários;
* funções e permissões;
* clientes;
* veículos;
* catálogo de serviços;
* produtos e peças;
* fornecedores;
* compras;
* controle de estoque;
* agenda;
* check-in do veículo;
* diagnóstico;
* orçamento;
* versionamento do orçamento;
* geração de PDF;
* aprovação do orçamento por link seguro;
* ordem de serviço;
* tarefas da ordem de serviço;
* quadro de produção;
* pagamentos;
* contas a pagar;
* contas a receber;
* caixa;
* despesas;
* dashboard;
* histórico do veículo;
* portal do cliente sem notificações;
* anexos e fotos;
* relatórios essenciais;
* auditoria;
* testes dos fluxos críticos;
* preparação para produção.

Funcionalidades secundárias devem ser movidas para versões futuras quando ameaçarem a conclusão do MVP.

---

# 10. Roadmap inicial sugerido

A quantidade e a ordem das fases poderão ser ajustadas pelo GSD quando houver justificativa baseada em dependências.

## Fase 1 — Fundação

### Objetivo

Criar uma base técnica executável, testável e preparada para evolução.

### Escopo

* monorepo ou estrutura organizada de frontend e backend;
* React, Vite e TypeScript;
* Node.js, Express e TypeScript;
* PostgreSQL;
* Prisma;
* Docker Compose;
* variáveis de ambiente;
* health check;
* tratamento global de erros;
* logs estruturados;
* lint;
* formatação;
* verificação de tipos;
* estrutura inicial de testes;
* migrations;
* seed controlado para desenvolvimento;
* documentação de execução local.

### Verificação mínima

* aplicação iniciando via Docker;
* frontend acessível;
* API respondendo ao health check;
* API conectando ao PostgreSQL;
* migration executada;
* lint, testes e type check aprovados.

---

## Fase 2 — Autenticação, tenant e empresa

### Objetivo

Garantir acesso seguro e isolamento entre oficinas.

### Escopo

* `Tenant`;
* `CompanySetting`;
* usuários;
* funções;
* permissões;
* permissões específicas por usuário;
* login;
* refresh token;
* encerramento de sessão;
* recuperação de senha;
* alteração de senha;
* proteção de rotas;
* autorização por permissão;
* auditoria de acesso;
* isolamento de tenant.

### Verificação mínima

* administrador consegue entrar;
* usuário sem permissão recebe bloqueio adequado;
* usuário de um tenant não acessa dados de outro;
* refresh token funciona com rotação ou invalidação segura;
* acessos relevantes são auditados.

---

## Fase 3 — Clientes e veículos

### Objetivo

Permitir a gestão da base de clientes e seus veículos.

### Escopo

* cadastro de clientes;
* cadastro de veículos;
* relacionamento entre cliente e veículos;
* busca por nome;
* busca por telefone;
* busca por documento;
* busca por placa;
* histórico básico;
* exclusão lógica;
* validações de duplicidade;
* auditoria das alterações relevantes.

### Verificação mínima

* cadastrar cliente;
* cadastrar veículo;
* relacionar o veículo ao cliente;
* localizar o registro por diferentes campos;
* impedir acesso cruzado entre tenants;
* preservar registros relacionados após exclusão lógica.

---

## Fase 4 — Serviços, produtos, compras e estoque

### Objetivo

Disponibilizar os recursos necessários para precificação e utilização de peças.

### Escopo

* catálogo de serviços;
* cadastro de produtos;
* categorias;
* fornecedores;
* compras;
* itens de compra;
* entrada de estoque;
* saída de estoque;
* ajustes autorizados;
* estoque mínimo;
* reserva de peças;
* cancelamento de reserva;
* histórico de movimentações;
* rastreabilidade;
* permissões para ajustes.

### Verificação mínima

* entrada de produto atualiza o saldo;
* saída reduz o saldo;
* reserva afeta a disponibilidade sem corromper o saldo físico;
* cancelamento devolve a disponibilidade;
* ajuste exige permissão;
* toda movimentação possui origem e auditoria;
* concorrência não produz saldo incorreto.

---

## Fase 5 — Agenda e recepção

### Objetivo

Cobrir o agendamento e a entrada física do veículo na oficina.

### Escopo

* agenda diária;
* agenda semanal;
* criação e edição de agendamentos;
* check-in;
* checklist de entrada;
* quilometragem;
* nível de combustível;
* avarias;
* fotos;
* anexos;
* itens deixados no veículo;
* vínculo com cliente e veículo.

### Verificação mínima

* criar agendamento;
* visualizar na agenda;
* realizar check-in;
* registrar checklist;
* anexar fotos;
* registrar quilometragem e combustível;
* consultar posteriormente o registro de entrada.

---

## Fase 6 — Diagnóstico e orçamento

### Objetivo

Transformar o diagnóstico técnico em uma proposta comercial versionada.

### Escopo

* diagnóstico;
* serviços recomendados;
* peças recomendadas;
* criação do orçamento;
* itens de serviço;
* itens de produto;
* desconto autorizado;
* acréscimo;
* validade;
* prazo estimado;
* cálculo de subtotal e total;
* versionamento;
* geração de PDF;
* impressão;
* link público seguro;
* histórico de alterações.

### Verificação mínima

* criar orçamento;
* adicionar serviços e peças;
* calcular valores corretamente;
* aplicar desconto conforme permissão;
* gerar PDF;
* criar nova versão;
* preservar versões anteriores;
* copiar link de aprovação.

---

## Fase 7 — Aprovação pública do orçamento

### Objetivo

Permitir que o cliente consulte e decida sobre uma versão exata do orçamento.

### Escopo

* consulta por token seguro;
* visualização do orçamento;
* aprovação total;
* aprovação parcial;
* recusa;
* observação do cliente;
* confirmação do nome;
* registro de aceite;
* expiração do link;
* registro de visualização;
* registro de decisão;
* vínculo com a versão exata;
* conversão segura em ordem de serviço.

### Verificação mínima

* link válido exibe somente os dados autorizados;
* token inválido não revela informações;
* orçamento expirado não pode ser aprovado;
* aprovação parcial registra itens aprovados e recusados;
* decisão fica vinculada à versão correta;
* uma versão alterada não modifica a decisão anterior;
* conversão em OS preserva os itens aprovados.

---

## Fase 8 — Ordem de serviço

### Objetivo

Controlar formalmente a execução dos trabalhos autorizados.

### Escopo

* criação da OS;
* conversão do orçamento;
* itens da OS;
* snapshots de descrições e preços;
* status;
* histórico de status;
* responsáveis;
* prazos;
* fotos;
* anexos;
* regras de finalização;
* reabertura autorizada;
* utilização de peças;
* auditoria.

### Verificação mínima

* orçamento aprovado gera OS;
* itens recusados não entram como autorizados;
* preços permanecem preservados mesmo após alteração do catálogo;
* transições inválidas de status são bloqueadas;
* reabertura exige permissão;
* consumo de peças atualiza o estoque corretamente.

---

## Fase 9 — Produção e tarefas

### Objetivo

Organizar a execução operacional da ordem de serviço.

### Escopo

* tarefas da OS;
* responsável;
* prioridade;
* prazo;
* tempo estimado;
* quadro Kanban;
* alteração de status;
* ordenação;
* regras de autorização;
* tarefas atrasadas;
* vínculo com itens e ordem de serviço.

### Verificação mínima

* criar tarefa;
* atribuir responsável;
* alterar status;
* refletir a alteração no quadro;
* impedir transição sem permissão;
* identificar tarefa atrasada;
* preservar histórico relevante.

---

## Fase 10 — Financeiro

### Objetivo

Registrar recebimentos, obrigações, despesas e movimentações de caixa.

### Escopo

* pagamentos;
* pagamentos parciais;
* parcelamento;
* contas a receber;
* contas a pagar;
* categorias financeiras;
* despesas;
* caixa;
* movimentos de caixa;
* estorno;
* fluxo de caixa;
* situação financeira da OS;
* comissões;
* auditoria financeira.

### Verificação mínima

* pagamento parcial atualiza o saldo pendente;
* pagamento integral liquida a obrigação;
* estorno exige autorização e gera movimento inverso rastreável;
* conta a pagar registra vencimento e situação;
* conta a receber mantém vínculo com a origem;
* totais do caixa correspondem às movimentações;
* operações críticas usam transações de banco.

---

## Fase 11 — Dashboard, histórico e portal

### Objetivo

Consolidar informações operacionais e disponibilizar consultas seguras.

### Escopo

* dashboard operacional;
* indicadores;
* agenda do dia;
* OS por status;
* histórico completo do veículo;
* peças utilizadas;
* serviços realizados;
* quilometragens;
* valores permitidos;
* portal do cliente;
* fotos liberadas;
* documentos liberados;
* garantias;
* próximas manutenções registradas;
* pagamentos visíveis ao cliente quando permitido.

### Verificação mínima

* dashboard apresenta dados reais;
* alertas visuais são calculados corretamente;
* histórico do veículo consolida registros relacionados;
* cliente acessa apenas os próprios dados;
* informações internas não aparecem no portal;
* acesso entre clientes ou tenants é bloqueado.

---

## Fase 12 — Relatórios e produção

### Objetivo

Preparar a aplicação para operação real.

### Escopo

* relatórios essenciais;
* exportações;
* auditoria administrativa;
* revisão de segurança;
* testes de integração;
* testes end-to-end dos fluxos críticos;
* documentação;
* backup;
* restauração testada;
* configuração de deploy;
* observabilidade;
* revisão de variáveis de ambiente;
* revisão final de permissões;
* revisão de isolamento entre tenants.

### Verificação mínima

* relatórios apresentam dados corretos;
* exportações respeitam filtros e tenant;
* backup pode ser restaurado;
* fluxos críticos passam em ambiente próximo ao de produção;
* documentação permite instalação e operação;
* não existem erros críticos abertos.

---

# 11. Funcionalidades explicitamente proibidas

## 11.1 Notificações e comunicação automática

Não implementar:

* envio automático de WhatsApp;
* integração com API do WhatsApp;
* envio automático de e-mail;
* SMS;
* push notification;
* lembrete automático de agendamento;
* aviso automático de orçamento;
* aviso automático de aprovação;
* aviso automático de início do serviço;
* aviso automático de veículo pronto;
* aviso automático de pagamento pendente;
* aviso automático de próxima revisão;
* campanhas de relacionamento;
* filas de mensagens para comunicação com clientes;
* templates de mensagens automáticas;
* agendamento de mensagens;
* webhooks de confirmação de mensagens;
* confirmação de leitura;
* histórico de notificações enviadas;
* automações de contato com o cliente.

O sistema não será responsável por entrar em contato automaticamente com o cliente.

Essa restrição também se aplica ao portal do cliente.

## 11.2 Notificações internas

Não criar:

* sino de notificações;
* central de notificações;
* caixa de entrada;
* contador de mensagens;
* histórico de notificações;
* entrega de alertas fora do sistema;
* sistema persistente de notificações internas.

Somente alertas visuais calculados diretamente nas telas são permitidos.

---

# 12. Entidades proibidas

Não criar:

```text
Notification
NotificationTemplate
NotificationPreference
MessageQueue
WhatsAppIntegration
EmailIntegration
```

Também não criar qualquer entidade cuja finalidade exclusiva seja:

* envio de mensagens;
* agendamento de mensagens;
* rastreamento de entrega;
* preferências de notificações;
* confirmação de leitura;
* armazenamento de notificações ao cliente.

Caso alguma dessas entidades já exista, deverá ser removida com uma migration segura.

---

# 13. Alertas visuais permitidos

Os seguintes alertas poderão aparecer no dashboard ou nas telas correspondentes:

* estoque baixo;
* ordem de serviço atrasada;
* orçamento próximo do vencimento;
* pagamento vencido;
* veículo previsto para entrega;
* tarefa atrasada.

Esses alertas:

* devem ser calculados a partir dos dados existentes;
* não devem gerar registros de notificação;
* não devem acionar filas;
* não devem enviar mensagens;
* não devem aparecer em uma central de notificações;
* não devem ser enviados para fora do sistema.

---

# 14. Comunicação manual com o cliente

Quando necessário, o usuário da oficina poderá:

* gerar o PDF do orçamento;
* imprimir o orçamento;
* copiar o link seguro de aprovação;
* copiar o telefone do cliente;
* copiar o número de WhatsApp do cliente;
* entregar o documento presencialmente;
* utilizar ferramentas externas por conta própria.

O sistema deve apenas disponibilizar as informações.

Não deve:

* abrir automaticamente conversas;
* montar ou disparar mensagens;
* enviar arquivos;
* registrar confirmação de entrega;
* registrar confirmação de leitura;
* apresentar botão “Enviar por WhatsApp”;
* apresentar botão “Enviar por e-mail”.

---

# 15. Regras do módulo de orçamento

O módulo deve permitir:

* criar orçamento;
* editar enquanto estiver em rascunho;
* adicionar serviços;
* adicionar peças;
* aplicar desconto autorizado;
* aplicar acréscimo;
* definir validade;
* definir prazo estimado;
* calcular valores;
* criar nova versão;
* gerar PDF;
* imprimir;
* copiar link seguro de aprovação;
* visualizar histórico;
* converter orçamento aprovado em OS.

## 15.1 Imutabilidade e versionamento

Quando um orçamento deixar o estado de rascunho e ficar disponível para aprovação:

* a versão publicada deve ser preservada;
* alterações comerciais devem gerar uma nova versão;
* aprovações devem apontar para uma versão exata;
* uma aprovação anterior nunca deve ser reinterpretada usando dados de uma versão nova;
* a OS deve preservar snapshots dos itens, descrições e preços aprovados.

## 15.2 Status do orçamento

Utilizar os seguintes estados:

```text
DRAFT
AVAILABLE_FOR_APPROVAL
VIEWED
PARTIALLY_APPROVED
APPROVED
REJECTED
EXPIRED
CANCELED
CONVERTED_TO_WORK_ORDER
```

Apresentações sugeridas em português:

* Rascunho;
* Disponível para aprovação;
* Visualizado pelo link;
* Parcialmente aprovado;
* Aprovado;
* Recusado;
* Expirado;
* Cancelado;
* Convertido em OS.

## 15.3 Ações proibidas

Não implementar:

* botão “Enviar por WhatsApp”;
* botão “Enviar por e-mail”;
* status “Enviado por WhatsApp”;
* status “Enviado por e-mail”;
* confirmação de leitura;
* rastreamento de entrega da mensagem.

---

# 16. Aprovação por link seguro

A aprovação por link faz parte do MVP.

O funcionário da oficina será responsável por copiar e entregar o link ao cliente manualmente.

## 16.1 Conteúdo permitido na página pública

A página pública poderá exibir:

* dados públicos da oficina;
* dados necessários do cliente;
* veículo;
* diagnóstico liberado;
* serviços;
* peças;
* valores;
* fotos explicitamente liberadas;
* validade;
* prazo estimado.

## 16.2 Ações do cliente

A página pública deverá permitir:

* aprovar todos os itens;
* aprovar itens individualmente;
* recusar itens;
* recusar o orçamento;
* informar observação;
* confirmar o nome;
* registrar o aceite.

## 16.3 Dados a registrar

Guardar:

* token seguro;
* hash do token quando aplicável;
* versão do orçamento;
* data da primeira visualização;
* data da decisão;
* itens aprovados;
* itens recusados;
* nome informado;
* observação;
* endereço IP quando permitido;
* registro técnico da aprovação;
* user agent quando permitido;
* metadados necessários para auditoria.

## 16.4 Regras de segurança

* o token deve possuir entropia adequada;
* o token não deve expor identificadores previsíveis;
* o acesso deve ser limitado ao orçamento correspondente;
* dados internos não podem ser exibidos;
* links expirados devem ser bloqueados;
* decisões já concluídas não podem ser alteradas sem regra explícita;
* tentativas inválidas devem ser tratadas sem revelar informações;
* o acesso ao link não depende do envio de mensagem pelo sistema.

---

# 17. Portal do cliente

O portal do cliente poderá permanecer no projeto, mas não deverá possuir notificações.

O cliente poderá consultar:

* seus veículos;
* seus orçamentos;
* suas ordens de serviço;
* status atual;
* fotos liberadas;
* histórico de serviços;
* garantias;
* documentos liberados;
* pagamentos permitidos;
* próximas manutenções registradas.

## 17.1 Informações proibidas no portal

Não mostrar:

* custos internos;
* margem de lucro;
* observações internas;
* dados de fornecedores;
* dados de outros clientes;
* dados de outros tenants;
* logs administrativos;
* informações financeiras internas;
* comissões;
* permissões;
* dados técnicos sensíveis;
* anexos não liberados.

## 17.2 Restrições

O portal não deve:

* enviar mensagens;
* enviar alertas externos;
* enviar lembretes;
* possuir central de notificações;
* possuir sino de notificações;
* abrir WhatsApp automaticamente.

---

# 18. Dashboard

O dashboard deverá exibir dados reais e alertas visuais calculados.

Apresentar:

* ordens de serviço abertas;
* ordens em execução;
* orçamentos aguardando decisão;
* ordens aguardando peças;
* serviços atrasados;
* veículos previstos para entrega;
* recebimentos do dia;
* valores pendentes;
* despesas do mês;
* faturamento do mês;
* produtos abaixo do estoque mínimo;
* agendamentos do dia;
* tarefas atrasadas.

Não criar:

* sino de notificações;
* caixa de entrada;
* central de notificações;
* contador de mensagens;
* status de mensagens enviadas;
* botões de envio automático ao cliente.

---

# 19. Modelo de dados inicial

Criar inicialmente:

```text
Tenant
CompanySetting
User
Role
Permission
UserPermission
RefreshToken
Customer
Vehicle
Appointment
CheckIn
CheckInItem
Diagnostic
ServiceCatalog
Product
ProductCategory
Supplier
Purchase
PurchaseItem
StockMovement
Quote
QuoteVersion
QuoteItem
QuoteApproval
WorkOrder
WorkOrderItem
WorkOrderStatusHistory
WorkOrderTask
Payment
FinancialCategory
AccountReceivable
AccountPayable
CashRegister
CashMovement
Expense
Commission
Attachment
MaintenanceReminder
AuditLog
```

Não criar a entidade `Notification`.

## 19.1 Regra para MaintenanceReminder

`MaintenanceReminder` representa apenas um registro de manutenção futura.

Ele poderá ser exibido para consulta no sistema ou no portal, mas não poderá:

* enviar lembretes;
* gerar mensagens;
* criar notificações;
* agendar comunicação;
* disparar tarefas externas.

---

# 20. Multiempresa e isolamento de dados

Todos os registros operacionais devem respeitar `tenant_id`.

O isolamento não pode depender apenas do frontend.

A API e a camada de dados devem garantir que:

* consultas sejam filtradas pelo tenant autenticado;
* alterações validem a propriedade do registro;
* relacionamentos não aceitem IDs de outro tenant;
* exports respeitem o tenant;
* relatórios respeitem o tenant;
* arquivos e anexos respeitem o tenant;
* rotas públicas exponham apenas o recurso vinculado ao token;
* jobs internos, quando existirem, respeitem o tenant.

Toda fase que introduzir registros operacionais deve incluir teste de isolamento entre tenants.

---

# 21. Operações que exigem transações de banco

O planejamento deve analisar o uso de transações, especialmente em:

* conversão de orçamento em OS;
* criação da OS e seus itens;
* aprovação total ou parcial;
* reserva de peças;
* liberação de reserva;
* consumo de peças;
* movimentações de estoque;
* entrada de compra;
* ajustes de estoque;
* pagamentos;
* pagamentos parciais;
* estornos;
* movimentos de caixa;
* criação ou liquidação de contas;
* finalização da OS;
* reabertura da OS;
* operações financeiras compostas.

Não permita estados parcialmente gravados em operações críticas.

---

# 22. Auditoria obrigatória

Avaliar auditoria para:

* login;
* falhas relevantes de autenticação;
* alteração de senha;
* alteração de permissões;
* criação e desativação de usuários;
* alteração de dados da oficina;
* alterações sensíveis de clientes;
* alterações sensíveis de veículos;
* movimentações de estoque;
* ajustes de estoque;
* criação e versionamento de orçamento;
* descontos e acréscimos;
* aprovação ou recusa;
* conversão em OS;
* transições críticas de status;
* reabertura de OS;
* utilização de peças;
* pagamentos;
* estornos;
* despesas;
* movimentos de caixa;
* exportações sensíveis;
* acesso administrativo relevante.

O log deve registrar, quando aplicável:

* tenant;
* usuário;
* ação;
* entidade;
* identificador do registro;
* data e horário;
* valores relevantes anteriores e posteriores;
* origem técnica;
* contexto mínimo necessário.

Não registrar senhas, tokens completos, dados de cartão ou outros segredos.

---

# 23. Autenticação e autorização

A aplicação deverá possuir:

* autenticação segura;
* senha armazenada com algoritmo apropriado;
* refresh token controlado;
* invalidação de sessões;
* recuperação de senha segura;
* proteção contra acesso indevido;
* autorização no backend;
* permissões granulares;
* proteção de rotas;
* tratamento seguro de erros;
* auditoria de ações críticas.

A autorização não deve existir somente na interface.

Ocultar um botão não substitui a validação no backend.

---

# 24. Contrato visual obrigatório

Antes da construção das principais telas, definir um contrato visual para a JO.IA contendo:

* paleta de cores;
* tipografia;
* escala de espaçamento;
* bordas;
* raios;
* sombras;
* tamanhos de botões;
* hierarquia tipográfica;
* padrão de formulários;
* padrão de tabelas;
* padrão de cards;
* padrão de modais;
* padrão de filtros;
* cores dos status;
* ícones;
* estados de carregamento;
* skeletons;
* estados vazios;
* mensagens de sucesso;
* mensagens de erro;
* confirmações de ações destrutivas;
* comportamento responsivo;
* vocabulário da interface;
* acessibilidade mínima;
* foco de teclado;
* contraste;
* consistência de datas, horários e valores monetários.

Todas as telas devem seguir o mesmo contrato.

Evite que cada módulo pareça ter sido criado por um sistema diferente.

---

# 25. Qualidade da implementação

Não criar código fictício apenas para demonstrar aparência.

Não utilizar mocks permanentes depois que a API correspondente estiver pronta.

Não marcar funcionalidades incompletas como concluídas.

Não utilizar dados estáticos para simular indicadores finais.

Não deixar validações críticas somente no frontend.

Não ignorar erros de lint, tipos ou testes para concluir uma fase.

Não substituir regras de negócio por comentários ou TODOs.

TODOs críticos impedem a conclusão da fase.

---

# 26. Processo obrigatório por fase

Para cada fase, o GSD deverá:

1. analisar o objetivo;
2. revisar dependências;
3. levantar decisões ainda não definidas;
4. registrar as decisões;
5. pesquisar somente quando necessário;
6. criar um plano com tarefas pequenas;
7. identificar módulos e arquivos afetados;
8. identificar migrations necessárias;
9. identificar riscos;
10. definir critérios de aceitação;
11. definir verificações executáveis;
12. implementar tarefas independentes;
13. criar commits pequenos e objetivos;
14. executar testes;
15. executar lint;
16. executar verificação de tipos;
17. verificar segurança;
18. verificar isolamento de tenant;
19. atualizar documentação;
20. realizar validação funcional;
21. registrar resultados;
22. atualizar o estado do projeto.

Não considerar a fase concluída enquanto houver erros críticos.

---

# 27. Commits

Os commits devem:

* possuir escopo claro;
* representar uma alteração coerente;
* evitar misturar refatorações não relacionadas;
* incluir migrations junto das alterações correspondentes;
* manter o projeto executável sempre que possível;
* utilizar mensagens objetivas.

Exemplos:

```text
feat(auth): add tenant-aware login flow
feat(stock): add transactional stock adjustments
fix(quote): bind public approval to quote version
test(tenancy): prevent cross-tenant vehicle access
docs(roadmap): record phase 6 completion
```

---

# 28. Validação executável

Toda fase deve possuir pelo menos uma verificação executável que comprove o funcionamento real.

Verificações permitidas:

* teste unitário;
* teste de integração;
* teste end-to-end;
* requisição real à API;
* consulta no banco;
* fluxo completo no navegador;
* validação de permissão;
* validação de isolamento entre tenants;
* verificação de movimentação de estoque;
* verificação de cálculo financeiro;
* verificação de auditoria;
* geração e inspeção de PDF;
* teste de expiração de token;
* teste de restauração de backup.

As verificações não podem se limitar a confirmar que os arquivos existem.

É necessário comprovar que a funcionalidade funciona.

---

# 29. Critérios globais de conclusão do MVP

O MVP será considerado concluído quando for possível executar o seguinte fluxo com dados reais:

1. entrar no sistema;
2. configurar os dados da oficina;
3. cadastrar administrador;
4. cadastrar assistente;
5. aplicar permissões diferentes;
6. validar bloqueio de ações sem permissão;
7. cadastrar cliente;
8. cadastrar veículo;
9. criar agendamento;
10. realizar check-in;
11. registrar checklist;
12. anexar fotos;
13. registrar diagnóstico;
14. cadastrar serviços;
15. cadastrar peças;
16. cadastrar fornecedor;
17. registrar entrada ou movimentação de estoque;
18. criar orçamento;
19. adicionar serviços e peças;
20. aplicar desconto autorizado;
21. gerar PDF;
22. imprimir ou disponibilizar o PDF;
23. copiar o link de aprovação;
24. visualizar o orçamento pelo link;
25. aprovar todos os itens;
26. aprovar parcialmente;
27. recusar;
28. converter orçamento aprovado em OS;
29. acompanhar status da OS;
30. criar tarefas;
31. visualizar tarefas no quadro de produção;
32. utilizar peças na OS;
33. atualizar corretamente o estoque;
34. finalizar a OS com as permissões corretas;
35. reabrir a OS somente com autorização;
36. registrar pagamento;
37. registrar pagamento parcial;
38. registrar despesa;
39. consultar contas a pagar;
40. consultar contas a receber;
41. consultar caixa;
42. consultar dashboard;
43. consultar histórico do veículo;
44. consultar portal do cliente;
45. consultar relatórios essenciais;
46. consultar logs de auditoria;
47. confirmar isolamento entre tenants;
48. executar backup;
49. validar restauração;
50. executar os testes dos fluxos críticos.

O envio de notificações ou mensagens ao cliente não faz parte dos critérios de conclusão.

---

# 30. Definição de pronto de uma fase

Uma fase só pode ser marcada como concluída quando:

* o objetivo foi atendido;
* os critérios de aceitação foram validados;
* os testes definidos passaram;
* lint passou;
* type check passou;
* migrations foram testadas;
* autorização foi validada;
* isolamento entre tenants foi verificado;
* operações críticas são transacionais;
* auditoria necessária foi implementada;
* documentação foi atualizada;
* não existem erros críticos;
* limitações restantes estão registradas;
* o estado do projeto foi atualizado.

Arquivos existentes, telas visíveis ou endpoints criados não são, isoladamente, prova de conclusão.

---

# 31. Restrições finais

Ao executar este projeto:

* não desenvolver tudo de uma vez;
* não começar pelo código antes do planejamento;
* não reintroduzir notificações;
* não criar integrações automáticas de comunicação;
* não adicionar entidades de notificações;
* não expor dados internos no portal;
* não ignorar `tenant_id`;
* não confiar apenas no frontend para segurança;
* não finalizar fases sem validação funcional;
* não usar mocks como solução definitiva;
* não alterar requisitos silenciosamente;
* não declarar o MVP concluído sem executar os fluxos críticos.

---

# 32. Instrução final ao GSD

Utilize esta especificação como visão inicial do projeto.

Antes de implementar:

1. consolide a visão;
2. identifique decisões relevantes;
3. separe MVP e versões futuras;
4. registre regras de negócio;
5. identifique riscos;
6. identifique transações e auditoria;
7. defina o modelo de dados;
8. crie o roadmap;
9. apresente fases pequenas e verificáveis;
10. defina critérios mensuráveis de conclusão.

Garanta que nenhuma fase inclua notificações automáticas ao cliente.

Comece a implementação somente depois que a definição inicial do projeto e o roadmap estiverem registrados.

O objetivo final é construir progressivamente um sistema de oficina automotiva funcional, seguro, consistente, original, auditável e comercializável pela **JO.IA**.
