#!/usr/bin/env bash
# E2E: поднимает бэкенд и фронтенд через daemons mise, прогоняет Playwright и останавливает серверы.
# Нужны свободные порты 8080 и 5173. TIMEOUT — секунды ожидания готовности серверов.
set -euo pipefail

TIMEOUT="${TIMEOUT:-180}"

cd "$(dirname "$0")/.."

# `mise daemons start` не завершается после запуска серверов, поэтому он идёт в фоне, а готовность ждём сами.
mise daemons start >/dev/null 2>&1 &
start_pid=$!
trap 'mise daemons stop >/dev/null 2>&1 || true; kill "$start_pid" 2>/dev/null || true' EXIT

for ((i = 0; i < TIMEOUT; i++)); do
  if curl -fsS http://localhost:8080/api/health >/dev/null 2>&1 && curl -fsS http://localhost:5173 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ((i == TIMEOUT)); then
  echo "e2e: серверы не поднялись за ${TIMEOUT}с" >&2
  exit 1
fi

pnpm --dir frontend exec playwright install --with-deps chromium
mise run e2e
