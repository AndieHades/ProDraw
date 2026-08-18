# Stage PBP-4: кривые отклика, динамики и taper

- Status: `completed`
- Depends on: `PBP-3`
- Requirements: `PBP-04`, `PBP-05`

## Scope

Три связанные группы, которые вместе задают «характер» штриха:

1. кривые `dynamicsPressure*Curve` — сейчас не читаются вообще;
2. активные динамики (`dynamicsJitterOpacity`, `dynamicsSpeedOpacity`,
   `dynamics*Speed`, `dynamicsTiltOpacity`) — сейчас в
   `unsupportedActiveFields`;
3. план даба и taper — сейчас на угаданных формулах.

Разделять их на отдельные коммиты бессмысленно: они действуют на один и тот же
множитель непрозрачности и размера, и по отдельности метрика не сойдётся.

## Change map

| Путь | Действие |
| --- | --- |
| `src/core/archive/keyedArchive.ts` | разбор `ValkyrieMagnitudinalCurve` |
| `src/logic/brush/responseCurve.ts` | новый — кусочная монотонная кривая |
| `src/core/brush/archiveControlMappings.ts` | кривые, count, orientation |
| `src/contracts/brush.ts` | поля кривых и скоростных динамик |
| `src/logic/brush/brushOpacity.ts` | кривая, jitter, скорость, наклон |
| `src/core/brush/renderBrushDab.ts` | кривая размера |
| `src/logic/brush/dabStampPlan.ts` | count 1..16, scatter |
| `src/logic/stroke/taperResponse.ts` | настоящий хвостовой taper |
| `src/logic/stroke/StrokePipeline.ts` | длина штриха для хвоста |
| `src/systems/draw/raster-brush.js` | перерисовка хвоста при отрыве |

## Контракты

- `responseCurve(points)` строит монотонную кусочно-линейную функцию `[0,1] →
  [0,1]` по контрольным точкам вида `{x, y}` из архива. Точки сортируются,
  дубликаты по `x` схлопываются, концы дотягиваются до 0 и 1.
- Порядок применения непрозрачности: `curve(pressure)` → отображение в
  `[minOpacity, maxOpacity]` → скоростной множитель → наклон → jitter →
  `flow` → `taper`. Clamp только на итоге.
- `minOpacity`/`maxOpacity` и `minSize`/`maxSize` перестают быть clamp и
  становятся концами отображения.
- `dynamicsJitterOpacity` детерминирован через `strokeRandom(brush.id, dab, …)`.
- `dynamics*Speed` сглаживают отклик по времени, а не по расстоянию.
- `shapeCount` отображается в `1..16`; формула фиксируется калибровкой `D-3`.
- `shapeOrientation` перестаёт питать `orientToScreen` и `relativeToStroke`
  одним условием: это разные понятия и разные поля архива.
- Хвостовой taper применяется к последним `endLength`-пикселям **фактического**
  штриха: при отрыве пера хвост перерисовывается из буфера штриха.
- `taperPressure` применяется к тому вводу, которому принадлежит
  (перо/касание), раздельно.

## Шаги

1. Научить `keyedArchive` возвращать точки кривых; строки вида
   `"{0.293590, 0.565130}"` парсить в числа.
2. Реализовать `responseCurve.ts` (≤ 150 строк) с тестами на монотонность и
   на края.
3. Пробросить кривые в контракт и в `brushOpacity` / `pressureBrushSize`.
4. Добавить скоростные и jitter-динамики; убрать соответствующие ключи из
   `unsupportedActiveFields`, добавив их в `supported`.
5. Исправить `count` и разделить `shapeOrientation`.
6. Перевести хвостовой taper на буфер штриха из `PBP-5`; если `PBP-5` ещё не
   сделан — вести собственный буфер хвоста длиной `endLength * size`.
7. Прогнать калибровку `D-3` по эталонам Rendering и Count.

## Edge и failure cases

- Кривая из двух точек `{0,0} {1,1}` обязана давать ровно тождество.
- Кривая с немонотонными точками — санитизировать, не падать.
- Штрих короче хвостового taper: taper применяется ко всему штриху.
- Одиночный тап: хвостовой taper не должен обнулять отпечаток.
- Нулевая скорость (пауза на месте) не должна делить на ноль.

## Persistence и rollback

`.prodraw-brush` получает новые поля; парсер
(`presetSettingsParser.ts`) обязан читать старые пресеты без них по дефолтам.
Round-trip тест обязателен. Откат — снятие полей, старые пресеты остаются
валидными.

## i18n и ассеты

Новые контролы в Brush Studio (`brushStudioControls.ts`) требуют ключей в
`enBrushControls.ts` и `ruBrushControls.ts`.

## Проверки

```bash
npx vitest run tests/brush tests/brush-parity tests/stroke
```

Плюс `npm run check`, `npx eslint src`, `npm run validate:lines`,
round-trip пресетов, browser smoke пером с реальным нажимом.

## Acceptance criteria

- При нажиме 0.2936 непрозрачность даба `lineart` равна `0.5651` от
  диапазона `[minOpacity, maxOpacity]` в пределах 1/255.
- Каждый ключ из таблицы «Разрыв 4» в `01-current-state.md` либо реализован,
  либо остаётся в `unsupportedActiveFields` с явной причиной.
- Клин 0.05 → 1.0 совпадает с эталоном по профилю ширины и профилю альфы в
  пределах порогов `02-target-contract.md`.
- Хвост штриха сужается на отрыве, а не в каждой точке низкого нажима.

## Completion record

- Commit: this stage commit
- Checks: focused golden-plan, curve, count/scatter, taper, archive round-trip
  and compositing coverage; 18 performance files / 55 tests
- Date: 2026-08-18
