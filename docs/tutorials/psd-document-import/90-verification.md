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

- Commits: pending
- Automated checks: pending
- Manual checks: pending
- Known compatibility limits: pending
