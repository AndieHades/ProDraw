# ProDraw

ProDraw — Windows-first растровый редактор для графического планшета.
Цель продукта: отзывчивое рисование и gestures уровня Procreate, документные
возможности Photoshop и отсутствие накопительного размытия при zoom, rotate,
Transform и Liquify.

## Текущий статус

Production entrypoint уже переведён на strict TypeScript и полноцветные ленивые
RGBA tiles. Он создаёт FHD–4K, A5/A4 и social-холсты, рисует 12 bundled
Procreate `.brush`, поддерживает pressure/eraser Pointer Events, слои,
tile-patch undo, autosave и PNG с DPI. Дальнейшие профессиональные этапы описаны
в [`docs/tutorials/raster-editor-migration/`](docs/tutorials/raster-editor-migration/README.md).

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

Полная проверка и Windows package:

```bash
npm run validate
npm run package:desktop
```

Локальная сборка всегда лежит в `%LOCALAPPDATA%\\ProDraw\\desktop-build\\win-unpacked`:
ярлык на `ProDraw.exe` остаётся рабочим и после следующей сборки. В CI artifact
остаётся в `artifacts/desktop/win-unpacked`.

Перед изменениями прочитай [`AGENTS.md`](AGENTS.md) и
[`docs/index.md`](docs/index.md).
