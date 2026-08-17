# C1: Preserved TypeScript shell

- Stable id: `C1`
- Depends on: `C0`
- Status: `in_progress`
- Scope: composition, DOM presenters, gestures, i18n/theme and pure shared helpers

## Change map

- convert shell/UI modules by panel family under strict TypeScript;
- replace global action registration with typed command dispatch;
- centralize shared floating window, persisted preference, menu and numeric-field
  contracts where semantics are identical;
- lazy-load optional windows without changing their visible trigger.

## Steps

1. Define the complete typed action/tool registry and view-model leaves.
2. Port top bar, brush bar, tool panel, floating window and panel persistence.
3. Port gallery/layer/palette/reference/preview shell presenters without moving
   their document mutation yet; temporary adapters may dispatch to one old owner.
4. Port RU/EN and theme bindings; remove hardcoded visible strings/styles found
   by the validator.
5. Split the 12 over-limit production exemptions and record every removed one.
6. Add entrypoint-aware dead export and bundle manifest checks.

## Edge and failure cases

Invalid stored panel geometry resets one panel only. A lazy module failure keeps
the editor usable and reports a localized error. Mouse, pen, touch and keyboard
retain alternate access to core commands.

User-approved shell delta: the layer panel has no dedicated tilemap conversion
button. Its two action rows are always balanced 7/7; cross-row reorder displaces
another button to the opposite row, and the minimum panel width is derived from
the longest row so no icon is clipped. Layer/folder/effect rows grow the panel
down to the viewport edge; only additional content introduces list scrolling.

## Checks

- exact DOM/order/ARIA and panel drag/resize/reload tests;
- RU/EN live-switch and theme-token validators;
- focused shell browser smoke at representative viewport sizes;
- check, lint, cycles, interface and bundle gates.

## Acceptance

The current interface is visually and behaviourally unchanged, shell ownership
is TypeScript, optional modules are isolated, and no new global mutation API is
introduced.

## Completion record

- Commit: pending
- Checks: pending
- Residual risk: pending
