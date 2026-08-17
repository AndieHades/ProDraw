# Raster Editor Migration

Status: `in_progress`

Evidence baseline: `main@cea5370`, 2026-08-16.

Canonical owner: this package.

## Resume Here

- Current stage: `R2 / R2.11 — typed RGBA owner cutover behind the restored UI`
- Status: `in_progress`
- Last completed stage: `F3-R1..F3-R5` and the bounded P1
  merge/document-remap recovery; F5 input and trace checkpoints remain complete
- Next action: replace the temporary `src/app.js` grid bridge one owner at a
  time with typed `RasterSurface`/`RasterEdit`/`TileHistory` contracts while
  preserving the restored DOM, panels and drag/drop behavior exactly
- Blockers: final F5 acceptance needs a connected Huion and a user-drawn trace;
  R2 engine acceptance remains revoked until the restored UI uses typed RGBA owners
- Working paths: `src/app.js`, `src/raster-main.ts`, `src/core`, `src/systems`,
  `src/ui`, `tests/system`, `tests/performance`, `test/module-int.mjs`
- Last checks: focused checks pass for brush 22, bounded effects/bulk/autosave/
  render 20, selection 11, text 16, transform 11, text callers 22, palette 3,
  sparse backing 18, effect surfaces 21, document remap 8 and layer merge 12.
  Legacy 128 unit, storage/reconnect, 441 module-integration and module-boot
  checks passed; the gallery New/Open matrix covers startup, immediate create,
  rapid repeat input, persistence and active-stroke cancellation;
  the aggregate TypeScript suite passed 80 files/202 checks and the sequential
  performance suite passed 17 files/52 checks. `npm run validate` and a fresh
  packaged Windows smoke passed (`12` brushes, `8` sources, alpha `255`).
- Last updated: `2026-08-17, gallery New/Open lifecycle hardened after main@cea5370`

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
- `BRH-03`: библиотека сохраняет исходную компактную панель ProDraw, круглые
  engine-превью с видимыми названиями и прежний drag/reorder; физические папки продолжают владеть
  файлами, дубликат остаётся рядом с исходной кистью.
- `BRH-04`: original compact Brush Library plus three-column Brush Studio follow
  the recorded UI and omit Wet Mix, Color Dynamics and Materials.
- `STB-01`: стабилизация уровня Procreate предлагает StreamLine, trajectory
  stabilization, motion filtering и pressure smoothing без потери точки/хвоста.
- `SMG-01`: отдельный инструмент Smudge («Палец») смешивает локальный пигмент
  выбранной кистью с strength/pickup/pull/dilution и pressure dynamics.
- `TLB-01`: перемещаемая панель имеет две кнопки в ряду и точный порядок из
  `05-tool-panel-ui-reference.md`; Text перемещается вместе с панелью, а Pixel
  Perfect и глобальной кнопки стабилизации нет.
- `HUI-01`: Huion Stylus settings replace Apple Pencil with pressure calibration,
  tilt/button/eraser mapping and live Windows Ink diagnostics.
- `CAN-01`: пресеты FHD/QHD/4K, A5/A4 300 DPI, Instagram и Reels плюс custom.
- `IMG-01`: view transform неразрушающий; Transform/Liquify растрируют один раз.
- `DSK-01`: Windows desktop build принимает pen pressure/tilt и touch gestures.
- `DOC-01`: layers, blend/opacity, masks, selections, transform и undo работают
  на больших документах без full-document snapshot на каждый dab.
- `IO-01`: gallery/autosave, flattened PNG и layered PSD/native interchange
  имеют проверяемый round trip.
- `EXP-01`: ПКМ по слою/группе открывает «Сохранить как холст» для одного,
  нескольких выделенных элементов или целой группы, с сохранением структуры
  и вариантами полного размера/обрезки по содержимому.
- `EXP-02`: Windows Save As всегда показывает путь и имя, предлагает имя
  документа/слоя/группы и запоминает последнюю выбранную директорию.
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
| `BRH-02..04`, `STB-01`, `SMG-01`, `HUI-01`, `TLB-01` shell, `DOC-01` performance | `R3` | reference-layout checks, library round trip, recorded-trace and smudge tests |
| `IMG-01` | `R4` | repeated preview equals one source-to-final resample |
| `DOC-01`, `IO-01`, `EXP-01..02`, full `TLB-01` | `R5` | document round trip, exact tool order and contextual canvas-save matrix preserve layers and pixels |
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
5. [`05-tool-panel-ui-reference.md`](05-tool-panel-ui-reference.md)
6. [`06-live-audit-2026-08-16.md`](06-live-audit-2026-08-16.md)
7. [`07-remediation-plan.md`](07-remediation-plan.md)
8. The current stage chapter
9. [`09-production-performance-audit-2026-08-16.md`](09-production-performance-audit-2026-08-16.md)
10. [`41-huion-device-matrix.md`](41-huion-device-matrix.md) for F5 evidence
11. [`08-interface-feature-parity.md`](08-interface-feature-parity.md) for the
    original UI and complete non-pixelizer behaviour oracle
12. [`90-verification.md`](90-verification.md)

## Delivery Order

| Stage | Chapter | Depends on | Status | Planned commit |
| --- | --- | --- | --- | --- |
| `R0` | [`10-stage-governance.md`](10-stage-governance.md) | none | done | `docs: plan raster editor migration` |
| `R1` | [`20-stage-typescript-desktop.md`](20-stage-typescript-desktop.md) | `R0` | done | `build: establish TypeScript desktop foundation` |
| `R2` | [`30-stage-raster-cutover.md`](30-stage-raster-cutover.md) | `R1` | in progress | `feat: restore the original raster editor shell` |
| `R3` | [`40-stage-brush-studio.md`](40-stage-brush-studio.md) | `R2` | blocked | `feat: add professional brush studio` |
| `R4` | [`50-stage-lossless-transform.md`](50-stage-lossless-transform.md) | `R2` | planned | `feat: add source-preserving transform and liquify` |
| `R5` | [`60-stage-document-workflow.md`](60-stage-document-workflow.md) | `R3`, `R4` | planned | `feat: complete professional document workflow` |
| `R6` | [`70-stage-cleanup-polish.md`](70-stage-cleanup-polish.md) | `R5` | planned | `chore: retire pixel editor and complete product docs` |

The audit reopens acceptance evidence without rewriting historical commits.
Repair slices `F0..F5` make R0/R1/R3 truthful and pull document safety forward;
`F6..F9` refine R4–R6. Their dependency order in
[`07-remediation-plan.md`](07-remediation-plan.md) takes precedence over starting
the next feature merely because its old stage number is next.

## Completion Definition

- [ ] Every requirement has positive and failure evidence.
- [ ] A packaged Windows build draws with pen pressure/tilt and touch navigation.
- [ ] Bundled brushes produce distinct repeatable strokes and expose compatibility.
- [ ] Required presets create/export exact dimensions and physical DPI metadata.
- [ ] Repeated view/preview operations do not accumulate raster degradation.
- [ ] Pixelizer and pixel-grid production paths are absent.
- [ ] Typecheck, lint, tests, architecture/docs/line gates and build pass.
- [ ] Every P0/P1 audit finding is closed by its named repair acceptance evidence.
- [ ] Stage records, roadmap, system docs and `Resume Here` agree.
