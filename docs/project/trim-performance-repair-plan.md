# Trim performance repair

- Status: implementation and desktop delivery done; push blocked by authentication
- Owner: one focused crop/trim repair commit
- Baseline: `asset-editor@8a216b0`, clean tree, 2026-09-07

## Evidence and contract

`translatePackedRgba.ts` copies visible rows efficiently, but converts every
clipped pixel to a string-keyed Map entry. `cloneLayerRecord` then expands that
Map into entries and copies every cell during delayed gallery autosave. A small
selected layer can therefore force all larger unselected layers into expensive
off-canvas storage. Existing A4 remap tests only crop sparse content.

Keep off-canvas RGBA in compact rows through crop, repeat crop, bounds queries,
cloning, persistence and preview. Preserve exact pixel values, hidden layers,
animation, overlap precedence, independent source snapshots and one-step Undo.
Existing Map records remain readable; new records have an explicit versioned
format. Follow-up request: use the existing Symmetry-style toolbar submenu for
selected trim and «Холст по всем слоям» (the existing `canvas.trim` action).
RMB opens the shared icon choices; selecting a choice runs it, updates the main
button icon/title and remembers it for subsequent primary clicks, just like
the other action groups. All-layer fit includes hidden/off-canvas content and
remains one undoable remap. Labels are registered in ru/en.

## Steps

1. Reproduce dense selected-layer trim and delayed cloning with a regression test.
2. Add compact off-canvas rows and integrate remap, bounds, clone/save/load and
   extended preview; keep legacy Map operations working at existing boundaries.
3. Verify holes/negative coordinates/overlaps, repeated crops, round-trip,
   Undo/Redo, dense performance and existing crop/frame behavior.
   Add the trim submenu and verify all-layer expansion through the UI.
4. Run typecheck, lint, architectural checks and full tests for the shared raster
   surface. Fetch main, review the diff, commit and push the current branch.
5. Package without CI, verify `/Applications/ProDraw.app` timestamp and run
   packaged renderer smoke against that installed executable.

## Risks

Native structured cloning does not preserve custom Map behavior: serialize rows
explicitly at the gallery boundary and hydrate them before any live access.
Generic pixel-editing commands may still enumerate ext; their semantics must
remain compatible. No destructive data migration is needed.

## Verification evidence

- Baseline single dense `1600×1200` layer cropped to `20×20`: trim `846.8 ms`,
  delayed clone `1039.6 ms`; the regression test failed the existing budgets.
- Compact rows: single-layer trim `4.7 ms`, clone `2.4 ms`; six-layer trim
  `12.5 ms`, clone `20.5 ms`. Off-canvas storage is exactly four bytes per
  occupied pixel in the filled fixture, with no per-pixel Map entries.
- Real Chromium shell, six dense layers: selected trim `22.2 ms`, bounded
  preview `12.9 ms`, gallery save including IndexedDB `86.4 ms`, all-layer fit
  `79.0 ms`. Both menu routes, pixels, Undo/Redo and delayed save passed with
  no browser console errors.
- Reproduction: `npm run dev -- --host 127.0.0.1 --port 5179`, then
  `node_modules/.bin/electron tools/smoke-canvas-trim.mjs` in a second terminal.
  The smoke owns a temporary profile and never opens the user's documents.
- `main` synchronized by merge `ac8acab`; already ported fixes retained,
  PSD image-data initialization and zero-copy exact buffers integrated with
  71 focused tests, check, lint, line-limit and cutover verification.
- Final `npm run validate`: 107 legacy unit cases, storage checks,
  191 files / 567 functional tests and 18 files / 61 performance tests passed;
  check, lint, docs, lines, cycles, architecture, cutover, catalogs and build passed.
- `npm run package:mac` without CI installed `/Applications/ProDraw.app`.
  Its `app.asar` timestamp is `2026-09-07 19:11:05 PDT`; a separate smoke passed
  against `/Applications/ProDraw.app/Contents/MacOS/ProDraw` after installation.
  Installed renderer bytes match `dist/assets/index-OIFcl1RB.js` exactly.
- Commit: `fix: keep trimmed layers compact and add all-layer canvas fit`.
- Push remains pending: HTTPS Git has no available credentials, SSH agent has
  no identities, and the connected GitHub integration rejects tree creation with
  `403 Resource not accessible by integration`. No remote branch was changed.
- Limitations: the user's original document was not available; evidence uses
  reproducible dense fixtures. Physical pen/touch acceptance was not run; the
  submenu uses the same gesture path as existing Symmetry. The named pre-existing
  skips in `validation-policy.md` remain unchanged; no new suites were excluded.

## Resume Here

- Current stage: implementation, validation and installed delivery complete
- Status: push pending
- Next action: push `asset-editor` once GitHub write authentication is available;
  user acceptance can proceed in `/Applications/ProDraw.app`
- Blockers: GitHub write authentication unavailable
- Working paths: `src/logic/raster`, layer cloning/normalization, gallery, tests
- Last checks: full validate, browser workflow and installed packaged smoke passed
- Last updated: 2026-09-07
