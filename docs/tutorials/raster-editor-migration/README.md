# Raster Editor Migration

Status: `ready`

Evidence baseline: `main@df2b924`, 2026-08-16.

Canonical owner: this package.

## Resume Here

- Current stage: `R2 — playable raster cutover`
- Status: `ready`
- Last completed stage: `R1`
- Next action: implement and test lazy RGBA tile surfaces plus tile-patch history before changing the app entrypoint
- Blockers: none
- Working paths: none after the R1 foundation commit
- Last checks: check, lint, legacy/TS tests, validators, bundle and packaged Windows smoke passed
- Last updated: `2026-08-16, R1 completion state`

## Product Outcome

ProDraw становится рабочим Windows-редактором для пера и графического планшета:
полноцветные большие холсты, слои, профессиональные кисти из bundled `.brush`,
предсказуемые gestures и Photoshop-grade операции без накопительного размытия.

## Scope

Included:

- `RST-01`: канонический документ хранит RGBA raster surfaces, не pixel grid.
- `BRH-01`: 12 кистей `src/app-folders/brushes/main` загружаются и рисуют.
- `BRH-02`: Brush Studio управляет shape, grain, spacing, flow, opacity,
  scatter, angle, roundness, pressure, tilt и stabilization.
- `BRH-03`: библиотека повторяет Procreate-модель наборов: папки, порядок,
  drag/reorder, rename/duplicate/import/export, recent и favorites.
- `BRH-04`: Brush Library/Studio follows the recorded two-pane/three-column
  reference UI and omits Wet Mix, Color Dynamics and Materials.
- `STB-01`: стабилизация уровня Procreate предлагает StreamLine, trajectory
  stabilization, motion filtering и pressure smoothing без потери точки/хвоста.
- `SMG-01`: отдельный инструмент Smudge («Палец») смешивает локальный пигмент
  выбранной кистью с strength/pickup/pull/dilution и pressure dynamics.
- `HUI-01`: Huion Stylus settings replace Apple Pencil with pressure calibration,
  tilt/button/eraser mapping and live Windows Ink diagnostics.
- `CAN-01`: пресеты FHD/QHD/4K, A5/A4 300 DPI, Instagram и Reels плюс custom.
- `IMG-01`: view transform неразрушающий; Transform/Liquify растрируют один раз.
- `DSK-01`: Windows desktop build принимает pen pressure/tilt и touch gestures.
- `DOC-01`: layers, blend/opacity, masks, selections, transform и undo работают
  на больших документах без full-document snapshot на каждый dab.
- `IO-01`: gallery/autosave, PNG/JPEG и layered interchange имеют round trip.
- `ARC-01`: строгий TypeScript и enforceable layer/import/line rules.
- `OPS-01`: hooks, focused validators, CI и recoverable plans встроены в repo.
- `CUT-01`: pixelizer/tilemap/pixel-perfect runtime удалён после parity transfer.
- `UX-01`: русский и английский UI, theme tokens, desktop/tablet accessibility.

Excluded:

- точная эмуляция закрытых Procreate wet-paint algorithms;
- CMYK painting engine и print color management до отдельного решения;
- cloud collaboration и mobile release в этой миграции.

## Requirement Traceability

| Requirement | Stage | Acceptance evidence |
| --- | --- | --- |
| `ARC-01`, `OPS-01` | `R0`, `R1` | validators reject boundary/type/line violations |
| `RST-01`, `BRH-01`, `CAN-01` | `R2` | pen stroke persists and exports at every preset |
| `BRH-02..04`, `STB-01`, `SMG-01`, `HUI-01`, `DOC-01` performance | `R3` | reference-layout checks, library round trip, recorded-trace and smudge tests |
| `IMG-01` | `R4` | repeated preview equals one source-to-final resample |
| `DOC-01`, `IO-01` | `R5` | document round trip preserves layers and pixels |
| `CUT-01`, `UX-01`, `DSK-01` | `R1`, `R6` | packaged Windows smoke and legacy absence checks |

## Non-Negotiable Decisions

1. Windows desktop is the final product; Vite/web remains a development build.
2. Raster content is full RGBA; no compatibility adapter keeps grid authoritative.
3. View zoom/rotation never mutate artwork.
4. Transform and Liquify previews always sample one immutable source snapshot;
   Apply performs at most one destructive resample with an explicit filter.
5. Large documents use lazy tile surfaces and tile-patch history, not cloned
   full-canvas arrays per stroke.
6. Systems communicate through typed commands/events, never direct imports.
7. Old functionality moves only when proven useful in the target contract.

## Reading Order

1. [`01-current-state.md`](01-current-state.md)
2. [`02-target-contract.md`](02-target-contract.md)
3. [`03-decisions-and-risks.md`](03-decisions-and-risks.md)
4. [`04-brush-studio-ui-reference.md`](04-brush-studio-ui-reference.md)
5. The current stage chapter
6. [`90-verification.md`](90-verification.md)

## Delivery Order

| Stage | Chapter | Depends on | Status | Planned commit |
| --- | --- | --- | --- | --- |
| `R0` | [`10-stage-governance.md`](10-stage-governance.md) | none | done | `docs: plan raster editor migration` |
| `R1` | [`20-stage-typescript-desktop.md`](20-stage-typescript-desktop.md) | `R0` | done | `build: establish TypeScript desktop foundation` |
| `R2` | [`30-stage-raster-cutover.md`](30-stage-raster-cutover.md) | `R1` | ready | `feat: cut over to raster painting core` |
| `R3` | [`40-stage-brush-studio.md`](40-stage-brush-studio.md) | `R2` | planned | `feat: add professional brush studio` |
| `R4` | [`50-stage-lossless-transform.md`](50-stage-lossless-transform.md) | `R2` | planned | `feat: add source-preserving transform and liquify` |
| `R5` | [`60-stage-document-workflow.md`](60-stage-document-workflow.md) | `R3`, `R4` | planned | `feat: complete professional document workflow` |
| `R6` | [`70-stage-cleanup-polish.md`](70-stage-cleanup-polish.md) | `R5` | planned | `chore: retire pixel editor and complete product docs` |

## Completion Definition

- [ ] Every requirement has positive and failure evidence.
- [ ] A packaged Windows build draws with pen pressure/tilt and touch navigation.
- [ ] Bundled brushes produce distinct repeatable strokes and expose compatibility.
- [ ] Required presets create/export exact dimensions and physical DPI metadata.
- [ ] Repeated view/preview operations do not accumulate raster degradation.
- [ ] Pixelizer and pixel-grid production paths are absent.
- [ ] Typecheck, lint, tests, architecture/docs/line gates and build pass.
- [ ] Stage records, roadmap, system docs and `Resume Here` agree.
