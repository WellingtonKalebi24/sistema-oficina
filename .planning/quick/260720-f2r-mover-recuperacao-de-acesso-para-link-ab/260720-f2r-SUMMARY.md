---
quick_id: 260720-f2r
slug: mover-recuperacao-de-acesso-para-link-ab
status: complete
date: 2026-07-20
---

# Quick Task 260720-f2r Summary

Moved account recovery out of the side-by-side login layout.

## Changes

- `AuthWorkspace` now renders a single-column auth flow.
- The login form includes a `Recuperar acesso` link-style button below `Entrar`.
- The recovery form is hidden on initial login and appears below the login after the link is clicked.
- UI coverage now asserts the recovery form is not visible until requested.

## Verification

- `npm run test -w apps/web -- auth-ui` passed: 5 tests.
- `npm run typecheck -w apps/web` passed.
- `npm run lint -w apps/web` passed.
- `npm run format:check -- apps/web/src/App.tsx apps/web/src/styles.css apps/web/src/test/auth-ui.test.tsx` passed.

## Notes

- No API changes.
- No package installation.
