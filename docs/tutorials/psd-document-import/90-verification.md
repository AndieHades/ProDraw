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
  verification commit (`test: verify psd document import`)
- Automated checks: PSD 9 files/48 tests; all 31 normalized blend modes; exact
  alpha/mask/effect-order fixtures; nested isolated/pass-through groups; 393
  module integration checks; 99 files/269 non-performance tests through
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
