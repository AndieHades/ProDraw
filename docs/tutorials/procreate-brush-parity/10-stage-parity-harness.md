# Stage PBP-1: измеримая метрика расхождения

- Status: `deferred`
- Depends on: пользовательские Procreate reference PNG; не блокирует PBP-2
- Requirement: `PBP-01`

## Scope

Дать возможность отвечать на вопрос «стало ближе или дальше» числом. Без этого
этапа все последующие правки — угадывание.

Внутри scope: headless-рендер штриха выбранной кистью, загрузка эталонного PNG,
метрики сравнения, отчёт. Вне scope: любые изменения самого движка кисти.

## Change map

| Путь | Действие |
| --- | --- |
| `tests/brush-parity/renderStroke.ts` | новый — детерминированный рендер штриха |
| `tests/brush-parity/strokeFixtures.ts` | новый — эталонные траектории |
| `tests/brush-parity/compare.ts` | новый — метрики из `02-target-contract.md` |
| `tests/brush-parity/parity.test.ts` | новый — прогон по фикстурам |
| `tests/brush-parity/reference/` | новый — PNG из Procreate |
| `docs/tutorials/procreate-brush-parity/90-verification.md` | пороги |

## Контракты

- `renderStroke(brush, fixture, options)` работает без DOM: собственный
  `Uint8ClampedArray` вместо слоя, `StrokePipeline` и `visitBrushDab` — те же,
  что в продакшене. Никаких копий движка.
- Фикстура задаёт точки `{x, y, pressure, tiltX, tiltY, time, pointerType}`,
  размер холста, размер и непрозрачность слайдеров.
- Все стохастические источники идут через `strokeRandom(brush.id, ...)`, поэтому
  рендер уже детерминирован; тест обязан это утверждать.
- `compare(actual, expected)` возвращает `{meanAlphaDelta, p99AlphaDelta,
  areaDelta, widthDelta, centerlineDelta, windowVarianceDelta}`.

## Шаги

1. Вынести из `raster-brush.js` минимальный headless-путь: painter, пишущий в
   плоский буфер. Продакшен-путь не трогать, переиспользовать `visitBrushDab`.
2. Описать пять фикстур: горизонталь на нажиме 0.5; клин 0.05 → 1.0; дуга
   180°; самопересечение (восьмёрка); одиночный тап.
3. Реализовать метрики. Ширина — по строкам поперёк штриха, центральная линия —
   взвешенный центроид альфы.
4. Добавить протокол получения эталонов в `90-verification.md` и положить
   первые PNG в `tests/brush-parity/reference/`.
5. Зафиксировать текущие значения метрик как baseline в
   `tests/brush-parity/baseline.json` — это стартовая точка, а не порог.

## Edge и failure cases

- Эталонного PNG нет → тест помечается `skip` с точным именем фикстуры, а не
  падает и не проходит молча.
- Размеры эталона и рендера различаются → жёсткая ошибка, без ресемпла.
- Пустой штрих (все альфы нули) → ошибка, иначе метрики выглядят идеально.

## Persistence и rollback

Данных не пишет. Откат — удаление каталога `tests/brush-parity/`.

## i18n и ассеты

Пользовательского текста нет. PNG-эталоны хранятся как есть, без ресемпла.

## Проверки

```bash
npx vitest run tests/brush-parity
```

Плюс `npm run check` и `npx eslint tests/brush-parity`.

## Acceptance criteria

- Повторный прогон даёт побитово те же метрики.
- Отчёт печатает все шесть метрик по каждой фикстуре.
- Baseline зафиксирован в репозитории и содержит числа, а не «TODO».

## Completion record

- Commit:
- Checks:
- Date: deferred 2026-08-18 по `D-7`; визуальную приёмку выполняет владелец
