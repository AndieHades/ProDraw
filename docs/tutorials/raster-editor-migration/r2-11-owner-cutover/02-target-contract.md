# Target contract

## Production graph

`index.html -> src/main.ts -> src/app/* composition -> typed systems/UI` is the
only product path. Test fixtures may load an archived oracle, but production,
Vite and Electron packaging must not import it.

## Document ownership

One `EditorSession` owns:

- a versioned nested document/layer tree;
- tiled RGBA surfaces and immutable source snapshots;
- byte-bounded raster plus structural history;
- selection/mask, view, active tool/brush and dirty/native-save state;
- serializable view models emitted after committed commands.

No UI module reads or writes surface bytes. No alternate `S`, dense grid or
second document repository can become authoritative.

## Interface preservation

The current `index.html` structure, SVG language, top/brush/tool bars, floating
panels, two-column order, gallery-first boot and panel persistence are the visual
contract. Migration may split markup into typed templates only if rendered DOM
and behaviour parity checks remain exact.

Every retained button dispatches a typed command. A function is ported only
when its positive result, Undo boundary, failure behaviour and save/reopen effect
are observable. Unsupported work is disabled with localized explanation, never
silently routed to the old owner.

## TypeScript boundary

- strict TypeScript covers all production code;
- `contracts` are serializable and DOM-free;
- pure calculations live in `logic`;
- `core` owns document/history/persistence infrastructure;
- each `system` owns one process and imports no other system;
- `ui` renders copied view models and dispatches commands;
- `platform` exclusively owns browser/Electron APIs;
- `app` is the only composition root.

Temporary migration adapters may translate a typed command to an unported
oracle during an intermediate stage only when they do not own image data, are
absent from the next stage acceptance and cannot ship after `C6`.

## Performance contract

Pointer handlers remain bounded by stroke footprint. Rendering composites only
dirty visible tiles. History, serialization and exports keep existing F3 byte,
latency and cancellation budgets. Optional panels and heavy codecs load after
the workspace is interactive.

## Persistence compatibility

Existing ProDraw and historical Pixel Heart IndexedDB records, palette/font
stores and native files remain readable through explicit migrations. New writes
use ProDraw schemas. A failed migration preserves the source record and exposes
a localized recovery action.

## Stabilized behaviour compatibility

- gallery enumeration never materializes heavy document pixels;
- imports expose delayed progress through their actual terminal result;
- Pan remains available from every mode and all mouse buttons under the recorded
  hit-region precedence;
- normal Crop and selected-layer/folder trim remain distinct adjacent commands;
- selected trim includes hidden descendants, keeps the largest union and stores
  off-canvas pixels so one Undo restores the exact prior document;
- Windows acceptance always resolves and updates the permanent desktop shortcut.

These are observable product contracts, not temporary implementation details.
