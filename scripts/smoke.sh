#!/usr/bin/env bash
# Smoke-тест: приложение поднимается и отвечает на health-check.
# APP_CMD — команда запуска (по умолчанию бэкенд), SMOKE_URL — адрес проверки, TIMEOUT — секунды ожидания.
set -euo pipefail

APP_CMD="${APP_CMD:-./gradlew run --no-daemon}"
APP_DIR="${APP_DIR:-backend}"
SMOKE_URL="${SMOKE_URL:-http://localhost:8080/api/health}"
TIMEOUT="${TIMEOUT:-120}"

cd "$(dirname "$0")/.."

(cd "$APP_DIR" && exec $APP_CMD) &
app_pid=$!
trap 'kill "$app_pid" 2>/dev/null || true; wait "$app_pid" 2>/dev/null || true' EXIT

for ((i = 0; i < TIMEOUT; i++)); do
  if ! kill -0 "$app_pid" 2>/dev/null; then
    echo "smoke: приложение завершилось до ответа" >&2
    exit 1
  fi
  if curl -fsS "$SMOKE_URL" >/dev/null 2>&1; then
    echo "smoke: OK ($SMOKE_URL)"
    exit 0
  fi
  sleep 1
done

echo "smoke: нет ответа от $SMOKE_URL за ${TIMEOUT}с" >&2
exit 1
