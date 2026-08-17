# Remediation Plan After Live Audit

- Status: `ready`
- Evidence baseline: `main@6bcfdaa`, 2026-08-16
- Audit: [`06-live-audit-2026-08-16.md`](06-live-audit-2026-08-16.md)
- Implementation authority: granted by the user's `выполняй` instruction on
  2026-08-16

## Outcome and ordering rule

The repair program makes ProDraw safe for real artwork before expanding its
feature count. It refines the existing R0–R6 migration rather than creating a
second product roadmap.

| Slice | Existing stage | Outcome | Depends on | Status |
| --- | --- | --- | --- | --- |
| `F0` | repair R0/R1 | truthful hooks, validators and desktop smoke | none | done |
| `F1` | architecture foundation | commands/view models plus end-to-end harness | `F0` | done |
| `F2` | pull forward R5 safety | crash-safe multi-document session | `F1` | done |
| `F3` | finish R3 performance | bounded render/history/autosave/export | `F1`, `F2` | done |
| `F4` | finish R3 brushes | truthful `.brush` engine and library workflow | `F1`, `F3` | done |
| `F5` | finish R3 tablet | robust Huion/touch/stabilizer/Smudge path | `F3`, `F4` | in progress |
| `F6` | R4 | immutable-source Transform and Liquify | `F3`, `F5` | planned |
| `F7` | R5 document | layer tree, selections and native Save as Canvas | `F2`, `F6` | planned |
| `F8` | R5 tools | remaining exact two-column tool registry | `F7` | planned |
| `F9` | R6 | installable Windows product and legacy retirement | `F8` | planned |

`F2` and `F3` intentionally move data safety and performance ahead of new
creative tools. R4/R5 do not start while their acceptance gates are red.

## Global invariants

- Source pixels never change during view zoom/rotate or transform preview.
- Every visible control either changes a tested output or is disabled/hidden
  with an honest compatibility explanation.
- Pen samples remain responsive; touch navigates unless the user explicitly
  selects a finger-paint mode.
- A completed write is atomic and recoverable; cancel/failure never replaces the
  last good revision or remembered directory.
- One command owns one history transaction. Pixel and structural undo share a
  document-level byte budget.
- New target TypeScript never imports the retired pixel-grid runtime.
- Every slice ends with a focused commit, completion record and recovery update;
  no later slice is used to conceal a failed acceptance gate.

## `F0` — make project evidence truthful

**Findings:** `OPS-01`, `TEST-01`, `TEST-02`, `CFG-01`, `DEP-01`, `DOCS-01`,
the validation part of `SEC-01`.

1. Replace absolute/stale Codex hook commands with repository-relative canonical
   entrypoints; make `.claude` and Codex consume the same rule-pack owner.
2. Add `validate:hooks`; reject old repository names, unresolved commands,
   contradictory Git policy and missing hook documentation.
3. Change packaged smoke to open a hidden window, load `dist`, expose preload,
   register IPC, seed/read one brush and emit renderer-ready after a tiny RGBA
   paint/persist/reload scenario.
4. Make `validate:changed` include staged, unstaged and untracked files. Expand
   line/architecture fixtures to all governed JS/CSS/config paths.
5. Validate recovery fields and exact completion hashes; unify canvas limits;
   retain npm as the only lock and declare package manager/Node range.

**Acceptance:** broken-hook and untracked-code fixtures fail; packaged smoke
fails if `dist`, preload, IPC or renderer bootstrap is broken. Full validation
passes from a clean checkout.

**Commit:** `build: make governance and desktop gates truthful`.

**Completion:** `c9a0fb9`; portable hooks, truthful validators, npm-only lock and
renderer-ready packaged smoke are complete. Full validation passed; packaged
`dist` loaded preload/IPC, 12 brushes and RGBA persistence (`alpha 255`).

## `F1` — establish testable runtime seams

**Findings:** `ARC-01`, system-test part of `TEST-02`.

1. Define serializable `EditorCommand`, document/layer/brush view models and
   events; normalize DOM pointer data before it crosses the input boundary.
2. Put document/session mutation behind an owner store; UI renders view models
   and dispatches commands. Give canvas a read-only presentation/cache port.
3. Split `RasterEditorApp` into composition, session, tool and presentation
   owners without a broad behavior rewrite.
