# Conventions

Этот прежний entrypoint сохранён для совместимости ссылок. Канонические правила:

- [repository rules](rule-packs/00-core/repository-rules.md);
- [agent operation](rule-packs/10-ai-workflow/agent-operation.md);
- [planning](rule-packs/10-ai-workflow/planning.md);
- [architecture layers](rule-packs/20-architecture/layers.md);
- [validation policy](project/validation-policy.md).

Главные изменения: лимит 150 строк для нового кода, strict TypeScript,
типизированные границы, RGBA raster document вместо pixel grid и обязательный
source-preserving preview для Transform/Liquify.
