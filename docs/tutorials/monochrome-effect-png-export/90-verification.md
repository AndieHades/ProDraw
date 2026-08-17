# Verification

## Required gates

| Surface | Command or assertion |
| --- | --- |
| effect and quick export behavior | `node test/module-int.mjs` |
| pure/core JS and TS graph | `npm run check` |
| task-owned JS/docs | targeted ESLint plus `npm run validate:docs` |
| line budgets | `npm run validate:lines` |
| imports when changed | `npm run validate:cycles` |
| every commit | `git diff --check`, task-owned staged diff read |

## Acceptance matrix

| Requirement | Positive evidence | Negative/failure evidence |
| --- | --- | --- |
| `MONO-01` | exact shared Rec.601 value | alpha unchanged |
| `MONO-02` | Apply/Undo/copy/clone and eye toggle | source grid unchanged |
| `MONO-03` | folder child/style pixels gray | hidden folder effect absent |
| `PNG-01` | layer and folder menu dispatch | deleted target writes nothing |
| `PNG-02` | output pixel checks for enabled styles | disabled style absent |
| `PNG-03` | visible nested child present | hidden branch absent |
| `PNG-04` | exact layer/folder output names | generic document name absent |

## Final record

- Stage commits: pending
- Checks: ME-1 passed 129 unit, 444 integration, focused Vitest 10,
  TypeScript check, targeted ESLint and docs/lines/cycles
- Skipped checks and residual risks: pending
