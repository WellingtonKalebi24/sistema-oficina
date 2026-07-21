---
quick_id: 260720-taw
slug: criar-pagina-esqueceu-senha-e-aplicar-co
status: planned
date: 2026-07-21
---

# Quick Task 260720-taw: Criar pagina esqueceu senha e aplicar componentes shadcn ui no acesso

## Goal

Move password recovery to a dedicated route and apply local shadcn/UI-style primitives to the access flow.

## Scope

- Put `Esqueceu a senha?` directly below the password input on login.
- Navigate to `/forgot-password` when clicked.
- Render a dedicated forgot-password page with email, reset code and new-password fields.
- Default the registered recovery email to `wellingtonrdp16@gmail.com`.
- Add local shadcn/UI-style primitives for Button, Card, Input and Label.
- Update local development database admin email to `wellingtonrdp16@gmail.com`.

## Verification

- `npm run test -w apps/web -- auth-ui`
- `npm run typecheck -w apps/web`
- `npm run lint -w apps/web`
- targeted `npm run format:check`
- real login request with `wellingtonrdp16@gmail.com` returned 200.