4. Enforce `contracts !→ DOM`, `ui !→ mutable core` and app-only composition.
5. Add a jsdom/browser scenario: pointer → RGBA tile → history → frame request →
   autosave status, including cancel and failure.

**Acceptance:** rejection fixtures prove every boundary; the end-to-end scenario
runs without importing legacy JS.

**Commit:** `refactor: establish editor command and view model seams`.

**Completion:** `8ca59f3`; serializable commands and copied view models cross the
UI boundary; eight fixtures enforce ownership. The pen scenario covers RGBA,
Undo/Redo, cancel and autosave failure; full validation and packaged smoke passed.

## `F2` — crash-safe document sessions

**Findings:** `SAFE-01`, safety part of `PERSIST-01`, `SAVE-01`.

1. Add versioned document identity, path, dirty revision and a repository of
   multiple works; never overwrite the only record on New Canvas.
2. Persist a journal/last-good generation and recover corrupt/incomplete saves
   visibly rather than silently opening a blank document.
3. Serialize saves, coalesce requests with backpressure and expose Saving/Saved/
   Failed state. Add renderer/main close handshake and bounded final flush.
4. Add Open, Save and Save As for native `.prodraw`; use temp-write, flush and
   atomic replace. Prompt before destructive New/Open/Close when dirty.
5. Add gallery/recent recovery only after the storage contract passes kill tests.

**Acceptance:** kill-after-stroke, kill-during-write, quota failure, corrupt
latest revision and New Canvas scenarios restore the last good work. No success
UI appears before durable completion.

**Completion:** `0410fdf` (`feat: add crash-safe document sessions`); 49 TS + 128 legacy tests and packaged renderer smoke passed.

## `F3` — bounded raster performance and memory

**Findings:** `PERF-01`, `PERF-02`, `MEM-01`, `PERSIST-01`, export part of
`SAVE-02`.

1. Track layer/tile revisions and dirty bounds; cache composite tiles and keep
   reusable bitmap/canvas resources. Cull tiles outside the viewport.
2. Move decode, composite, serialization and eligible kernels off the input
   path; use a bounded queue and cancellable/chunked work.
3. Replace entry-count history with byte-budget eviction, remove redundant tile
   copies and reset/forget surfaces with document lifecycle.
4. Persist only changed generations/tiles and compact in the background.
5. Stream/chunk large export with progress, cancel and dimension/memory guards.
6. Add filled FHD/A4/4K fixtures with multiple layers and record p50/p95
   input-to-present, frame time, allocations, history bytes and save time on the
   reference Windows machine; freeze approved budgets in config/CI.

**Acceptance:** a five-minute recorded trace reaches a memory plateau, autosave
does not block pen input, unchanged tiles are not recomposited and budget
regressions fail validation.

**Completion:** `bab3c4c`, `6f9ec00`; frozen evidence and residual device limits are in [`performance-budgets.md`](../../project/performance-budgets.md).

## `F4` — truthful brush engine and library
**Findings:** `BRH-01..05`, Studio-preview part of `BRH-02`.
1. Inventory and parse supported `Brush.archive` fields; isolate unsupported
   fields in a visible per-brush compatibility report.
2. Implement a deterministic dab/stroke plan for every exposed control: jitter,
   falloff, taper, transformed shape, grain scale, tilt and size constraints.
3. Use one `LoadedBrush` path for initial selection, document, preview card,
   Drawing Pad, Eraser and Smudge. Remove or disable any still-unimplemented UI.
4. Load each archive independently; retry transient failures and preserve the
   last working brush. A missing asset cannot block application startup.
5. Add Import/Export/Reset/Restore Trash/Reveal Folder, versioned seed manifests,
   arbitrary compatible `.brush` imports and persistent active brush.
6. Add the screenshot-defined Shape/Grain Source Library from every live brush;
   label sources, open via `Edit`, and embed coverage so deletion remains safe.

**Acceptance:** golden hashes for all 12 bundled brushes are distinct and stable;
changing each enabled parameter changes its expected metric; Studio and document
match; corrupt/missing/imported brush cases leave a usable library.

**Commit:** `feat: make brush rendering and compatibility truthful`.

**Completion:** `238582b`, `453d5cd`, `9a45c12`, `6f4868b`; one deterministic
archive renderer, delta-tested controls and durable library workflows passed.
Packaged evidence found 12 brushes and all 8 live root Shape/Grain resources;
Edit records provenance and embeds selections so later deletion is safe.

