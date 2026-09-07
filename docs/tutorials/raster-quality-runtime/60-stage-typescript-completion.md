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

`Q6a` перевёл чистую `logic`: `monochrome`, `poly-mask`,
`raster-cell-interner`, `cleanup`, `quickshape`, `flood`,
`selection-mask-map`, `rotsprite`, `sample`, `brush-mask`.
Затем `env`, `palette-folder-glob`, `box-fit`, `text-prefs`, `config/presets`
и `config/palette`. Счётчики: source JS `253` → `236`, legacy-state JS
`169` → `167`, индексных чтений пикселей `68` → `57` (типизация сеток заменила
прямое индексирование проверяемыми аксессорами).

### Второе измерение этапа: слои

`89` из оставшихся `236` JS-модулей импортировали `src/ui` — как правило `$`,
`t` и `toast` из `ui/dom/ShellDom`. Правило `no-ui-in-core-runtime` запрещает
это для TypeScript, поэтому такой модуль нельзя было просто перетипизировать.

`Q6b` снял эту блокировку по существу, а не обходом. Из трёх имён только одно
было презентацией: `t` всегда жил в `src/i18n`, `$` — это
`document.getElementById`, а `toast` уже разводился событием `feedback`, на
которое оболочка подписывает свой презентер. Все три переехали в
`core/shell.ts`, а `ui/dom/ShellDom` теперь реэкспортирует их для UI. `84`
модуля перестали импортировать `src/ui`: их осталось `40` вместо `89`, и все
оставшиеся тянут настоящие презентеры — меню и буфер обмена.

Заодно оболочка забрала показ контекстного меню трансформации: система только
объявляла момент событием, а меню показывала сама, импортируя презентер.

Панель библиотеки кистей вскрыла второй вид той же блокировки: она жила
отдельной системой `systems/simple-brush-library` и импортировала
`systems/draw`. В JavaScript это проходило, `no-cross-system-imports`
запрещает это в TypeScript. Панель — представление системы рисования, поэтому
она переехала внутрь неё (`systems/draw/brush-library-panel`), а оболочка окна
выделилась в `brush-panel-chrome`, чтобы файл остался в лимите строк.

`Q6c` разобрал границу до конца. Из `47` импортов `src/ui` в системах три
символа представлением не были и переехали в `core`: жесты вызова контекстного
меню (`core/input/ContextGesture`), копирование текста (`core/clipboard-text`)
и зона попадания при перетаскивании (`core/dragdrop/DropZone`). Каталог
`src/ui/gestures` исчез целиком — за пределами систем его никто не импортировал.

Остальное решается командой, а не переносом. Показ меню держал четырнадцать
систем на JavaScript, но сам презентер переносить нельзя: он знает слой окон и
разметку оболочки. Поэтому системе достались `openMenuAt` и `openMenuBeside` из
`core/menus`: система называет меню и точку привязки, оболочка резолвит узлы и
размещает меню — тем же приёмом, что уже работал для контекстного меню
трансформации. Импортов `src/ui` из систем осталось `26`.

Портирование уже вскрыло одно такое нарушение, которое JS скрывал: `systems/toolpops`
импортировал `ui/windows/FloatingWindow`. Правило `no-ui-in-core-runtime`
проверяет только TypeScript, поэтому нарушение держалось. Модуль переехал в
`ui/windows/ToolPopoverWindows` и монтируется из composition root, а не из
списка систем.

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
