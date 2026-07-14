<!-- GSD:project-start source:PROJECT.md -->

## Project

**JO.IA - Sistema de Gestão para Oficina Automotiva**

JO.IA é um sistema multiempresa de gestão para oficinas automotivas, construído para cobrir o fluxo operacional completo: cadastro do cliente e veículo, agenda, recepção, diagnóstico, orçamento, aprovação por link seguro, ordem de serviço, produção, estoque, financeiro, histórico, portal do cliente, relatórios e auditoria.

O produto será desenvolvido progressivamente como uma aplicação web comercializável, com frontend em React/Vite/TypeScript, backend em Node.js/Express/TypeScript, PostgreSQL, Prisma e Docker Compose. A prioridade é entregar um MVP funcional e seguro que opere uma oficina de ponta a ponta com dados reais.

**Core Value:** Uma oficina consegue executar e auditar todo o ciclo de atendimento de um veículo, da entrada ao pagamento, com isolamento seguro por tenant e sem depender de comunicações automáticas com o cliente.

### Constraints

- **Tech stack**: React, Vite, TypeScript, Node.js, Express, TypeScript, PostgreSQL, Prisma e Docker Compose - mudanças exigem justificativa técnica e decisão registrada.
- **Security**: Autorização deve ser aplicada no backend; esconder botões no frontend não substitui validação.
- **Tenancy**: Todos os registros operacionais devem ser filtrados e validados pelo tenant autenticado.
- **Communications**: O sistema não envia mensagens, não abre WhatsApp automaticamente e não registra entrega/leitura de comunicações.
- **Data integrity**: Estoque, orçamento, OS e financeiro precisam de transações para evitar estados parciais.
- **Auditability**: Ações críticas devem registrar tenant, usuário, ação, entidade, registro, data/hora e valores relevantes sem armazenar segredos.
- **Quality**: Fases não podem ser concluídas com lint, type check, testes, migrations ou validações críticas falhando.
- **Validation**: Arquivos existentes, telas visíveis ou endpoints criados não provam conclusão; cada fase precisa de verificação executável.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Selected Stack

- **Frontend**: React, Vite, TypeScript.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL.
- **ORM/Migrations**: Prisma.
- **Local/runtime infrastructure**: Docker Compose, environment variables, secure secret handling, versioned migrations and backup strategy.

## Implementation Notes

- Use a workspace layout that keeps frontend and backend boundaries explicit, with shared types only when they reduce duplication without coupling unrelated layers.
- Keep API authorization in backend middleware/services, not only in route hiding or UI conditions.
- Model tenant isolation as a default data-access concern. Every operational query should either derive tenant scope from the authenticated principal or go through a helper that enforces it.
- Use Prisma migrations as the source of schema history. Avoid ad hoc database changes.
- Add a seed for development that is deterministic and clearly separated from production data.
- Treat file uploads and attachments as tenant-scoped resources from the first phase that introduces them.

## Quality Gates

- `lint`, type check and automated tests must be part of phase completion.
- Database migrations must be runnable from a clean database.
- Docker Compose must bring up the API, web app and PostgreSQL for local verification.
- Critical flows should get integration or end-to-end coverage before they are marked complete.

## Decisions To Confirm Later

- Monorepo package manager and workspace tool.
- Authentication token storage strategy.
- Password hashing algorithm and token rotation policy.
- File storage provider for production.
- Deployment target and backup schedule.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
