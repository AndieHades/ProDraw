#!/bin/bash
set -euo pipefail

# Only provision dependencies in remote environments.
if [ "${CLAUDE_CODE_REMOTE:-${CODEX_REMOTE:-}}" != "true" ]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-${CODEX_PROJECT_DIR:-}}"
if [ -z "$project_dir" ]; then
  project_dir=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
fi
cd "$project_dir"

npm install

# Optional browser provisioning is best-effort in a remote workspace.
npm install --no-save playwright >/dev/null 2>&1 || true
npx --yes playwright install chromium >/dev/null 2>&1 || true
