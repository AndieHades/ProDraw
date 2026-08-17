# Brush Library and Studio UI Reference

Source: sixteen user-provided Procreate screenshots plus the user's correction
to preserve the original ProDraw brush panel, 2026-08-16. This chapter records
the required information so implementation does not depend on chat or external
image paths.

## Brush library layout

- The exact original compact, movable and resizable ProDraw `brush-pop` remains
  the library shell; the later two-pane replacement is rejected.
- The body is the original quick-scanning grid of brush tiles. Each tile shows a
  large Photoshop-style circular tip imprint rendered by the production brush
  engine from the real Shape and Grain. The imprint fills the circle so its
  texture and soft, hard or broken edge remain legible; never squeeze a long
  QuickLook stroke into the circle or substitute a generic glyph.
- The brush name is always visible directly below its circular preview; selected
  brush keeps the original high-contrast blue tile. Long names use ellipsis plus
  their complete title/accessible name without turning the library into rows.
- Original mouse/pen/touch drag-and-drop reorders tiles and persists their order.
- Physical set folders remain the ownership/persistence model, but they must not
  force a replacement of this compact library shell.
- The workspace top rail keeps Brush, Smudge, Eraser, Layers and active colour
  visually distinct while the library is open.
- Brush Studio owns per-brush stabilization; there is no duplicate global
  stabilization button on the workspace panel.
- Brush, Eraser and Smudge begin the compact movable two-column tool panel;
  dragging its separate grip moves every tool together and the last position
  survives restart. The complete order is owned by
  [`05-tool-panel-ui-reference.md`](05-tool-panel-ui-reference.md).

The target may adapt exact pixel dimensions for Windows, but must preserve the
original panel geometry, quick scanning and one-click brush selection.

## Brush Studio shell

Brush Studio is a compact resizable Windows floating window, approximately
1040×720 by default and never forced fullscreen. This default is large enough
for the navigation list without a cosmetic scrollbar. It retains three columns:

1. left navigation of property sections;
2. middle controls for the selected section;
3. large right Drawing Pad using the production renderer.

The top right has explicit `Cancel` and Apply/check actions. Controls edit a
draft. Cancel leaves the preset byte-for-byte unchanged; Apply atomically saves
one new preset revision and refreshes every preview.

## Windows invocation and context actions

- Single LMB selects a brush without opening settings.
- Double LMB on a brush row opens its compact Brush Studio window.
- RMB opens a pointer-anchored menu in this order: `Edit`, `Duplicate`, `Delete`.
- Pen double-tap/context-button equivalents use the same commands; touch keeps
  an accessible long-press alternative without changing desktop semantics.
- Delete requires confirmation and uses the app's recoverable trash policy.

## Folder-backed ownership

Brush sets correspond to real Windows directories under
`%APPDATA%\ProDraw\brushes\<set name>\`. Each directory owns its set metadata
and native `.prodraw-brush` files. Repository assets in
`src/app-folders/brushes/main` seed the user `Main` directory once and remain
immutable source assets.

Creating a brush writes atomically into the currently selected set directory;
duplicating writes beside its source brush, so a smart Recent/Favorites view
cannot accidentally change ownership. Moving a brush between sets moves its file; renaming a set
renames its directory with collision/invalid-character handling. External file
changes are reconciled explicitly and cannot silently orphan catalog records.

## Shape and Grain Source Library

- Shape and Grain each show the effective source preview and an `Edit` button
  before their behavior controls.
- `Edit` opens one compact Source Library with Shape Source and Grain Source
  tabs; the invoking section is selected initially.
- Every usable native shape/grain extracted from every live brush archive is a
  card. The card label is the source brush name, not an opaque file/hash.
- Imported and newly created brushes contribute their available resources
  automatically. Deleting the last brush that owns an unused resource removes
  it from the library; no separate resource-management workflow is required.
- Selecting a resource embeds an owned copy in the target preset. A target
  stroke therefore remains reproducible after the original brush is deleted.
- Identical bytes may be deduplicated internally, but visible provenance must
  remain understandable. No search control is required.

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

Taper preserves the screenshot hierarchy instead of flattening every value into
one undifferentiated list:

- Pressure Taper graph with independent start/end handles;
- Link Tip Sizes, Size, Opacity, Pressure, Tip and Tip Animation;
- Touch Taper graph with independent handles, Link Tip Sizes, Size, Opacity and
  Tip;
- values whose rendering contract is not implemented remain visibly unavailable,
  never enabled no-ops.

Shape:

- large live Shape Source preview with an explicit Edit action;
- Input Style: Touch Only, Azimuth, or Azimuth and Barrel Roll;
- Relative to Stroke, touch rotation/follow-stroke and Scatter;
- Windows maps azimuth to pen tilt direction. Barrel roll appears only when the
  Pointer Event/native Huion adapter supplies real twist data.

Grain:

- large live Grain Source preview with Edit;
- Moving/Texturized behavior switch;
- Movement, Scale, Zoom, Rotation, Depth and Depth Minimum;
- source and behavior affect the same production sampler used by document,
  brush-row preview and Drawing Pad.

Rendering:

- one rendering-mode selector using the screenshot grouping (Light/Uniformed/
  Intense/Heavy Glaze and Uniform/Intense Blending);
- Flow plus explicit blending controls;
- Wet Edges, Burnt Edges and their special modes may only be enabled after a
  tested algorithm exists. This does not reintroduce the excluded Wet Mix section.

Dynamics:

- Speed group: Size, Opacity and Spacing;
- Jitter group: Size and Opacity;
- values are deterministic under an injected stroke seed so Undo/replay and
  golden previews do not change randomly.

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

The section translates the Apple Pencil screenshots into available Windows Ink/
Huion data:

- editable pressure response graph plus Size, Opacity and Flow;
- Tilt graph/angle, Opacity, Gradation, Size and Size Compression;
- Barrel Roll Size/Opacity only when real twist is present;
- configurable barrel-button/eraser actions and live diagnostics;
- Cursor Outline and Hover controls only when the platform reports those
  capabilities. Estimated pressure, Hover Fill and model-specific claims stay
  hidden otherwise.

Bleed is omitted with Wet Mix. A missing Apple-only signal is never simulated.

## Properties section

- Orient to Screen;
- Smudge Pull as a bridge to the first-class Smudge tool, not a Wet Mix panel;
- Maximum/Minimum Size and Maximum/Minimum Opacity;
- limits clamp the production dab, preview and Smudge paths identically.

## Acceptance

- Brush selection is one direct click/tap in the original compact grid.
- Every brush has a large real tip imprint and a visible name below it; long
  names remain identifiable without collapsing the preview width. Screentone
  previews visibly retain their dots/grid instead of becoming a solid disc.
- Drawing Pad and document strokes match for the same actual samples and preset.
- Keyboard/pen/touch can reach Cancel/Apply and all sliders.
- Resizing preserves the hierarchy via responsive panes, not overlapping UI;
  no command turns Brush Studio into a forced fullscreen surface.
- Duplicate/create/move operations leave matching files in the visible set's
  physical folder after restart.
