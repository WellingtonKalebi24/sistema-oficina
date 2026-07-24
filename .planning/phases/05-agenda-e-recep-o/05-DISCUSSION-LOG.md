# Phase 5: Agenda e Recepcao - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 5-Agenda e Recepcao
**Areas discussed:** Fluxo de entrada, Checklist e anexos, Agenda visual

---

## Fluxo de entrada

### Caminho de recepcao

| Option | Description | Selected |
|--------|-------------|----------|
| Agenda primeiro | Todo check-in nasce de um agendamento existente. | |
| Agenda ou check-in direto | Permite receber cliente agendado ou chegada sem agendamento. | yes |
| Check-in direto primeiro | Agenda fica mais como consulta/controle. | |

**User's choice:** Agenda ou check-in direto.
**Notes:** Oficina real nem sempre agenda tudo; o fluxo precisa aceitar chegada direta.

### Status apos check-in

| Option | Description | Selected |
|--------|-------------|----------|
| Recebido | Confirma apenas que o veiculo entrou. | |
| Aguardando diagnostico | Conecta a recepcao com a proxima fase. | yes |
| Em atendimento | Pode confundir recepcao com execucao. | |

**User's choice:** Aguardando diagnostico.
**Notes:** O status deve preparar a ponte para diagnostico/orcamento.

### Agendamento convertido

| Option | Description | Selected |
|--------|-------------|----------|
| Marcar como concluido | Agendamento cumpriu seu papel. | |
| Marcar como convertido | Explicita que virou check-in/recepcao. | yes |
| Manter aberto | Pode deixar a agenda parecendo pendente. | |

**User's choice:** Marcar como convertido.
**Notes:** Rastreabilidade importa mais do que apenas concluir.

### Chegada sem agendamento

| Option | Description | Selected |
|--------|-------------|----------|
| Criar so check-in | Registra entrada sem mexer na agenda. | |
| Criar check-in e agendamento convertido automaticamente | Mantem tudo visivel na agenda/historico. | yes |
| Obrigar criar agendamento manual antes | Mais controle, mas atrapalha atendimento rapido. | |

**User's choice:** Criar check-in e um agendamento convertido automaticamente.
**Notes:** Padroniza rastreabilidade.

---

## Checklist e anexos

### Campos obrigatorios

| Option | Description | Selected |
|--------|-------------|----------|
| Minimo operacional | Cliente, veiculo, data/hora e quilometragem. | |
| Checklist completo | Coleta dados completos da recepcao. | yes |
| Quase tudo opcional | So cliente e veiculo obrigatorios. | |

**User's choice:** Checklist completo, mas com quilometragem e itens deixados opcionais.
**Notes:** Obrigatorios devem cobrir cliente, veiculo, entrada, combustivel e avarias/checklist de inspecao.

### Fotos e documentos

| Option | Description | Selected |
|--------|-------------|----------|
| Obrigatorios se houver avaria | Exige foto/anexo quando houver avaria. | |
| Sempre opcionais | Ajuda no registro, mas nao bloqueia check-in. | yes |
| Obrigar pelo menos uma foto | Todo check-in precisa de imagem. | |

**User's choice:** Sempre opcionais.
**Notes:** Atendimento rapido nao deve travar por anexos.

### Classificacao de anexos

| Option | Description | Selected |
|--------|-------------|----------|
| Tipo simples | Foto, Documento, Outro. | |
| Categorias detalhadas | Avaria, Documento, Painel, Motor, Interior, Outro. | yes |
| Sem categoria | Salva so arquivo com nome/tipo/tamanho. | |

**User's choice:** Categorias detalhadas.
**Notes:** Categorias escolhidas: Avaria, Documento, Painel, Motor, Interior, Outro.

### Edicao apos conclusao

| Option | Description | Selected |
|--------|-------------|----------|
| Tudo editavel com auditoria | Permite corrigir qualquer campo registrando historico. | yes |
| So anexos e observacoes | Dados principais ficam travados apos concluir. | |
| Nada editavel | Correcao exigiria novo registro ou fluxo posterior. | |

**User's choice:** Tudo editavel com auditoria.
**Notes:** Correcoes sao permitidas, mas precisam de trilha auditavel.

---

## Agenda visual

### Modelo principal

| Option | Description | Selected |
|--------|-------------|----------|
| Lista/tabela por horario | Simples, rapida de escanear e alinhada ao sistema atual. | yes |
| Calendario visual com blocos | Agenda tradicional, mais pesada no celular. | |
| Kanban por status | Bom para status, menos natural para horarios. | |

**User's choice:** Lista/tabela por horario como padrao.
**Notes:** Usuario tambem pediu configuracao para trocar para calendario visual ou kanban.

### Escopo da configuracao

| Option | Description | Selected |
|--------|-------------|----------|
| Por oficina/tenant | Todos os usuarios veem o mesmo modelo. | yes |
| Por usuario | Cada usuario escolhe sua preferencia. | |
| Padrao da oficina com escolha temporaria na tela | Tenant define padrao, usuario muda temporariamente. | |

**User's choice:** Por oficina/tenant.
**Notes:** Mais simples e consistente para a oficina.

### Acoes por linha

| Option | Description | Selected |
|--------|-------------|----------|
| Acoes principais | Fazer check-in, Editar, Cancelar. | yes |
| Acoes completas | Inclui duplicar e historico. | |
| Menu de acoes | Um botao abre todas as opcoes. | |

**User's choice:** Acoes principais.
**Notes:** Mantem a linha limpa e operacional.

### Mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela com rolagem horizontal | Mantem colunas do desktop. | |
| Lista compacta por horario | Linha/bloco com dados e acoes. | |
| Resumo + detalhes | Mostra resumo e abre detalhes/acoes em outra tela ou modal. | yes |

**User's choice:** Resumo + detalhes.
**Notes:** Mantem o celular limpo e reduz excesso de informacao na primeira tela.

---

## The Agent's Discretion

- O planner pode usar select/segmented control para o modelo da agenda, mesmo que o usuario tenha descrito checkbox, porque apenas uma visualizacao deve ficar ativa.
- O planner pode escolher nomes de permissao, endpoint e armazenamento desde que respeite tenant, auditoria, UI-SPEC e backend authoritative.

## Deferred Ideas

None.
