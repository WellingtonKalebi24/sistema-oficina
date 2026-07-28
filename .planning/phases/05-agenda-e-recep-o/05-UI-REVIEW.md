# Phase 05 - UI Review

**Audited:** 2026-07-28
**Baseline:** `.planning/phases/05-agenda-e-recep-o/05-UI-SPEC.md`
**Screenshots:** not captured (no dev server on localhost:3000, 5173 or 8080)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | WARNING: Core Portuguese operational copy is present, but attachment category copy diverges from UI-SPEC. |
| 2. Visuals | 2/4 | WARNING: Table-first agenda exists, but mobile compact-row/detail behavior and true calendar visualization are weak in code. |
| 3. Color | 2/4 | WARNING: Base palette matches the contract, but active agenda tabs use primary green instead of reserved accent and CSS adds many ad hoc tints. |
| 4. Typography | 2/4 | WARNING: Phase 5 CSS uses 700/800/900 weights and many rem sizes, violating the approved 400/600 typography contract. |
| 5. Spacing | 2/4 | WARNING: The UI uses a stable spacing system, but the implemented token scale centers on 12px and hardcoded dimensions beyond declared exceptions. |
| 6. Experience Design | 3/4 | WARNING: Loading/error/empty/confirmation states exist, but row action bubbling and missing in-agenda pending state degrade interaction quality. |

**Overall: 14/24**

---

## Top 3 Priority Fixes

1. **Normalize Phase 5 typography to the approved roles** - Dense reception panels currently use weights 700/800/900 and several off-contract sizes, making the UI feel heavier than the approved operational design. Change Phase 5 selectors to 14px/400 body, 12px/600 labels, 20px/600 headings and 28px/600 display where applicable.
2. **Fix mobile agenda behavior and visual modes** - The daily table stays `min-width: 820px` and the calendar mode renders the same chip list shape instead of a visual calendar. Add a compact mobile row summary with separate details/actions and make `Calendario visual` a real calendar layout using the same appointment data.
3. **Bring colors and spacing back to the declared contract** - Active agenda mode tabs use primary green where the spec reserves accent for finite mode selection, and CSS introduces multiple hardcoded tint colors/dimensions. Convert Phase 5-specific tints to semantic variables and align the spacing token map with 4/8/16/24/32 plus the explicitly allowed 12px exceptions.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- WARNING: Required core copy is implemented: `Salvar agendamento`, `Registrar check-in direto`, `Fazer check-in`, `Concluir check-in`, `Salvar checklist`, `Anexar arquivo`, blocked 403 copy and the destructive cancel confirmation appear in `apps/web/src/App.tsx` and `apps/web/src/api/reception.ts` (`App.tsx:1884`, `App.tsx:2005`, `App.tsx:2167`, `App.tsx:2191`, `App.tsx:2549`, `App.tsx:2780`, `App.tsx:2831`, `api/reception.ts:347`, `api/reception.ts:362`).
- WARNING: Attachment category copy conflicts with the approved UI-SPEC. The spec says accepted UI categories are `Foto`, `Documento`, `Outro` (`05-UI-SPEC.md:178`), while the UI and API client expose `Avaria`, `Documento`, `Painel`, `Motor`, `Interior`, `Outro` (`apps/web/src/App.tsx:1625`, `apps/web/src/api/reception.ts:33`). This may be intentional from D-09 context, but it is still a contract divergence against the requested UI-SPEC baseline.
- WARNING: Communication-prohibited terms are absent from the Phase 5 reception UI tests, and the suite explicitly guards against those terms (`apps/web/src/test/reception-ui.test.tsx:524`). Matches for `email` in `App.tsx` are auth/customer legacy surfaces, not Phase 5 agenda/reception controls.

### Pillar 2: Visuals (2/4)

- WARNING: The agenda first screen is correctly anchored by a table: `activeMode` defaults to `day`, the panel title resolves to `Agenda diaria`, and `DailyAgendaTable` renders the specified columns (`apps/web/src/App.tsx:1693`, `apps/web/src/App.tsx:1926`, `apps/web/src/App.tsx:2227`).
- WARNING: The mobile contract is only partially met. CSS keeps the agenda table at `min-width: 820px` and relies on horizontal overflow (`apps/web/src/styles.css:552`), but D-16 requires compact mobile row summaries with details/actions in a separate screen or modal. The implementation has a side detail panel, yet no mobile-specific compact row component is present.
- WARNING: `Calendario visual` is not a real visual calendar. It reuses `.weekly-agenda` and renders appointment chips in a simple grid/list (`apps/web/src/App.tsx:1902`, `apps/web/src/App.tsx:2909`). This satisfies "real data" but not the visual model implied by D-13 and the tab label.
- WARNING: Appointment and check-in tables display `vehicle.id` in the `Veiculo` column (`apps/web/src/App.tsx:2245`, `apps/web/src/App.tsx:2319`). This weakens scan value because operators need vehicle make/model or an intelligible summary, not an internal ID.

### Pillar 3: Color (2/4)

