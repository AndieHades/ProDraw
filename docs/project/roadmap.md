# Roadmap ProDraw

Канонический порядок принадлежит
[`raster-editor-migration`](../tutorials/raster-editor-migration/README.md).

| Stage | Outcome | Status |
| --- | --- | --- |
| `R0` | правила, hooks, доказательный и восстанавливаемый план | done |
| `R1` | строгий TypeScript и Windows desktop shell | done |
| `R2` | рабочий RGBA editor cutover с bundled brushes | done |
| `R3` | честный Brush Studio, tablet input и bounded raster performance | in progress |
| `R4` | lossless view/transform и single-resample Liquify | planned |
| `R5` | профессиональный документ, persistence и interchange | planned |
| `R6` | UX polish, удаление legacy и финальная документация | planned |

Pixelizer, tilemap и pixel-grid runtime не развиваются во время миграции.
Полезные функции старого приложения переносятся только через новые контракты.

## Audit rebaseline

Live-аудит `main@6bcfdaa` зафиксирован в
[`06-live-audit-2026-08-16.md`](../tutorials/raster-editor-migration/06-live-audit-2026-08-16.md).
Он подтвердил raster/TypeScript cutover, но переоткрыл недоказанные acceptance
части R0/R1/R3 и поднял crash-safe documents из R5 перед новыми инструментами.

Канонический порядок исправлений: `F0` truthful gates → `F1` runtime seams →
`F2` document safety → `F3` performance/memory → `F4` brush truth → `F5`
Huion/touch/Smudge → `F6` R4 → `F7..F8` R5 → `F9` R6. Полные зависимости,
проверки и commit boundaries находятся в
[`07-remediation-plan.md`](../tutorials/raster-editor-migration/07-remediation-plan.md).

Текущий repair checkpoint: `F3` завершён в `bab3c4c` и `6f9ec00`; следующий
срез — `F4`: truthful `.brush` decode, параметры и единый renderer.
