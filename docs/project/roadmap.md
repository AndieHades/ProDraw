# Roadmap ProDraw

Канонический порядок принадлежит
[`raster-editor-migration`](../tutorials/raster-editor-migration/README.md).

| Stage | Outcome | Status |
| --- | --- | --- |
| `R0` | правила, hooks, доказательный и восстанавливаемый план | done |
| `R1` | строгий TypeScript и Windows desktop shell | done |
| `R2` | рабочий RGBA editor и полное восстановление исходного UI | in progress |
| `R3` | честный Brush Studio, tablet input и bounded raster performance | blocked |
| `R4` | lossless view/transform и single-resample Liquify | planned |
| `R5` | профессиональный документ, persistence и interchange | planned |
| `R6` | UX polish, удаление legacy и финальная документация | planned |

Pixelizer и pixel-grid runtime не развиваются во время миграции. Tilemap/tileset
suite удалён по прямому решению пользователя; основной бесшовный `Режим тайла`
сохранён. Полезные функции старого приложения переносятся через новые контракты.

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

Текущий repair checkpoint: полный аудит `main@d3fc81a` подтвердил, что
`index.html → legacy-entry.js → app.js` всё ещё является production-владельцем,
а `RasterEditorApp` не достижим из entrypoint. `R2.11` теперь исполняется через
зарегистрированный
[`TypeScript/RGBA owner cutover`](../tutorials/raster-editor-migration/r2-11-owner-cutover/README.md):
сохраняются весь исходный UI и все неотменённые функции, после чего двойная
JS/grid архитектура удаляется. Физический Huion trace остаётся отдельным
acceptance-блокером F5, но не блокирует code cutover.

`R2.11/C0` закрыт в `0f12c2d`: production-граф теперь измеряется, его JS/grid
счётчики не могут расти, Electron IPC проверяет sender, dependency audit чист,
а desktop smoke использует каноническую упаковку. Активен `C1`: полный
сохранённый shell и его shared/pure leaves переводятся в TypeScript без замены
интерфейса сокращённой оболочкой.

Вне очереди больших стадий переоткрыт ограниченный
[`layer-export-viewport-repair`](../tutorials/layer-export-viewport-repair/README.md):
физическая проверка Photoshop опровергла decoder-derived top-first решение.
Активны восстановление bottom-first PSD-дескрипторов и bounded multi-file
export; PNG-дерево и фильтрация viewport остаются закрытыми. Этот repair не
объявляет R4/R5 завершёнными и не меняет активный owner-cutover `R2.11`.
