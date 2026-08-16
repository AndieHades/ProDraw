# Stage R1: TypeScript and Windows Foundation

- Status: `done`
- Depends on: `R0`
- Requirements: `ARC-01`, `OPS-01`, foundation of `DSK-01`
- Planned commit: `build: establish TypeScript desktop foundation`

## Outcome

Strict TypeScript, Vitest, architecture/line/docs/cycle validators and a minimal
packaged Electron shell compile without changing the old editor entrypoint.

## Steps

- `R1.1` Add strict bundler `tsconfig`, TypeScript ESLint and Vitest.
- `R1.2` Port transferable line/import-cycle/docs validators and custom ESLint
  architecture rules; make limits data-driven by `project.config.json`.
- `R1.3` Add `check`, focused tests, `validate:*` and combined `validate` scripts.
- `R1.4` Add `src/contracts`, `src/app` and `src/platform` TypeScript boundaries.
- `R1.5` Add Electron main/preload adapters with no Node API exposed to runtime.
- `R1.6` Add Windows directory packaging and smoke validation; keep Pages dev.
- `R1.7` Update CI to run validate and Windows packaging jobs.

## Failure cases

An absent desktop API uses the web adapter; preload exposes an allowlisted typed
surface only; packaging failure does not corrupt web build output.

## Checks and acceptance

`npm run check`, lint, focused contract tests, docs/lines/cycles, web build and
packaged-shell smoke pass. A deliberate cross-system import and over-limit
fixture are rejected. Product UI remains the legacy entry until `R2`.

## Completion record

- Commit: R1 foundation commit (this commit)
- Checks: strict TypeScript, ESLint, 2 TS tests, 128 legacy unit tests,
  415 legacy integration tests, storage/boot, docs/lines/architecture/cycles,
  Vite bundle and packaged Windows executable smoke.
- Deviations: final app icon/installer branding remains in `R6`; R1 packages an
  unpacked directory only, as planned.
- Residual: npm reports one high-severity dev-tool transitive advisory; packaged
  runtime has no npm production dependencies and `npm audit --omit=dev` is clean.
