# C6: Entrypoint cutover and legacy retirement

- Stable id: `C6`
- Depends on: `C5`
- Status: `in_progress`

## Sub-stages

1. `C6A`: point `index.html` and packaged renderer at the single TypeScript
   composition root; replace bridge-specific validators with production graph
   proof while retaining a recoverable legacy baseline.
2. `C6B`: delete migrated JS systems/core/logic/config/i18n and obsolete tests;
   remove excluded pixel/grid paths, remaining line exemptions, stale identity
   and old plan claims while retaining tested storage migrations.
3. `C6B`: freeze bundle/startup, dependency/security, architecture, performance
   and clean-install evidence, then package without `CI` to the EXE resolved from
   `%USERPROFILE%\Desktop\ProDraw.lnk` and smoke that exact renderer.

## Acceptance

- `git ls-files 'src/**/*.js'` returns no production implementation;
- production graph contains one entry/session/document/history owner and no
  grid compatibility layer;
- every retained UI/function row is `done` with positive/failure/reopen evidence;
- full validate, clean audit, browser smoke, desktop package/smoke and fresh
  profile create/draw/save/reopen/export pass;
- the permanent desktop shortcut resolves to the newly packaged and smoked EXE;
- the only permissible manual skip is named physical Huion hardware evidence.

## Completion record

- Commit: pending
- Checks: pending
- Residual risk: pending
