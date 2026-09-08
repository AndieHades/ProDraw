# Pen brush response repair

Status: `done` (implementation/delivery); stage `Q8-D9`; one focused commit.
Physical device acceptance and full Procreate parity remain open.

User device: Huion Frego M; priority brush: Lineart. The user explicitly requires
visual verification of the stepped, square-looking stroke.

## Evidence baseline

- `asset-editor@09a2ab083f59e41db1864a892d28f73ab765b158`, clean worktree.
- Production: `legacy-entry.js` → shell → `systems/input/index.js` →
  `draw/tools.js` → `brush.js` → `preset-stroke.ts` → `StrokePipeline` →
  `visitBrushDab` → `createCellPainter` → raster history/composite.
- `pointerup` never delivers the final coordinates; foreign pointer IDs are
  not rejected. Zero pressure is replaced with full pressure unconditionally.
- `preset-stroke.finish` does not consume end taper; spacing uses nominal size
  with a one-pixel floor even for pressure-reduced tips.
- `brush-library-panel` has selection/copy/delete but no connected settings UI;
  archived saved size/opacity are ignored. Old `raster-brush.js` is unreachable.
- Existing jsdom preset tests cannot prove native image decoding or physical
  latency. Browser measurements must decode actual assets.

## Requirements and scope

- `PB-INPUT`: all actual samples, including release, retain coordinates,
  pressure and tilt; another pointer cannot steal or terminate a stroke.
- `PB-TIP`: subpixel pressure-aware spacing, stable orientation and end taper;
  local tail repair on ordinary strokes; one exact Undo/Redo transaction.
  Symmetry/tile strokes retain a full replay to preserve mapped overlaps.
- `PB-PERF`: real bundled brushes measured on production input/composite;
  remove per-pixel invariant work and repeated flushes within a coalesced batch.
- `PB-PROPS`: editable supported stroke/pressure/shape/grain/flow controls
  affect the production brush and persist, including independent copies.
- `PB-DELIVERY`: `/Applications/ProDraw.app` installed and executable smoke
  verified, with physical tablet/Procreate visual comparison left explicit.

## Change map and steps

1. Add browser trace harness and baseline; reproduce input/property defects.
2. Repair input lifecycle and stroke planning, adding regression tests for
   release pressure, foreign pointer events, thin tips and taper/history.
3. Optimize raster sampling and production batching without changing RGBA
   compositing, selection, symmetry, tile mode or cancellation semantics.
4. Connect supported properties and saved controls to the live library through
   a presenter/typed callbacks; validate persisted values and isolate corruption.
5. Run focused suites, performance/browser trace, check/lint, cycles, docs,
   line limits and production build. Fetch main, review diff, commit and push.
6. Package macOS, verify installed bundle timestamp and smoke its exact binary.

## Edge cases, persistence, rollback

Pen without pressure keeps a predictable fallback; release zero is not a full
pressure spike. Blur/capture loss commits; pointercancel/document transition
rolls back. Off-canvas work is bounded. Existing brushes and user copies remain
readable. New overrides use a versioned separate record and allow reset. No
document schema or binary brush asset changes. Rollback: revert this commit.
New visible labels use ru/en i18n; UI styles use theme tokens; limits use config.

## Verification / acceptance

- Focused Vitest: input, stroke, brush, asset-editor; production performance.
- `npm run check`, `npm run lint`, `npm run validate:cycles`,
  `npm run validate:docs`, `npm run validate:lines`, `git diff --check`.
- Electron browser trace with native `.brush` sources, event-to-frame timings,
  property edits, persistence and Undo/Redo; `npm run build`.
- Inspect actual Lineart RGBA at 1/3/8/24/64/128 px and full application/settings
  screenshots. Verify continuous interior coverage and uncut settings buttons.
- `npm run package:mac` without CI, followed by smoke of
  `/Applications/ProDraw.app/Contents/MacOS/ProDraw`.
- Physical tablet feel and exact Procreate matching require device/reference
  evidence; automated timings and image assertions are reported separately.

## Implementation evidence

Input owns one pointer, retains the release sample and batches painter flushes.
Observed pen pressure no longer changes from zero to full pressure. The spacing
floor follows the rendered pressure/taper size. Rotated bitmap corners retain
their full footprint; final taper restores only the affected source region and
replays intersecting dabs. Sampling transforms/mips are prepared once per stamp.

The live library opens supported settings through a typed presenter port. Flow,
spacing, stabilization, taper, pressure/tilt, shape and grain overrides persist
per brush/copy; original archive defaults can be restored. Unsupported rendering
mode, hardness of native tips and stylus button controls are not offered.

