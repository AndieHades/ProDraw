# Документация ProDraw

## Начало работы

1. [Правила репозитория](rule-packs/00-core/repository-rules.md)
2. [Работа агента](rule-packs/10-ai-workflow/agent-operation.md)
3. [Правила планирования](rule-packs/10-ai-workflow/planning.md)
4. [Архитектурные слои](rule-packs/20-architecture/layers.md)
5. [Политика проверок](project/validation-policy.md)
6. [Бюджеты raster runtime](project/performance-budgets.md)
7. [Roadmap](project/roadmap.md)

## Живые планы

- [Gallery drop import progress](project/gallery-drop-import-progress-plan.md) —
  полоса этапов для импорта, который длится дольше двух секунд.
- [PNG drop destination](project/png-drop-destination-plan.md) — выбор нового
  документа или верхнего слоя при PNG-drop над открытым холстом.
- [Layer-selection PNG export](project/layer-png-selection-export-plan.md) —
  две контекстные PNG-команды сохраняют один слой либо выбранное дерево слоёв.
- [Raster editor migration](tutorials/raster-editor-migration/README.md) — переход
  от pixel-grid редактора к TypeScript/RGBA-движку и профессиональным кистям.
- [R2.11 TypeScript/RGBA owner cutover](tutorials/raster-editor-migration/r2-11-owner-cutover/README.md)
  — полный аудит и исполняемый перенос сохранённого интерфейса и всех функций с
  двойной JS/grid архитектуры на единственный TypeScript/RGBA runtime.
- [Layer color effects and PNG export](tutorials/monochrome-effect-png-export/README.md)
  — монохром, настраиваемая яркость/контраст и effect-aware быстрый PNG.
- [Procreate brush parity](tutorials/procreate-brush-parity/README.md) —
  почему `.brush` рисует не как в Procreate и что нужно изменить в движке.
- [PSD document import](tutorials/psd-document-import/README.md) — единый
  drag/open workflow, структурные слои, группы, маски, alpha и эффекты PSD.
- [Asset editor cutover](tutorials/asset-editor-cutover/README.md) — переход
  к лёгкому редактору игровых PSD/PNG-ассетов без brush subsystem.
- [Реестр планов](tutorials/README.md)

## Системы

- [Архитектура](architecture.md)
- [Карта систем](systems.md)
- [Общие утилиты](utilities.md)
- [Конфигурация](config.md)
- [Хоткеи](keymap.md)
- [Локализация](i18n.md)
- [Темы](theming.md)

Документы о ранней pixel-art анимации и старом text tool являются историческим
материалом до этапа `R6`; они не задают целевой продукт. Tilemap/tileset suite
удалён, а основной бесшовный `Режим тайла` остаётся частью raster-продукта.
