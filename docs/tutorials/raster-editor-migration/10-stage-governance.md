# Stage R0: Governance and Executable Plan

- Status: `done`
- Depends on: none
- Requirements: `ARC-01`, `OPS-01`
- Planned commit: `docs: plan raster editor migration`

## Scope and ownership

Included: repository entry rules, rule packs, recovery/validation policy, plan
templates, session hook, docs/line validators, migration package, roadmap and
correction of active documentation that still names pixel art as the product.

Excluded: production source/toolchain changes and runtime cutover.

## Steps

- `R0.1` Record branch/HEAD/status, source/brush inventory and runtime evidence.
- `R0.2` Add canonical repository, workflow, planning and architecture rules.
- `R0.3` Add context recovery, validation policy, idea inbox and plan templates.
- `R0.4` Create this package with requirements, decisions, stages and checks.
- `R0.5` Add a short session hook that points to canonical docs.
- `R0.6` Correct active entry docs and register the plan/roadmap.
- `R0.7` Add docs/link and governed line-limit scripts with npm entrypoints.
- `R0.8` Validate links, line limits and task-owned diff; commit separately.

## Checks and acceptance

- Every entrypoint links planning rules and recovery docs.
- All included requirements map to a stage and verification case.
- `Resume Here` names one exact next action.
- Documentation links and normal doc line limits pass.
- No `src`, runtime dependency or brush binary is changed in this commit.

## Completion record

- Commit: R0 planning commit (this commit)
- Checks: `validate:docs`, `validate:lines`, targeted ESLint, `git diff --check`
- Deviations: none
- Next stage: `R1`
