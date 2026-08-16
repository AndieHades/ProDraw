# Current State Evidence

## Baseline

- `git status --short --branch` was clean at `main@df2b924`; it matched
  `origin/main` before R0 edits.
- Vite enters `src/app.js`; `package.json` has no TypeScript/typecheck or desktop
  runtime dependency.
- Source inventory contains 276 `.js` files. Several production files already
  exceed the old 170-line rule, so the rule was descriptive rather than enforced.

## Document and canvas

- `src/core/state.js:newLayer` owns `grid: blank(w, h)` and `kind: 'pixel'`.
- `src/core/document.js` loops through every cell for crop, expand, shift and
  image placement. This representation cannot scale safely to A4/4K layers.
- `src/config/presets.js` defaults to 32×32 and offers 16–128 sprites plus
  320×180–960×540 frames.
- `src/config/limits.js` caps a canvas side at 640 px and brush size at 64 px.
- `index.html` exposes an `import.pixelize` path; tilemap/pixel-perfect modules
  are constructed by `src/app.js`.

## Brushes

- Git tracks 12 `.brush` archives under `src/app-folders/brushes/main`.
- They are Procreate ZIP archives with `Brush.archive`; four contain root
  `Shape.png` and/or `Grain.png`, while others refer to Procreate bundled assets.
- `src/core/brush-import/procreate.js` currently extracts only root Shape/Grain,
  downsizes shape coverage, binarizes grain and maps only spacing/jitter.
- `src/systems/draw/brush.js` applies that result as occupied grid cells; it
  cannot preserve antialiasing, continuous opacity, pressure or soft edges.
- The assets are present in the catalog, but there is no production proof that
  they are automatically seeded from this repository folder.

## Existing useful behaviour

Gallery/IndexedDB, layers/groups, masks-like alpha lock, PSD/PNG IO, effects,
selections, transforms, i18n, theme tokens and touch gestures exist in the old
runtime. They are behavioural references, not reusable state implementations,
because most consume pixel grids directly.

## Tooling gap

- Tests are large Node `.mjs` scripts; there is no Vitest discovery or strict
  compile gate.
- ESLint checks generic JS rules but not system boundaries, line limits,
  hardcoded player text or import cycles.
- The existing GitHub workflow builds/deploys Pages; it does not package Windows.
- No session-start hook or context-recovery control plane existed at baseline.

## User-required additions

The user explicitly requires a final Windows application for a graphics tablet,
classic game-screen presets from 1920 px, A5/A4, Instagram post/Reels, and no
Procreate-style cumulative blur during rotate, zoom or Liquify.
