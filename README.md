# ProDraw

ProDraw — будущий Windows-first растровый редактор для графического планшета.
Цель продукта: отзывчивое рисование и gestures уровня Procreate, документные
возможности Photoshop и отсутствие накопительного размытия при zoom, rotate,
Transform и Liquify.

## Текущий статус

В `main@df2b924` ещё работает прежний pixel-grid PWA. Активная миграция описана
в [`docs/tutorials/raster-editor-migration/`](docs/tutorials/raster-editor-migration/README.md).
До этапа `R2` наличие старого UI не означает, что pixel-art остаётся целью.

Целевой стек: Vite + strict TypeScript для development runtime, Electron для
Windows package, типизированные contracts/commands/events, lazy RGBA tiles и
проверяемый brush pipeline.

## Разработка

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

Новые gates добавляются по этапам миграции. Сейчас доступны:

```bash
npm run validate:docs
npm run validate:lines
```

Перед изменениями прочитай [`AGENTS.md`](AGENTS.md) и
[`docs/index.md`](docs/index.md).
