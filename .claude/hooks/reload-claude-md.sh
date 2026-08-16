#!/bin/bash
set -euo pipefail

# После сжатия контекста (SessionStart source=compact) — перечитать CLAUDE.md
# и вернуть его как additional context, чтобы правила проекта не терялись.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
[ -f CLAUDE.md ] || exit 0

echo "Контекст был сжат. Entry rules из CLAUDE.md (перечитаны):"
echo
cat CLAUDE.md

cat <<'EOF'

Дополнительный рабочий контекст после сжатия:
- Прочитать docs/project/context-recovery.md и живой Resume Here; сверить его с HEAD/status.
- Финальный продукт — Windows raster editor для пера; Vite/web — development runtime.
- Не развивать legacy pixelizer/grid/tilemap и не импортировать старые systems в новые.
- View transform не пишет в artwork; Transform/Liquify preview всегда читает immutable source и Apply растрирует один раз.
- Не запускать screenshot/долгий visual QA без явной просьбы; выбрать gate из validation-policy.md.
- Код/CSS/config держать до 150 строк, UI-текст в i18n, стили и размеры в tokens/config.
- Завершённый этап — отдельный commit; соблюдать Git-процесс из AGENTS.md.
EOF
