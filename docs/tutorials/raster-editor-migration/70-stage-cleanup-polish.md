# Stage R6: Legacy Removal and Product Polish

- Status: `planned`
- Depends on: `R5`
- Requirements: `CUT-01`, final `DSK-01`, `UX-01`, `OPS-01`
- Planned commit: `chore: retire pixel editor and complete product docs`

## Outcome

Only the strict TypeScript raster product ships; legacy pixel/tile code and
misleading documentation are gone, and the Windows package is the supported app.

## Steps

- `R6.1` Audit every legacy feature against target requirements and recorded
  parity; capture intentionally excluded pixel/tile features.
- `R6.2` Remove obsolete JS entry/source/tests, pixelizer, grid and pixel-perfect
  UI/assets/config without compatibility imports; verify the already retired
  tilemap/tileset suite cannot re-enter the production graph.
- `R6.3` Migrate all remaining production modules/tests to strict TypeScript.
- `R6.4` Rewrite architecture/system/utility/config/keymap/i18n/theme docs to
  exact current paths and archive or remove superseded plans with inbound links.
- `R6.5` Finalize app identity, installer metadata, icons, update/offline policy.
- `R6.6` Run full acceptance, Windows tablet QA checklist and source-removal drill.

## Negative proof

Repository search and architecture validator find no production grid/pixelizer/
tilemap imports, no unchecked JS runtime, no hardcoded UI strings and no stale
docs links claiming pixel-art behaviour.

## Checks and acceptance

Clean install/package opens gallery and completes the final observable scenario.
Full validate/build/package passes; documentation and plan move to `done` with
commits, residual risks and skipped human-device checks recorded.

## Completion record

- Commit/checks/deviations: pending