## `F5` — production tablet input and Smudge

**Findings:** `INP-01`, `INP-02`, `STB-01`, `SMG-01`.

1. Create one pointer-session state machine handling capture loss, cancel, blur,
   visibility, barrel/eraser transitions and duplicate terminal events.
2. Default to `pen paints / touch navigates`; add two-finger pan/zoom/rotate,
   contact-size palm filtering and an explicit optional finger-paint setting.
3. Resample/time-normalize stabilization so 60/120/240 Hz traces agree; finish
   dots, corners and lift tails without a straight endpoint jump.
4. Use premultiplied-alpha pigment math, selection/mask clipping and editable
   strength/pickup/pull/flow for Smudge.
5. Record Huion Windows Ink traces and manual device matrix: pressure, tilt,
   eraser, barrel Smudge, focus loss, fast lift, short dot and long curve.

**Acceptance:** deterministic trace tests plus packaged-device evidence meet the
F3 latency budget and show no palm marks, stuck strokes or transparent halos.

**Commit:** `feat: harden Huion touch stabilization and smudge`.

## `F6` — lossless Transform and Liquify

Execute [`50-stage-lossless-transform.md`](50-stage-lossless-transform.md) only
after F3/F5. Add immutable source snapshots, matrix preview, one high-quality
final resample, tiled displacement, cancellation and seam/alpha golden tests.
Activate Move, Crop, Flip and Center only with undo/error contracts.

**Commit:** `feat: add source-preserving transform and liquify`.

## `F7` — professional documents and Save as Canvas

**Findings:** `DOC-01`, `DOC-02`, remaining `SAVE-01`, IPC part of `SAVE-02`.

1. Add versioned nested layer/group tree, masks, clipping, alpha lock, useful
   blend modes, multi-selection and structural command history.
2. Implement RMB Save as Canvas for one layer, marked layers and a full group,
   preserving structure in both Whole Canvas and By Contour modes.
3. Remember the last successful directory, derive safe names from source identity
   and use one directory choice for multi-file output. Cancel changes nothing.
4. Add flattened PNG plus layered PSD export with a truthful compatibility
   matrix; transfer binary data without array amplification and validate IPC.

**Acceptance:** the complete matrix in
[`60-stage-document-workflow.md`](60-stage-document-workflow.md) round-trips
pixels, DPI, names, nesting, PSD and both bounds modes across packaged restart.

**Commit:** `feat: complete layered save as canvas workflow`.

## `F8` — remaining tools and exact panel

Implement Fill, Selection, Lasso, Symmetry, Shapes, Brighten, raster Tile Mode,
Text and Actual Size through an ordered typed registry. F6 owns Move/Crop/Flip/
Center. Enable commands only when their raster, selection, history, keyboard and
failure contracts pass. Prove the exact 16 row-major cells and that Text moves
with the persisted two-column panel.

**Commit:** `feat: complete professional raster tool panel`.

## `F9` — Windows productization and cleanup

**Findings:** `WIN-01`, `SEC-01`, `LEG-01`, `UX-01`.

1. Produce a signed-ready NSIS/MSIX installer with real icon/metadata, isolated
   upgrade data and install/start/update/uninstall smoke.
2. Allow dev URL only when unpackaged, compare exact origin and validate every
   privileged IPC sender.
3. Complete RU/EN, theme tokens, keyboard/pen/touch accessibility and error UI.
4. Remove retired pixelizer/tilemap runtime, stale styles/docs and legacy tests
   only after explicit parity evidence; keep a tagged Git oracle instead.

**Acceptance:** clean-machine packaged workflow covers install → create → Huion
stroke → save → restart → reopen → export → uninstall without data loss.

**Commit:** `release: complete Windows raster editor productization`.

## Recovery and verification protocol

Before each slice, verify branch/HEAD/status and re-read this file, the owning
R-stage and [`90-verification.md`](90-verification.md). During implementation,
stage only the slice allowlist and preserve unrelated work. Before its commit,
run focused tests, `npm run validate`, desktop package/smoke when applicable and
the named manual device/browser gate. Record exact commit, commands, deviations
and next action in the owning stage and package README. A failed format migration
must keep backward read/recovery; rollback is the focused slice revert, never a
destructive worktree reset.
