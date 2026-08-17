# Stage ME-3: Editable Brightness/Contrast Effect

- Stable id: `ME-3`
- Status: `done`
- Depends on: `ME-1`
- Requirements: `BC-01`, `BC-02`, `BC-03`

## Change map

- `src/config`, `index.html`, `src/i18n`: an explicit Brightness/contrast button
  immediately after Monochrome, with a distinct icon and RU/EN name.
- `src/systems/brightness-contrast.js`: a dedicated layer-effect mode exposes
  only brightness and contrast while retaining the extended canvas workflow.
- `src/systems/effects/settings.js`: the generic panel routes `adjustment`
  through the typed action boundary to its live editor.
- `src/systems/layers/fx-rows.js`: a selected adjustment row opens for editing
  on the next click.
- `test/module-int.mjs`: adjacency, visible controls, live draft, Apply, clone,
  Undo, reopen and floating-window ordering evidence.

## Contract

The stored effect remains `{ type: "adjustment", params }`, so generic effect
history, copy, gallery persistence and bounded rendering stay authoritative.
New layer/folder effects expose `brightness` and `contrast` from `-100..100`.
Legacy `saturation` and `hue` values remain readable and are not discarded, but
they are not shown in this two-control effect surface.

Moving either slider updates only the effect draft and visible composite.
Apply creates or updates one effect-history entry; Cancel/Undo restore the
previous parameters. Source RGBA remains unchanged.

The first unmodified click selects the effect row. Repeating the click opens the
two stored values, raises the editor above Layers and keeps it draggable.

## Edge and failure cases

- Switching the eye off bypasses rendering without deleting parameters.
- Existing four-parameter adjustments reopen without losing hidden legacy data.
- An absent layer/folder target creates no draft and does not mutate the document.
- Ctrl/Meta and Shift clicks retain multi/range selection instead of editing.

## Acceptance

- Brightness/contrast is immediately beside Monochrome in the effects panel.
- Its window contains exactly two visible sliders plus Apply/Cancel.
- Live input changes the draft; Apply, clone and gallery reopen preserve values.
- A second click on the selected effect row reopens those values above Layers.
- Undo after an edit restores the prior brightness and contrast.

## Completion record

- Commit: `feat: add editable brightness contrast effect`.
- Checks: 394 module integration tests, `validate:changed`, production build
  and live in-app browser verification.
- Browser evidence: create effect, set `30/-10`, Apply, reload gallery document,
  click the row twice and observe the same values in a two-slider foreground
  window.
