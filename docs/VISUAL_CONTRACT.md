# JO.IA Visual Contract

## Purpose

This is the canonical UI contract for JO.IA before business screens are implemented. The product should read as a compact operational back-office surface for automotive workshops, not a marketing site.

## Palette

- Background: `#f4f7f6`, a quiet neutral work surface.
- Surface: `#ffffff`, used for panels, forms, tables and dialogs.
- Muted surface: `#eef3f1`, used for status strips and low-emphasis controls.
- Text: `#18211f`, high-contrast operational text.
- Muted text: `#5b6b66`, secondary labels and helper text.
- Primary: `#176b5b`, main command buttons and active states.
- Accent: `#c58b2f`, focus rings and scarce emphasis.
- Success: `#237348`, recorded/synced states.
- Error/destructive: `#b4343a`, failed or destructive states.
- Information: `#2f66a0`, loading and neutral guidance states.

## Typography

- Use system sans-serif fonts for fast rendering and predictable density.
- Page titles stay compact; avoid oversized display type inside operational screens.
- Labels are short, explicit and close to their controls.
- Letter spacing remains `0`; do not scale text by viewport width.

## Spacing

- Base increments: 4, 8, 12, 16 and 24 px.
- Dense operational panels use 16 px padding by default.
- Related controls stay in the same row when space allows and wrap cleanly on mobile.

## Radius and Shadows

- Cards, panels and dialogs use radius up to 8 px.
- Inputs and buttons use 6 px radius.
- Shadows are subtle and reserved for panels or modals, not decorative page sections.

## Buttons

- Primary buttons perform the main command on the current panel.
- Secondary buttons clear, cancel or navigate without changing persisted state.
- Destructive buttons use the danger color and require clear operator intent.
- Disabled buttons must remain readable and communicate pending work.

## Forms

- Every input needs a visible label.
- Helper text explains operational constraints, not product marketing.
- Validation errors use concise, action-oriented text.
- Backend validation remains authoritative; frontend checks are convenience only.

## Tables

- Tables are preferred for persisted operational rows.
- Headers use short labels and muted uppercase styling.
- Rows should not shift size when status badges or values update.
- Horizontal overflow is allowed on narrow screens instead of crushing columns.

## Filters

- Filters should be compact, labeled and placed near the table or list they affect.
- Use segmented controls or selects for finite modes.
- Do not use persistent counters that imply message or notification delivery.

## Modals

- Modals are reserved for blocking confirmation or focused editing.
- Destructive confirmations must name the action and require an explicit button.
- Keep modal content terse; long operational flows should be full screens or panels.

## Loading and Skeleton States

- Loading states use compact skeleton rows or inline progress text.
- Skeletons preserve layout dimensions and avoid shifting the table or form.
- Loading copy should describe the data source, such as "Sincronizando com a API".

## Empty States

- Empty states explain the next operational action.
- Avoid illustration-heavy or promotional empty states.
- Empty state text should not imply customer communication or automated outreach.

## Success States

- Success states confirm the completed local action and persisted data.
- Success messages must not claim delivery, reading, sending or external communication.

## Error States

- Error states explain what failed and which local system to check.
- API and database errors should not leak stack traces, connection strings or secrets.

## Destructive States

- Use danger color only for destructive or failed operations.
- Destructive actions require explicit operator confirmation.
- Future business phases must keep destructive actions audited by backend rules.

## Status Colors

- Success means synced, recorded or available.
- Error means failed, unavailable or destructive.
- Information means loading, pending or neutral guidance.
- Warning may be introduced later for calculated visual alerts only.

## Icons

- Use familiar icons when an icon library is available.
- Icons must have accessible names when interactive.
- Do not use icons to imply WhatsApp, email, SMS, push or automated delivery behavior.

## Accessibility

- Keyboard focus uses an accent outline with at least 3 px thickness.
- Inputs and buttons must be reachable by keyboard.
- Text contrast should meet WCAG AA for normal operational text.
- Status changes that matter to the operator should use `role="status"` or equivalent.

## Responsive Behavior

- Desktop uses two-column operational layouts when useful.
- Mobile collapses to one column without hidden required controls.
- Tables may scroll horizontally when fixed columns would become unreadable.

## Brazilian Formatting

- Date and time use `pt-BR` with `America/Sao_Paulo` unless a later phase records a different tenant-specific decision.
- Currency uses BRL formatting through `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Numeric fields should preserve separators familiar to Brazilian operators.

## Interface Vocabulary

- Prefer "cliente", "veiculo", "ordem de servico", "orcamento" and "pagamento" when those modules exist.
- In Phase 1, use neutral words such as "verificacao", "fundacao" and "registro".
- Avoid "campanha", "mensagem", "disparo", "entrega" and similar communication language unless a future decision explicitly changes scope.

## Alerts

Alerts are calculated visual states only. JO.IA does not implement automatic customer messages, message queues, notification centers, WhatsApp integration, email integration, SMS or push behavior.
