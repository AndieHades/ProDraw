# Архитектура

Целевая архитектура определена в
[`rule-packs/20-architecture/layers.md`](rule-packs/20-architecture/layers.md),
а последовательность cutover — в
[`raster-editor-migration`](tutorials/raster-editor-migration/README.md).

## Владение

- `contracts` — serializable document/layer/brush/command/event types;
- `logic` — чистая геометрия, stroke planning, pressure и resampling math;
- `core` — RGBA tile surfaces, store, history, bus, persistence, decode;
- `systems` — drawing/layers/selection/transform/import/export процессы;
- `ui` — view models, controls и dispatch typed commands;
- `platform` — Electron/web filesystem, clipboard и lifecycle adapters;
- `app` — composition root.

Systems не импортируют systems. UI не меняет surface. Viewport matrix не входит
в историю и не пишет в RGBA. Transform/Liquify preview всегда читает один
immutable source и выполняет единственный final resample на Apply.

## Переход

Production entrypoint `src/main.ts` собирает только target TypeScript graph.
`src/core/state.js` и `Layer.grid` остаются неисполняемым legacy oracle до R6;
новый TypeScript не зависит от них, что проверяет `validate:raster-entry`.
