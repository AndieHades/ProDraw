# PSD2: New Gallery Document Route

- Stable id: `PSD2`
- Depends on: `PSD1`
- Status: `pending`

## Scope

- Add one import transaction owned by the gallery/document workflow.
- Route Gallery Import, editor File/Ctrl+O and window drop through it.
- Detect PSD by extension, vendor MIME or `8BPS` header.
- Build a new layer/folder state, assign a fresh id and preserve DPI/name.
- Save the prior work, persist the imported work, then open the editor.
- Roll back active state and remove incomplete records on failure.

## Checks

The entrypoint matrix proves identical output from gallery picker, editor picker,
Ctrl+O and drop over both gallery/editor. Race tests cover delayed decode/save
against New, Open and a second import. Restart/reopen proves gallery presence.

## Completion Record

- Commit: pending
- Checks: pending
- Residual risk: pending
