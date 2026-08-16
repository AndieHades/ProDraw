# Roadmap ProDraw

Канонический порядок принадлежит
[`raster-editor-migration`](../tutorials/raster-editor-migration/README.md).

| Stage | Outcome | Status |
| --- | --- | --- |
| `R0` | правила, hooks, доказательный и восстанавливаемый план | done |
| `R1` | строгий TypeScript и Windows desktop shell | done |
| `R2` | рабочий RGBA editor cutover с bundled brushes | ready |
| `R3` | Brush Studio, pen dynamics и производительность | planned |
| `R4` | lossless view/transform и single-resample Liquify | planned |
| `R5` | профессиональный документ, persistence и interchange | planned |
| `R6` | UX polish, удаление legacy и финальная документация | planned |

Pixelizer, tilemap и pixel-grid runtime не развиваются во время миграции.
Полезные функции старого приложения переносятся только через новые контракты.
