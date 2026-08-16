# Архитектурные слои

## `src/app`

Composition root: создаёт сервисы, регистрирует systems и подключает UI.

## `src/contracts`

Serializable типы документа, слоя, кисти, команды, события и view models.
Контракты не знают DOM, Canvas implementation или IndexedDB.

## `src/logic`

Чистые функции: геометрия штриха, интерполяция pressure, scatter plan,
цветовые операции, bounds и расчёт памяти. Вход и выход передаются явно.

## `src/core`

Document store, command/event bus, history, raster surfaces, brush decoding,
persistence и resilience boundaries. Core не импортирует UI.

## `src/systems`

Один пользовательский/runtime процесс на каталог: drawing, layers, selection,
transform, import, export, autosave. Systems получают порты при создании и не
импортируют другие systems.

## `src/ui`

DOM-presenters и controls. UI получает serializable view model и команды;
не меняет raster buffer напрямую.

## `src/platform`

File System Access, clipboard, PWA/service worker и будущие desktop adapters.
Остальной runtime не вызывает platform API напрямую.

## `src/config`, `src/i18n`, `src/styles`

Пресеты/лимиты, пользовательские строки и theme tokens. Настраиваемое значение
не должно появляться магическим литералом в system.

## Разрешённый поток

`input/UI → typed command → owner system/core store → event/view model → UI`.
Рисование: pointer sample → чистый stroke planner → brush renderer → active
RGBA surface → history patch → composite/render event.
