#!/usr/bin/env bash
# Сравнивает typespec/openapi.yaml с версией в BASE_REF (по умолчанию origin/main)
# и падает на ломающих изменениях. Если файла нет в одной из версий — пропускает проверку.
# Уровни правил переопределяет scripts/oasdiff-severity-levels.txt (новый код ошибки — предупреждение).
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
SPEC="typespec/openapi.yaml"

cd "$(dirname "$0")/.."

if [ ! -f "$SPEC" ]; then
  echo "api-breaking: $SPEC нет, проверка пропущена"
  exit 0
fi

base="$(mktemp)"
trap 'rm -f "$base"' EXIT

if ! git show "$BASE_REF:$SPEC" >"$base" 2>/dev/null; then
  echo "api-breaking: $SPEC нет в $BASE_REF, проверка пропущена"
  exit 0
fi

oasdiff breaking "$base" "$SPEC" --fail-on ERR --severity-levels scripts/oasdiff-severity-levels.txt
