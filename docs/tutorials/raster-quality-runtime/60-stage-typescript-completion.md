# Stage `Q6`: оставшийся продакшн-JavaScript переведён в TypeScript

- Status: `in_progress`
- Depends on: `Q5`
- Requirements: `RQ-TS-01`, `RQ-OWN-02`, `RQ-PAR-01`

## Scope

Перевести оставшиеся живые `.js` модули в строгий TypeScript и завести
продакшн от одного TypeScript composition root `src/app/mountProductionShell.ts`.
`index.html` перестаёт грузить `legacy-entry.js`.

## Подэтапы

Один подэтап — один владелец процесса, один коммит, фокусные тесты и понижение
`maximumSourceJavaScriptFiles` в `project.config.json`.

| Подэтап | Владелец | Порядок |
| --- | --- | ---: |
| `Q6a` | чистая `logic` без зависимостей от JS | 1 |
| `Q6b` | `systems/draw`, `systems/freehand`, `systems/selection` | 2 |
| `Q6c` | `systems/layers` | 3 |
| `Q6d` | `systems/transform`, `crop`, `trim`, `effects`, `tint-shade` | 4 |
| `Q6e` | `systems/import`, `export`, `gallery`, `document-save` | 5 |
| `Q6f` | `systems/text-tool`, `animation` | 6 |
| `Q6g` | `systems/palette`, `color`, `eyedropper`, `reference-window` | 7 |
| `Q6h` | `systems/input`, `keyboard`, `toolbars`, `status`, `toolpops` | 8 |
| `Q6i` | composition root, `index.html`, удаление `app.js` и `legacy-entry.js` | 9 |

### Порядок внутри подэтапа

Конвертируется только «фронт»: модуль, у которого не осталось импортов `.js`.
После каждой партии фронт пересчитывается. На старте `Q6a` таких модулей было
`45` из `232`.

`Q6a` перевёл `monochrome`, `poly-mask`, `raster-cell-interner`, `cleanup`,
`quickshape`, `flood` и `selection-mask-map`: `253` → `246` source JS,
`169` → `168` legacy-state JS, индексных чтений пикселей `68` → `59`
(`cleanup` перестал индексировать сетку напрямую).

## Contracts

- Каждый подэтап оставляет продукт работающим и собираемым.
- `maximumSourceJavaScriptFiles` монотонно убывает; рост отклоняется гейтом.
- Порт не меняет поведение: сначала перенос типов, затем отдельная правка,
  если она нужна.
- Системы не начинают импортировать системы; композиция живёт в `src/app`.
- `window.__app` заменяется явным тестовым портом или удаляется вместе с
  тестом, который его требовал.

## Steps на подэтап

1. Прочитать модуль и его тесты; зафиксировать наблюдаемое поведение.
2. Перенести в `.ts` с явными типами; никаких `any` и `@ts-ignore`.
3. Заменить `.js` импорты на `.ts` у всех потребителей.
4. Прогнать фокусные тесты владельца.
5. Понизить `maximumSourceJavaScriptFiles`.
6. Один коммит.

## Edge and failure cases

- Циклический импорт после переноса: `validate:cycles` обязателен на каждом
  подэтапе.
- Лимит 150 строк: типизация удлиняет файл; делить по смыслу, не уплотнять.
- `structuredClone` и `Map`-структуры в состоянии: типы обязаны отражать
  реальную сериализуемость.
- Тесты, импортирующие `.js` путь: обновляются в том же коммите.
- `test/module-int.mjs` вне зелёного гейта: либо возвращается в гейт, либо
  удаляется с записанной причиной; висеть исключённым он не остаётся.

## Persistence and rollback

Схема не меняется. Откат — revert подэтапа; предыдущий подэтап рабочий.

## i18n and assets

Ключи и ассеты переносятся без переименования.

## Checks

- На подэтап: фокусные тесты владельца, `npm run check`, `npx eslint .`,
  `validate:cycles`, `validate:cutover`, `validate:lines`.
- На `Q6i`: `npm test`, `npm run validate`, `npm run build`,
  `npm run package:mac` и полный ручной проход `RQ-PAR-01`.

## Acceptance criteria

- [ ] `git ls-files src` не содержит `.js` продакшн-модулей.
- [ ] `index.html` грузит `src/app/mountProductionShell.ts`.
- [ ] `validate:raster-entry` подтверждает достигнутую цель.
- [ ] Каждая строка `RQ-PAR-01` имеет зелёное доказательство.

## Completion record

- Commit:
- Checks:
- Date:
