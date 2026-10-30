# Инструменты: mise, git-хуки, daemons, CI, smoke-тест

## mise

Версии инструментов (JDK, Node, pnpm, hk, pitchfork и инструменты проверок) и задачи проекта лежат в `mise.toml`. Это единственное место, где задаются версии: CI ставит их через `jdx/mise-action` и запускает те же задачи, что и локально.

- `mise install` ставит инструменты, `mise tasks` показывает задачи.
- `mise run check` — полная проверка, ровно то, что выполняет CI: `lint`, `lint:repo`, `lint:links`, `lint:commits`, `test`, `security`, `api:breaking`, затем `coverage:diff` и `smoke`. Нужны сеть и свободный порт 8080. Не входит `e2e`: он появится в `check` вместе с фронтендом.
- `mise run local-check` — быстрая версия для работы без сети и серверов: `lint`, `lint:repo`, `test`, `security`, `api:breaking`, затем `coverage:diff`.
- Задачи `lint:*` и `test:*` для `backend`, `frontend` и `typespec` пропускаются с сообщением, пока нет `gradlew` или `package.json`.
- Основные задачи: `mise run lint`, `mise run test`, `mise run sdk`, `mise run backend:run`, `mise run frontend:dev`, `mise run e2e`, `mise run smoke`.

## Git-хуки (hk)

hk ставится через mise, конфигурация — `hk.pkl` в корне. Хуки вызывают те же задачи mise, что и CI:

| Хук | Что запускает |
| --- | --- |
| `pre-commit` | линтеры `backend`, `frontend`, `contract`, `workflows`, `schemas`, `docker`, `markdown`, `typos`; `security:secrets:staged` |
| `commit-msg` | `commitlint` |
| `pre-push` | `test:backend`, `test:frontend`, `api:breaking`, `security:deps` |
| `check` (вручную: `hk check`) | то же, что `pre-commit` |

- Шаг с `glob` запускается, только если в изменениях есть подходящие файлы (`backend/**`, `*.md`, `Dockerfile*` и т. д.). Typos, поиск секретов и проверка зависимостей запускаются всегда.
- Установка хуков один раз после клонирования: `mise run hooks:install` (`hk install --mise`).
- Новая проверка добавляется как задача mise, а в `hk.pkl` — шаг, который её вызывает. Команды проверок в `hk.pkl` не дублируются.

## Проверки качества

| Инструмент | Задача mise | Что проверяет | Конфигурация |
| --- | --- | --- | --- |
| actionlint | `lint:workflows` | workflow GitHub Actions | — |
| check-jsonschema | `lint:schemas` | workflow и `renovate.json` по официальным схемам | — |
| hadolint | `lint:docker` | все `Dockerfile*` в репозитории | — |
| rumdl | `lint:markdown` | Markdown | `.rumdl.toml` |
| typos | `lint:typos` | опечатки в коде и документации (английский) | — |
| lychee | `lint:links` | битые ссылки и якоря в Markdown, нужна сеть | — |
| commitlint | `lint:commits`, хук `commit-msg` | сообщения коммитов | `commitlint.config.mjs` |
| betterleaks | `security:secrets`, `security:secrets:staged` | секреты в истории git и в проиндексированных изменениях | — |
| OSV-Scanner | `security:deps` | известные уязвимости в зависимостях по lock-файлам | — |
| oasdiff | `api:breaking` | ломающие изменения `typespec/openapi.yaml` относительно `origin/main` | `scripts/api-breaking.sh` |
| diff-cover | `coverage:diff` | покрытие изменённых строк, порог 80% | `scripts/coverage-diff.sh` |
| Renovate | — | обновления зависимостей и версий в `mise.toml` через PR | `renovate.json` |

Группы: `mise run lint:repo` (workflows, schemas, docker, markdown, typos), `mise run security` (секреты и зависимости).

- Коммиты пишутся по Conventional Commits: `тип(область): описание`. Типы: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Заголовок до 100 символов, без точки в конце.
- `api:breaking` и `coverage:diff` пропускают проверку, пока нет `openapi.yaml` в `origin/main` или отчётов о покрытии. Отчёты ожидаются в Cobertura: `backend/build/reports/kover/report.xml` (Kover) и `frontend/coverage/cobertura-coverage.xml` (Vitest).
- `security:deps` не падает, пока в репозитории нет lock-файлов.
- Renovate работает как GitHub App: его нужно установить в репозиторий на GitHub. CLI Renovate через mise не ставится: установка `npm:renovate@44.194.0` блокируется проверкой цепочки поставок mise (у зависимости `@yarnpkg/libzip@3.2.2` нет provenance), поэтому `renovate.json` проверяется только по схеме.
- detekt, ArchUnit и stylelint подключаются не через mise, а как зависимости проектов (см. [stack.md](stack.md)).

## Daemons (фоновые серверы разработки)

Серверы разработки описаны в `[daemons]` в `mise.toml` и управляются pitchfork. Для этого в `[settings]` включено `experimental = true`, а версия pitchfork зафиксирована в `[tools]`.

| Daemon | Задача | Готов, когда |
| --- | --- | --- |
| `backend` | `backend:run` | открыт порт 8080 |
| `frontend` | `frontend:dev` | открыт порт 5173; стартует после `backend` |

Группа `default` = `backend` + `frontend`.

- `mise daemons start` — запустить оба и дождаться готовности; `mise daemons start backend` — только бэкенд.
- `mise daemons stop` — остановить; `mise daemons restart` — перезапустить.
- `mise daemons ls` / `mise daemons status` — состояние; `mise daemons logs backend` — вывод.
- Агент запускает серверы только через daemons, а не фоновым `./gradlew run &` или `pnpm dev &`.

## CI

- `hexlet-check.yml` — автоматические тесты Хекслета, не трогаем и не меняем.
- `.github/workflows/check.yml` — один job: `mise run install`, затем `mise run check`. Запускается на push в любую ветку и на pull request, полная история git нужна для `lint:commits`, `api:breaking`, `coverage:diff` и поиска секретов.
- Задачи `lint:*`, `test:*` и `mise run install` пропускают `backend`, `frontend` и `typespec`, пока нет `gradlew` или `package.json`.
- В `frontend/` и `typespec/` должен быть закоммичен `pnpm-lock.yaml`. Скрипты во `frontend/package.json`: `lint`, `format:check`, `typecheck`, `generate`, `test`, `dev`.

## Docker

Dockerfile и docker-compose ещё не созданы. Описание запуска появится здесь вместе с ними.

## Smoke-тест

`scripts/smoke.sh` запускает бэкенд (`./gradlew run` в `backend/`, порт 8080) и ждёт ответ `200` от `GET /api/health` (до 120 с). Входит в `mise run check`, отдельно запускается как `mise run smoke`. Переменные: `APP_CMD`, `APP_DIR`, `SMOKE_URL`, `TIMEOUT`. Gradle запускается на JDK из `mise.toml` (Temurin 21), поэтому вызывайте его через `mise run` или `mise x -- ./gradlew`.