Rotation now honors zero/follow/inverse and pen azimuth instead of overriding
the rotation setting for every preset; this uses the
[documented controls](https://help.procreate.com/procreate/handbook/5.4/brushes/brush-studio-settings).
Ten planning signatures were re-recorded after semantic regression tests passed.
The two existing named golden exclusions are unchanged.

Browser harness: start a fresh Vite server on port 5179, then run
`PRODRAW_PERFORMANCE_GATE=1 node_modules/.bin/electron tools/smoke-pen-brush.mjs`.
Do not run performance concurrently with other tests. A fresh server matters:
Vite HMR can create separate timestamped module instances for injected imports.
The harness rejects a bypassed preset pipeline rather than measuring its round
fallback. Earlier such measurements/captures were discarded.

Host: Apple M1. Baseline A4 / synthetic 240 Hz pen / four samples per batch:
Lineart 24 px input p95 12.8 ms; Big Soft 64 px 6.3 ms; Pencil Waxy 64 px 18.8 ms.
Lineart and Pencil Waxy decode their native shape/grain. Big Soft has missing
native sources and uses its existing procedural soft fallback; native parity
for that preset is not claimed. RAF timings do not measure physical input delay.

## Completion record

Final isolated browser run (Apple M1, same fixture):

| Brush | Input batch p95, before → after | RAF p95 after | Release after |
| --- | --- | --- | --- |
| Lineart 24 px | 12.8 → 8.2 ms | 17.5 ms | 22.8 ms |
| Big Soft 64 px | 6.3 → 3.5 ms | 16.8 ms | 10.6 ms |
| Pencil Waxy 64 px | 18.8 → 12.0 ms | 17.5 ms | 28.0 ms |

The 16 ms input-kernel gate passes. Release now applies taper and is more
expensive than the baseline that omitted it. This is not proof of physical
input-to-display latency or the performance of every size/symmetry combination.

Visual inspection: actual Lineart RGBA at 1/3/8/24/64/128 px, baseline and final;
full shell and settings screenshots. Native texture is preserved; fine curves
are continuous and the end tapers. The settings footer stays visible and has
no horizontal overflow. Interior coverage assertions pass for 3–128 px.
Flow zero produces no pixels; restoring flow paints. Reset, saved flow/spacing/
pressure/size/opacity after reload, and exact Undo/Redo all pass without console
errors. Local evidence: `artifacts/qa/pen-brush-response/`; reproducible harnesses
are checked in under `tools/pen-brush-*` and `tools/smoke-pen-brush.mjs`.

`npm run validate` passed (578 functional, 61 performance, 107 legacy unit tests
and storage gates). Subsequent focused tail tests pass all four paint/erase and
edge cases; check/lint and the final browser/settings checks pass. Full validation
includes production build, import cycles, cutover and architecture fixtures.

`npm run package:mac` without CI installed `/Applications/ProDraw.app`.
`app.asar` timestamp: `2026-09-07 20:20:51 PDT`; bundle `20:20:53 PDT`.
Separate `tools/smoke-packaged-desktop.mjs` explicitly used
`/Applications/ProDraw.app/Contents/MacOS/ProDraw` and passed
(`workspace true`, `file tree true`, `alpha 137`).

Named unverified checks: physical Huion Frego M pressure/tilt/eraser/feel and
direct Procreate reference comparison (device evidence unavailable); Windows
`package:desktop` (macOS is the required target). Existing exclusions remain
`test/module-int.mjs`, `test/module-boot.mjs`, and `brushGoldenPlans` for
`lineart.brush`/`sketching.brush`; owners/reasons are unchanged in
[validation policy](validation-policy.md). The pre-existing Vite >500 kB warning
remains with Q7; it does not fail build. No PR is created.
Git delivery: the focused commit is local. HTTPS push lacks local GitHub
credentials; the connected GitHub integration also rejected tree upload with
403 `Resource not accessible by integration`. Push remains blocked on write
authentication; the installed application and verification are unaffected.

## Resume Here

- Current stage: `Q8-D9`; status: `done` for implementation/delivery.
- Last completed stage: implementation, visual QA, validation and macOS delivery.
- Next action: physical Huion acceptance; continue broader parity work from its
  own plan. Do not declare all Q8 or Procreate parity accepted.
- Blockers: physical Huion/Procreate comparison requires user device evidence.
- Working paths: input/draw, logic/brush/stroke, brush UI/persistence, tests/tools.
- Last checks: full validation and focused follow-up pass; browser properties,
  restart, Undo/Redo, visual inspection and installed executable smoke pass.
- Main sync: `git fetch origin main`; HEAD already contains origin/main.
- Last updated: 2026-09-07.
