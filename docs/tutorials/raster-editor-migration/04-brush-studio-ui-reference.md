# Brush Library and Studio UI Reference

Source: three user-provided Procreate screenshots, 2026-08-16. This chapter
records the required information so implementation does not depend on chat or
external image paths.

## Brush library layout

- A compact floating dark panel opens from the active paint tool.
- Header shows the library name with a disclosure control and a large add button.
- Left rail is a vertically scrollable list of rounded set rows. `Recent` is a
  smart row at the top; normal sets use a brush-mark icon.
- Selected set is a high-contrast blue rounded rectangle. Unselected sets are
  quiet charcoal cards with readable names that may wrap to two lines.
- Right pane is a vertically scrollable brush list for the selected set.
- Each brush row shows its name and a wide horizontal live stroke preview, not
  only a tip thumbnail. Soft, grainy, opaque and line brushes must look distinct.
- Selected brush becomes one blue rounded row containing both name and preview.
- The workspace top rail keeps Brush, Smudge, Eraser, Layers and active colour
  visually distinct while the library is open.

The target may adapt exact pixel dimensions for Windows, but must preserve this
information hierarchy, quick scanning and one-click set/brush selection.

## Brush Studio shell

Brush Studio is a compact resizable Windows floating window, approximately
900×620 by default and never forced fullscreen. It retains three columns:

1. left navigation of property sections;
2. middle controls for the selected section;
3. large right Drawing Pad using the production renderer.

The top right has explicit `Cancel` and Apply/check actions. Controls edit a
draft. Cancel leaves the preset byte-for-byte unchanged; Apply atomically saves
one new preset revision and refreshes every preview.

## Windows invocation and context actions

- Single LMB selects a brush without opening settings.
- Double LMB on a brush row opens its compact Brush Studio window.
- RMB opens a pointer-anchored menu with `Duplicate` and `Delete`.
- Pen double-tap/context-button equivalents use the same commands; touch keeps
  an accessible long-press alternative without changing desktop semantics.
- Delete requires confirmation and uses the app's recoverable trash policy.

## Folder-backed ownership

Brush sets correspond to real Windows directories under
`%APPDATA%\ProDraw\brushes\<set name>\`. Each directory owns its set metadata
and native `.prodraw-brush` files. Repository assets in
`src/app-folders/brushes/main` seed the user `Main` directory once and remain
immutable source assets.

Creating or duplicating a brush writes atomically into the currently selected
set directory. Moving a brush between sets moves its file; renaming a set
renames its directory with collision/invalid-character handling. External file
changes are reconciled explicitly and cannot silently orphan catalog records.

## Included navigation sections

In this order:

1. Stroke Path
2. Stabilization
3. Taper
4. Shape
5. Grain
6. Rendering
7. Dynamics
8. Huion Stylus
9. Properties
10. Preview
11. About This Brush

Explicitly absent: `Wet Mix`, `Color Dynamics`, `Materials`, `Apple Pencil`.
Smudge mixing controls belong to the Smudge tool contract, not Wet Mix.

## Screenshot-defined controls

Stroke Path:

- Spacing;
- Spacing Jitter;
- Jitter Lateral;
- Jitter Linear/longitudinal;
- Fall Off.

Stabilization:

- StreamLine: Amount and Pressure;
- Stabilization: Amount;
- Motion Filtering: Amount and Expression.

Each slider shows a compact current value (`None` or percent), supports precise
keyboard entry and updates Drawing Pad immediately.

## Huion Stylus section

The Huion-oriented section exposes pressure calibration/curve, minimum pressure,
size and opacity response, tilt mapping, barrel-button and eraser mapping, plus
a diagnostic pad showing actual pressure/tilt/button values. It consumes generic
Windows pen Pointer Events first; a future native adapter is allowed only behind
the platform port if a Huion driver does not expose required data.

No UI claims to detect a Huion model when the browser/driver provides no device
identity. The product label describes the supported workflow, not invented data.

## Acceptance

- Set and brush selection are each one direct click/tap.
- Long names remain identifiable without collapsing the preview width.
- Drawing Pad and document strokes match for the same actual samples and preset.
- Keyboard/pen/touch can reach Cancel/Apply and all sliders.
- Resizing preserves the hierarchy via responsive panes, not overlapping UI;
  no command turns Brush Studio into a forced fullscreen surface.
- Duplicate/create/move operations leave matching files in the visible set's
  physical folder after restart.
