#!/usr/bin/env bash
# Проверяет покрытие изменённых строк относительно BASE_REF (по умолчанию origin/main).
# Берёт найденные Cobertura-отчёты бэкенда и фронтенда; если отчётов нет — пропускает проверку.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
FAIL_UNDER="${FAIL_UNDER:-80}"
REPORTS=(
  backend/build/reports/kover/report.xml
  frontend/coverage/cobertura-coverage.xml
)

cd "$(dirname "$0")/.."

found=()
for report in "${REPORTS[@]}"; do
  [ -f "$report" ] && found+=("$report")
done

if [ "${#found[@]}" -eq 0 ]; then
  echo "coverage-diff: отчётов о покрытии нет, проверка пропущена"
  exit 0
fi

diff-cover "${found[@]}" --compare-branch="$BASE_REF" --fail-under="$FAIL_UNDER"
