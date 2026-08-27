# PSD4: Verification

## Automated Matrix

1. Decoder contract: structure, alpha, masks, locks, groups, blend and effects.
2. Entry matrix: Gallery Import, editor File/Ctrl+O, gallery drop, editor drop.
3. Transaction failures: corrupt, oversized, unsupported, persistence rejection,
   superseded import and restart with a healthy prior document.
4. Persistence: immediate gallery item, close/restart/reopen, thumbnail and name.
5. Composite: golden RGBA for masks, clipping, groups, blend modes and effects.
6. Static gates: check, targeted lint, cycles, docs, architecture and line limit.
7. Desktop: production build plus packaged picker/drop/restart smoke.
8. Regression: both tree directions normalize to the same runtime stack;
   persisted grids whose first/content-intermediate rows are empty still render.
9. Gallery: initial PSD preview is non-empty, PSD -> gallery -> ordinary file
   succeeds, and an older null-preview record is eligible for regeneration.

## Manual Photoshop Fixture

Use one PSD with Unicode names, two nested groups, hidden and half-opacity layers,
semi-transparent pixels, a bitmap mask, vector mask, clipping layer, representative
blend modes and every decoded layer effect. Compare layer tree and composite in
Photoshop and ProDraw. Record decoder limitations by feature name.

## Final Acceptance

No successful path inserts PSD into the old document. No supported semantic is
silently flattened. The imported work exists independently in the gallery before
success is reported, and reopen produces the same layer metadata and pixels.

## Completion Record

- Commits: `62e947a`, `faaf146`, `51b6972`, `d0228af`, and the final
  verification commit (`test: verify psd document import`), followed by
  `fix: preserve psd stack and gallery reopen`
- Automated checks: PSD 11 files/53 tests; all 31 normalized blend modes; exact
  alpha/mask/effect-order fixtures; nested isolated/pass-through groups; 393
  module integration checks; 102 files/278 non-performance tests through
  `validate:changed`; storage and module boot; TypeScript, ESLint, docs,
  architecture, cutover, cycles, lines, desktop shell and production bundle
- Packaged Windows smoke: renderer ready with 12 brushes/17 sources and alpha
  `255`; temporary `win-unpacked/ProDraw.exe` launched successfully
- Manual checks: physical Photoshop-authored fixture comparison was not run;
  it is the only skipped acceptance profile and requires Photoshop plus the
  packaged Windows app on a graphical machine
- Known compatibility limits: external pattern-overlay resources are retained
  and reported but not rendered. Feathered masks, noise gradients, inner glow,
  bevel, satin and height-family blends use deterministic approximations and
  report compatibility warnings. Text/vector/smart objects use the PSD-rendered
  bitmap while preserving their source metadata; they are not native editors.

## PSD5 Repair Evidence

- `Assets.psd`: 56/56 layer bitmaps decoded; bottom-first producer order was
  inferred from its embedded composite and shown top-first in the layer panel.
- Live browser: full character rendered, gallery preview decoded as `235x512`,
  and `PSD -> Gallery -> new 800x600 -> Gallery -> reopen` completed without
  console errors.
- Automated coverage: stack direction inference, bottom-first runtime mapping,
  persisted empty-leading/intermediate rows and composite-derived preview.

## Large Sparse Layer Evidence

- `export-rig.psd`: 28,402,173 bytes, 617×1983, 354 nodes, 233 pixel layers
  and 121 folders; all pixel layers declare full-canvas bounds.
- The prior eager decode stopped at the 768 MiB budget after requiring about
  1.09 GiB of RGBA buffers. Incremental trim retains about 39 MiB of bitmap data.
- Real-file decode and gallery materialization completed with 233 layers, 121
  folders, zero compatibility warnings and no heap failure.
- Focused coverage verifies transparent-padding trim, coordinate preservation,
  colour-cell interning, PSD gallery import and preview behavior.
