# Живые планы

- [`raster-quality-runtime/`](raster-quality-runtime/README.md) — текущий
  control plane: правдивые гейты, единственный тайловый владелец пикселей,
  честный ввод пера, рабочие кисти и завершение перехода на TypeScript.
- [`raster-editor-migration/`](raster-editor-migration/README.md) — активная
  миграция ProDraw на TypeScript, RGBA layers и профессиональные кисти.
- [`raster-editor-migration/r2-11-owner-cutover/`](raster-editor-migration/r2-11-owner-cutover/README.md)
  — предшествующий control plane сохранения UI/функций при удалении двойной
  legacy JS/grid архитектуры; его этапы `C6A`/`C6B` пересматриваются в
  `raster-quality-runtime`.
- [`monochrome-effect-png-export/`](monochrome-effect-png-export/README.md) —
  исполняемый parity-срез для неразрушающего монохрома и PNG слоя/папки.
- [`procreate-brush-parity/`](procreate-brush-parity/README.md) — разбор и план
  совпадения штриха `.brush` с Procreate на эталоне `lineart.brush`.
- [`psd-document-import/`](psd-document-import/README.md) — исполняемый
  вертикальный план открытия PSD новым документом с сохранением структуры.
- [`asset-editor-cutover/`](asset-editor-cutover/README.md) — удаление brush
  subsystem, простой ластик и постоянное отражение документа.
- [`gallery-memory-safety/`](gallery-memory-safety/README.md) — безопасная по
  памяти галерея и компактные Crop/Trim для больших документов.
