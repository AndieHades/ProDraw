# C6: Entrypoint cutover and legacy retirement

- Stable id: `C6`
- Depends on: `C5`
- Status: `pending`

## Steps

1. Point `index.html` and packaged renderer at the single TypeScript composition
   root; remove bridge-specific validators and replace them with graph proof.
2. Delete migrated JS systems/core/logic/config/i18n and obsolete styles/tests;
   keep the tagged Git baseline as the historical oracle.
3. Remove pixelizer, Pixel Perfect, global stabilization and obsolete grid/tile
   document paths explicitly excluded by the parity contract.
4. Remove all line exemptions, stale Pixel Heart visible identity and old plan
   claims; retain only tested storage migrations.
5. Freeze bundle/startup, dependency/security, architecture, performance,
   package and clean-install evidence.

## Acceptance

- `git ls-files 'src/**/*.js'` returns no production implementation;
- production graph contains one entry/session/document/history owner and no
  grid compatibility layer;
- every retained UI/function row is `done` with positive/failure/reopen evidence;
- full validate, clean audit, browser smoke, desktop package/smoke and fresh
  profile create/draw/save/reopen/export pass;
- the only permissible manual skip is named physical Huion hardware evidence.

## Completion record

- Commit: pending
- Checks: pending
- Residual risk: pending
