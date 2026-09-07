# Бюджеты raster runtime

- Status: `frozen for F3`
- Code: `bab3c4c`, `6f9ec00`
- Date: 2026-08-16
- Reference host: Windows 11 Pro `10.0.26200`, AMD Ryzen 5 7530U,
  Node `24.18.0`, npm `11.16.0`

## Как воспроизвести

Обычный `npm test` запускает функциональные тесты, затем изолированный профиль
одним worker. Для чисел в таблице:

```powershell
$env:PRODRAW_REPORT_PERF='1'
npm run test:performance -- --reporter=verbose
```

Профиль нельзя смешивать с параллельными функциональными workers: тогда он
измеряет конкуренцию test runner, а не raster runtime. CI-пределы принадлежат
`src/config/performance.ts`; размеры caches/history — `src/config/raster.ts`.

## Замороженные regression gates

| Метрика | Предел |
| --- | ---: |
| холодный composite заполненного FHD/A4/4K | `< 500 ms` |
| тёплый cached composite p95 | `< 16 ms` |
| 240 Hz stroke kernel p95 | `< 8 ms` |
| 240 Hz input → готовая frame model p95 | `< 16 ms` |
| сериализация изменённого заполненного документа | `< 250 ms` |
| сериализация без изменений | `< 16 ms`, `0` copied tiles |
| backing bytes заполненной fixture | `≤ 48 MiB` |
| backing bytes A4 stroke trace | `≤ 8 MiB` |
| retained Undo | `≤ 256 MiB` и `≤ 100` entries |

Предел — красная линия для разнородных CI-машин, а не заявленная обычная
скорость. Reference-результат должен быть существенно лучше.

## Reference results

Viewport `1280×720`; каждый заполненный документ имеет сплошной базовый слой и
разреженный второй слой с opacity, поэтому тест не маскирует multi-layer blend.

| Fixture | Allocated | Cold | Warm p50 | Warm p95 | Save changed | Save unchanged |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| FHD `1920×1080` | 10.75 MiB | 17.87 ms | 0.17 ms | 0.71 ms | 5.22 ms | 0.13 ms |
| A4 `2480×3508` | 37.25 MiB | 52.29 ms | 0.31 ms | 3.26 ms | 15.96 ms | 0.28 ms |
| 4K `3840×2160` | 36.00 MiB | 58.11 ms | 0.24 ms | 0.62 ms | 17.56 ms | 0.34 ms |

Синтетическая A4-линия из 240 samples/s: input p50 `0.29 ms`, p95 `0.83 ms`;
input → frame p50 `0.71 ms`, p95 `1.93 ms`; surface и retained history по
`3.75 MiB`.

## Что гарантирует F3

- Composite cache invalidates отдельный tile по revision/параметрам слоя,
  перечисляет только viewport bounds и имеет LRU ceiling.
- Canvas presenter повторно использует tile canvases и не вызывает
  `putImageData`, пока presentation revision не изменилась.
- Undo/Redo считает реальные bytes обеих сторон patch и вытесняет старые записи.
- Recovery v2 записывает только изменённые tile blobs, хранит две generation и
  удаляет blobs, на которые они больше не ссылаются; v1 остаётся читаемым.
- Autosave coalesces очередь, не снимает snapshot при открытом pen edit, отдаёт
  event loop каждые четыре tiles и повторяет изменившийся во время копии снимок.
- PNG export проверяет pixel budget до allocation, композитит порциями, сообщает
  progress и принимает `AbortSignal`.
- Time-compressed five-minute fixture делает 300 commits и доказывает plateau:
  одна surface tile, 16 retained entries и ровно 8 MiB history budget.

## Границы доказательства

`Save changed` измеряет создание сериализованного snapshot; IndexedDB delta и
atomic generation проверяются функционально, но disk latency зависит от машины.
Tile bytes и history учитываются точно, process RSS/GPU allocation — нет. Реальный
пятиминутный Huion trace, palm rejection и 60/120/240 Hz device equivalence
принадлежат F5. PSD и полноценный flattened PNG workflow принадлежат F7; текущий
PNG renderer уже имеет F3 safety/cancel contract.

## Baseline `Q0` (2026-09-06, macOS)

Host: Apple Silicon Mac, Node из `.nvmrc`. Записано этапом `Q0` пакета
[`raster-quality-runtime`](../tutorials/raster-quality-runtime/README.md)
командой `PRODRAW_REPORT_PERF=1 npm run test:performance`.

| Метрика | Замер | Предел | Запас |
| --- | ---: | ---: | ---: |
| `ProductionSimple-pencil-64` | `8.42 ms` | `75 ms` | 8.9× |
| `ProductionSimple-eraser-64` | `4.89 ms` | `75 ms` | 15.3× |
| `ProductionSimple-pencil-64-line` | `64.99 ms` | `75 ms` | **1.15×** |
| `ProductionBigSoft-160` | `17.17 ms` | `75 ms` | 4.4× |

`ProductionSimple-pencil-64-line` — один интерполированный ход пера кистью
`64 px`. У него практически нет запаса: медиана пяти прогретых замеров
`64.99 ms` при разбросе `64.74`–`65.37 ms`. Одиночный холодный замер в этом же
наборе давал `286 ms`, поэтому методика приведена к медиане пяти прогретых
замеров, как у соседнего `ProductionBigSoft`. Предел не поднимался.

Причина расхода зафиксирована в
[`01-current-state.md`](../tutorials/raster-quality-runtime/01-current-state.md):
каждый окрашенный пиксель пишется в четыре представления, а запись в sparse
`Proxy` в 93 раза дороже типизированного буфера. Метрика принадлежит этапу
`Q2B`; после него требуется запас не меньше четырёх крат.

## `Q2B-1` (2026-09-06, macOS)

| Метрика | `Q0` | `Q2B-1` | Предел | Запас |
| --- | ---: | ---: | ---: | ---: |
| `ProductionSimple-pencil-64` | `8.42 ms` | `6.44 ms` | `75 ms` | 11.6× |
| `ProductionSimple-eraser-64` | `4.89 ms` | `3.66 ms` | `75 ms` | 20.5× |
| `ProductionSimple-pencil-64-line` | `64.99 ms` | `20.75 ms` | `75 ms` | **3.6×** |
| `ProductionBigSoft-160` | `17.17 ms` | `16.66 ms` | `75 ms` | 4.5× |

Профиль показал, что `62` из `65 ms` интерполированного хода приходились на фазу
накопления, а не на запись: `4 ms`. Ни аллокация записи на пиксель, ни запись в
sparse `Proxy` не были причиной — обе гипотезы проверены прямым замером и
отброшены. Стоил повторный расчёт симметрии: отпечаток вызывал
`symmetryConfig()` и `mirrorPoints()` на каждый из примерно `168 000` пикселей
хода, а painter применял симметрию ещё раз поверх результата.

Метрика `ProductionSimple-pencil-64-line` перестала быть впритык к пределу:
запас вырос с `1.15×` до `3.6×`. Требование `Q2B` — не меньше четырёх крат;
остаток закроет снятие двойной записи.