- WARNING: The base contract palette is present as CSS variables: dominant `#f4f7f6`, surfaces `#ffffff`/`#eef3f1`, accent `#c58b2f`, destructive `#b4343a`, primary `#176b5b`, success `#237348`, info `#2f66a0` (`apps/web/src/styles.css:11` through `apps/web/src/styles.css:22`).
- WARNING: Active finite agenda tabs use primary green via `.stock-tab--active` instead of the UI-SPEC accent reservation for active day/week selector and finite-mode selection (`apps/web/src/styles.css:697`, `05-UI-SPEC.md:69`). This shifts accent distribution and makes mode selection visually compete with completion/navigation semantics.
- WARNING: Phase 5 CSS adds many hardcoded tints outside the declared role table: `#fff7e8`, `#fffaf0`, `#faeeee`, `#edf4fb`, `#eaf5ef`, `#8d252b`, `hsl(...)` and several `rgba(...)` values (`apps/web/src/styles.css:400`, `styles.css:406`, `styles.css:436`, `styles.css:442`, `styles.css:729`, `styles.css:893`, `styles.css:898`). These may be reasonable semantic tints, but they are not declared tokens and make 60/30/10 auditing unreliable.

### Pillar 4: Typography (2/4)

- WARNING: The approved UI-SPEC allows new Phase 5 weights 400 and 600 only (`05-UI-SPEC.md:56`). CSS uses 700, 800 and 900 for eyebrows, labels, buttons, required marks, check rows and confirmations (`apps/web/src/styles.css:88`, `styles.css:192`, `styles.css:200`, `styles.css:206`, `styles.css:298`, `styles.css:311`, `styles.css:649`, `styles.css:765`).
- WARNING: Implemented font sizes include at least `0.76rem`, `0.78rem`, `0.82rem`, `0.86rem`, `0.88rem`, `0.9rem`, `1.05rem` and `1.72rem` (`apps/web/src/styles.css:87`, `styles.css:100`, `styles.css:106`, `styles.css:595`, `styles.css:635`, `styles.css:671`). The contract defines four roles: 12px, 14px, 20px and 28px. The result is close visually in places, but not contract-compliant.
- WARNING: Table headers are uppercase and muted as requested, but their weight inherits from the broader 700 label pattern instead of the specified 600 role (`apps/web/src/styles.css:431`, `styles.css:432`).

### Pillar 5: Spacing (2/4)

- WARNING: A reusable spacing system exists, but it does not match the declared token map. CSS defines `--space-3: 12px` and uses it broadly for panel gaps, forms, filters, attachment rows and table areas (`apps/web/src/styles.css:26` through `styles.css:30`, `styles.css:525`, `styles.css:557`, `styles.css:615`, `styles.css:631`). The UI-SPEC permits 12px only for compact agenda slots and attachment rows, not as the default reception rhythm.
- WARNING: Several hardcoded dimensions are outside the declared spacing scale or exceptions: `40px` shell padding, `86px` topbar height, `620px`/`820px` table widths, `180px`/`340px`/`440px` grid tracks and `20px` mobile shell gutter (`apps/web/src/styles.css:63`, `styles.css:79`, `styles.css:417`, `styles.css:552`, `styles.css:530`, `styles.css:935`). Some are pragmatic layout constraints, but the spec asked auditors to verify against declared spacing/breakpoint rules.
- WARNING: Mobile breakpoints exist at 820px and 640px (`apps/web/src/styles.css:907`, `styles.css:933`), but there is no specific mobile agenda row/detail pattern beyond grid collapse and table overflow.

### Pillar 6: Experience Design (3/4)

- WARNING: State coverage is substantially present: initial skeleton loading (`apps/web/src/App.tsx:974`), empty agenda and check-in states (`App.tsx:1947`, `App.tsx:2294`), backend-authoritative blocked state (`App.tsx:986`, `api/reception.ts:347`), error callouts with `role="status"` (`App.tsx:2183`, `App.tsx:2552`, `App.tsx:2783`, `App.tsx:2867`), disabled submit states (`App.tsx:2167`, `App.tsx:2548`, `App.tsx:2831`) and destructive confirmations (`App.tsx:2191`, `App.tsx:2690`).
- WARNING: Refreshing agenda/check-in data has no visible in-panel pending state. `changeMode` and `refreshCurrentMode` await API calls but do not set a local loading indicator for the agenda panel (`apps/web/src/App.tsx:1743`, `App.tsx:1762`). This can make slow API transitions look inert after the shell has loaded.
- WARNING: Table action buttons are inside a clickable `<tr>` without stopping propagation (`apps/web/src/App.tsx:2242`, `App.tsx:2255`, `App.tsx:2262`, `App.tsx:2271`). Activating `Fazer check-in`, `Editar` or `Cancelar` can also select the row and change the detail panel, which is a small but real interaction defect.
- WARNING: The check-in table currently renders attachment count as a literal `0` for every row (`apps/web/src/App.tsx:2335`), so the scan view does not reflect persisted attachment metadata even after attachments are supported in detail.

---

## Registry Safety

Registry audit skipped: `components.json` is not present and UI-SPEC declares no third-party registry blocks.

---

## Files Audited

- `.planning/phases/05-agenda-e-recep-o/05-UI-SPEC.md`
- `.planning/phases/05-agenda-e-recep-o/05-CONTEXT.md`
- `.planning/phases/05-agenda-e-recep-o/05-01-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-02-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-03-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-04-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-05-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-06-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-07-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-08-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-09-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-10-PLAN.md`
- `.planning/phases/05-agenda-e-recep-o/05-01-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-02-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-03-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-04-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-05-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-06-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-07-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-08-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-09-SUMMARY.md`
- `.planning/phases/05-agenda-e-recep-o/05-10-SUMMARY.md`
- `apps/web/src/App.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/api/reception.ts`
- `apps/web/src/test/reception-ui.test.tsx`
