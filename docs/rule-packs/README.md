# Rule packs

Правила сгруппированы по назначению и читаются в таком порядке:

1. [`00-core/repository-rules.md`](00-core/repository-rules.md) — размер,
   структура, данные и запреты.
2. [`10-ai-workflow/agent-operation.md`](10-ai-workflow/agent-operation.md) —
   начало, ведение и завершение задачи.
3. [`10-ai-workflow/planning.md`](10-ai-workflow/planning.md) — обязательный
   процесс для планов и миграций.
4. [`20-architecture/layers.md`](20-architecture/layers.md) — разрешённые
   зависимости и владение состоянием.

Rule pack — канон. `AGENTS.md`, hooks и планы только ссылаются на него.
