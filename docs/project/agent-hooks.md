# Agent hooks

`.claude/settings.json` и `.codex/hooks.json` содержат одинаковый переносимый
hook graph и вызывают общие entrypoints из `.claude/hooks`. Абсолютные пути,
копии правил и ссылки на старые репозитории запрещены.

`session-start.mjs` выдаёт короткие напоминания: прочитать канонические правила,
восстановить контекст, соблюдать границы и line limit, вести живой план,
использовать TypeScript и запускать подходящий gate. Compact повторяет этот же
entrypoint. `fetch-main.mjs` best-effort обновляет `origin/main` при новом prompt
и перед push, не блокируя offline-сессию. `session-start.sh` только подготавливает
remote workspace и локально ничего не устанавливает.

Hook не копирует rule packs. При смене правил сначала обновляется канонический
документ, затем entrypoint и только потом короткое напоминание hook.

`npm run validate:hooks` проверяет совпадение Claude/Codex graphs, существование
entrypoints, переносимость команд и отсутствие устаревшей/противоречивой политики.
