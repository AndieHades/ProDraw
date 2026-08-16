#!/bin/bash
# Свежий main перед каждой задачей (UserPromptSubmit) и перед git push (PreToolUse).
# Делает fetch и, если main ушёл вперёд, просит перенести работу поверх свежего main.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
input=$(cat 2>/dev/null)
ev=$(printf '%s' "$input" | jq -r '.hook_event_name // "UserPromptSubmit"' 2>/dev/null)
[ -n "$ev" ] || ev="UserPromptSubmit"
# на PreToolUse работаем только перед git push (фильтр if в конфиге ненадёжен) —
# иначе не дёргаем сеть на каждой bash-команде
if [ "$ev" = "PreToolUse" ]; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)
  case "$cmd" in *"git push"*) : ;; *) exit 0 ;; esac
fi
git fetch origin main -q 2>/dev/null || exit 0
behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
[ "${behind:-0}" -gt 0 ] || exit 0
msg="origin/main впереди на ${behind} коммит(ов). Перед коммитом/пушем: git rebase origin/main, затем npm run lint и npm test."
ctx=$(printf '%s' "$msg" | jq -Rs .)
printf '{"hookSpecificOutput":{"hookEventName":"%s","additionalContext":%s}}\n' "$ev" "$ctx"
