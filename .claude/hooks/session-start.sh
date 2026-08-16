#!/bin/bash
set -euo pipefail

# Only run in remote (web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

npm install

# Браузер для визуальной проверки UI редактора (best-effort — не валим сессию,
# если сеть/политика не дают скачать). playwright тянет и пакет, и chromium.
npm install --no-save playwright >/dev/null 2>&1 || true
npx --yes playwright install chromium >/dev/null 2>&1 || true
