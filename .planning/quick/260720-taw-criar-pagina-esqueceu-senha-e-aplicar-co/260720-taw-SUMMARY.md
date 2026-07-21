---
quick_id: 260720-taw
slug: criar-pagina-esqueceu-senha-e-aplicar-co
status: complete
date: 2026-07-21
---

# Quick Task 260720-taw Summary

Implemented the requested forgot-password route and shadcn/UI-style access components.

## Changes

- Login now shows `Esqueceu a senha?` under the password input.
- Clicking it navigates to `/forgot-password`.
- `/forgot-password` renders a dedicated form with the registered email, recovery code and new password.
- The recovery page defaults to `wellingtonrdp16@gmail.com` and confirms that the code was sent to that registered email.
- Added local shadcn/UI-style `Button`, `Card`, `Input`, `Label` and `cn` primitives.
- Updated the local development database admin email from `admin-inicial@joia.test` to `wellingtonrdp16@gmail.com`.

## Verification

- `npm run test -w apps/web -- auth-ui` passed: 5 tests.
- `npm run typecheck -w apps/web` passed.
- `npm run lint -w apps/web` passed.
- Targeted `npm run format:check` passed.
- `POST /auth/login` with `wellingtonrdp16@gmail.com` and `Senha-forte-123` returned 200.

## Notes

- No new package was installed. shadcn/UI components were added locally, which matches the copy-into-project model.
- Actual email delivery still depends on SMTP environment variables; without SMTP the backend records the reset request but uses the existing no-op local sender.
