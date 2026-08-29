# Current-state audit: 2026-08-17

- Baseline: clean `main@d3fc81a`, equal to `origin/main`
- Scope: entrypoints, architecture, functions, UI, persistence, performance,
  duplication, dependencies, governance and test truth
- Audit mutation: documentation only

## Confirmed behaviour

`npm run validate` passed 129 legacy unit, 447 module integration, 214
TypeScript and 53 sequential performance checks, documentation, hooks,
interface, line, architecture, cycle, desktop, raster-entry and Vite build.

An in-app browser smoke created the default 800x600 work, opened the preserved
workspace/layer UI, drew a stroke and enabled Undo/Redo without console errors.
This proves the current bridge is usable; it does not prove the target owner is
connected.

## P0: the cutover is not connected

### `CUT-01` — production still boots the legacy owner

`index.html` loads `src/legacy-entry.js`, which synchronously imports
`src/app.js`. `src/raster-main.ts` and `RasterEditorApp` are referenced by tests
and a source-text validator but are unreachable from production.

Evidence: `index.html:552`, `src/legacy-entry.js`, `src/app.js`,
`src/raster-main.ts`, `tools/validate-raster-entry.mjs`.

### `CUT-02` — two incompatible document architectures remain

The visible product mutates global `S`, dense/sparse grid-shaped layer data and
legacy history. The typed graph owns `RasterDocument`, `RasterSurface` and
`TileHistory`, but only the compact brush bridge consumes part of it. Therefore
green RGBA tests do not cover most visible commands.

Evidence: 345 `src/**/*.js` files / 20,418 lines versus 173 TypeScript files /
10,034 lines. Static inventory found 206 JS modules using legacy state/grid/tile
vocabulary. `RasterDocument` still exposes only a flat minimal layer model.

### `CUT-03` — parity and architecture can pass independently

`validate:interface` proves old DOM markers; `validate:raster-entry` explicitly
expects the bridge and merely scans dormant `raster-main.ts`. Neither gate
proves original controls dispatch to the typed RGBA owner. This is the root
reason the temporary bridge survived prior green builds.

## P1: correctness and operational risks

### `SEC-01` — current dependency audit is red

`npm audit --json` reports one high-severity transitive `undici@7.27.2` finding
through Electron/jsdom. The non-breaking lockfile repair is `7.29.0`.

### `SEC-02` — privileged IPC lacks a sender guard

File and brush IPC handlers validate paths and names, but accept calls from any
renderer webContents in the process. Navigation is origin-restricted, yet every
privileged handler must still validate its sender at the boundary.

Evidence: `desktop/electron-ipc.mjs`, `desktop/brush-ipc.mjs`,
`desktop/electron-main.mjs`.

### `ERR-01` — material failures can be silent

Optional localStorage and pointer-capture catches are legitimate. File-backed
font/palette import, gallery PSD open and bridge autosave also contain empty
catches, so corruption or permission failures can look like successful no-ops.
These must become typed failures and localized status without crashing the app.

### `BRAND-01` — old product identity remains user-visible and persistent

The gallery title and web manifest still say `Pixel Heart`; IndexedDB/storage
keys and brush-pack format use the same name. Visible branding must become
ProDraw, while storage IDs require an explicit compatible migration rather than
blind renaming.

## P1: performance and maintainability

### `PERF-01` — one eager production chunk mounts every workflow

Vite transforms 472 modules and emits a 686.78 kB minified / 222.88 kB gzip
main chunk, exceeding its 500 kB warning. `app.js` statically imports and mounts
gallery, PSD, animation, tile and editor surfaces at startup. Cutover stages
must keep input-critical owners eager and lazy-load optional windows safely.

### `DUP-01` — duplication is limited but several clones can drift

`jscpd` found 24 clones: 183 duplicated lines (0.56%) across 545 analysed
source/desktop files. Most short rendering loops are local and should not be
abstracted mechanically. High-value consolidation targets are new-canvas/tile
dialog field logic, effect traversal, render grid helpers, menu positioning and
the duplicated TypeScript brush context presenters.

### `DEAD-01` — no truthful production reachability gate exists

`knip` flags the dormant target editor and many legacy/dynamic entrypoints. The
raw report has false positives because entrypoints are undeclared, but it
correctly exposes that `raster-main.ts` is not in the production graph. A
checked entrypoint manifest is required before dead-code results are actionable.

## P2: governance debt

### `OPS-01` — line policy has hidden exceptions

Twelve production JS files are exempt from the 150-line rule. The scanner does
not classify singular `test/` as working code, allowing `module-int.mjs` (4,127
lines) and `unit.mjs` (635 lines) without an explicit exception. Migration must
shrink the exemption list and make every remaining oracle exemption visible.

### `OPS-02` — test volume is not parity traceability

Many of the 447 module tests have generic names and share a 4,127-line harness.
They are valuable behaviour oracles, but are not mapped to typed commands or the
parity inventory. Each cutover stage must move named scenarios to focused tests
before deleting its oracle section.

## Conclusion

The immediate defect is not missing isolated helper reuse. It is the ownership
split: the complete UI and the safe RGBA engine are different applications.
Local cleanup before owner cutover would polish code scheduled for deletion.
The safe order is gates -> TypeScript shell -> RGBA owner -> feature families ->
entrypoint/legacy retirement, with unchanged UI verified at every boundary.

## Live rebaseline: 2026-08-28

The stabilized `aset-editor@c37c01f` branch contains 282 tracked production JS
modules and 293 tracked TypeScript modules. The cutover gate sees 375 production
modules and classifies 173 JS modules as legacy-state owners. Production still
boots `src/legacy-entry.js -> src/app.js`; the detached typed entry gate passes.

`npm audit --omit=dev --audit-level=high`, `validate:cutover` and
`validate:raster-entry` pass. `validate:interface` fails only because its static
tool-order expectation predates the accepted `trim-selected` control next to
Crop. C1F closes that stale contract before any ownership cutover.

Since the old audit, gallery metadata loading, delayed import progress, compact
raster remap, global Pan, selected-layer trim and permanent-shortcut delivery
have become acceptance fixtures. A TypeScript stage that regresses any of them
is incomplete even if its type and architecture gates pass.
