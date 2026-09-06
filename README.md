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

На локальном NTFS-compressed checkout desktop runner собирает во временный
несжатый каталог и печатает путь к `ProDraw.exe`; в CI artifact остаётся в
`artifacts/desktop/win-unpacked`.

На Apple Silicon Mac команда ниже собирает, проверяет и обновляет приложение по
постоянному пути `/Applications/ProDraw.app`:

```bash
npm run package:mac
```

После первого запуска закрепи ProDraw в Dock. Последующие сборки обновляют тот
же `.app`, поэтому ярлык менять не нужно.

Перед изменениями прочитай [`AGENTS.md`](AGENTS.md) и
[`docs/index.md`](docs/index.md).
