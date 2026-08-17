# C0: Truthful cutover gates and repository health

- Stable id: `C0`
- Depends on: none
- Status: `done`
- Scope: validation, dependency/security, product identity and failure reporting

## Change map

- `tools`: production graph, extension, parity-owner and line-scope validators;
- `desktop`: reusable IPC sender guard and rejection evidence;
- `package-lock.json`: non-breaking vulnerable transitive update;
- `index.html`, manifest/i18n: ProDraw visible identity;
- error boundary/status ports for material bridge failures.

## Steps

1. Declare the current production entry and expected migration stage as data.
2. Make validators fail when dormant TS source is mistaken for live wiring,
   when a second owner is registered or when new production JS/grid imports grow.
3. Include `test/` in line governance with explicit temporary oracle exemptions.
4. Update the safe transitive dependency and require a clean audit in validation.
5. Validate every privileged Electron IPC sender before reading or writing.
6. Replace visible Pixel Heart branding; document compatible legacy store reads.
7. Route material open/import/autosave failures to localized status and tests.

## Edge and failure cases

Dev-server sender validation accepts only the exact configured origin; packaged
IPC accepts only the app's file URL webContents. Browser builds remain usable
without desktop APIs. Dependency/network checks must not make offline functional
validation nondeterministic; lock/audit evidence is recorded separately if so.

## Checks

- focused validator rejection fixtures;
- desktop sender unit/integration tests;
- `npm audit --json`;
- `npm run validate:changed` and `git diff --check`;
- browser gallery/workspace smoke.

## Acceptance

- a bridge/dormant entry cannot satisfy a target-live assertion;
- one unauthorized IPC event is rejected before handler work;
- dependency audit has no high/critical finding;
- visible shell/manifest say ProDraw;
- all legacy line exceptions are explicit and cannot grow silently.

## Completion record

- Commit: `0f12c2d` (`build: enforce the TypeScript cutover baseline`)
- Checks: focused renderer-trust tests, cutover validator and five rejection
  fixtures, desktop/raster-entry/interface validators, dependency audit, full
  `npm run validate`, packaged Windows smoke and browser gallery/workspace smoke
- Residual risk: production still enters the measured migration bridge and the
  main bundle remains about 688 kB minified. C1-C6 own their removal; C0 prevents
  either JavaScript or legacy-state counts from growing meanwhile.
