# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект

«Запись на звонок» — упрощённый аналог Cal.com (учебный проект Хекслета). Монорепозиторий: `typespec/` (контракт API), `backend/` (Kotlin + Ktor), `frontend/` (React + TypeScript + Vite + Mantine).

Сейчас готовы спецификация, инфраструктура и каркас `backend/`. `frontend/` и `typespec/` пустые, поэтому их шаги в CI, хуках и задачах mise пропускаются, пока не появятся `frontend/package.json` и `typespec/package.json`.

Требования, решения и правила лежат в `docs/`. Таблица «какой файл читать для какой задачи» находится в разделе «Документация для ИИ-агента» в `README.md`. Сверяйся с ней перед началом задачи и читай все подходящие файлы.

## Команды

Все инструменты и их версии задаются только в `mise.toml`. CI и git-хуки вызывают те же задачи mise.

```bash
mise install && mise run install   # инструменты и зависимости
mise run hooks:install             # git-хуки hk
mise tasks                         # список всех задач

mise run local-check               # быстрые локальные проверки без сети и серверов — запускай перед завершением задачи
mise run check                     # полная проверка, то же что в CI (нужны сеть и порт 8080)
mise run lint                      # backend + frontend + contract
mise run lint:repo                 # workflows, схемы, Dockerfile, Markdown, typos
mise run test                      # тесты бэкенда и фронтенда
mise run e2e                       # Playwright
mise run smoke                     # бэкенд поднимается и отвечает 200 на /api/health
mise run security                  # секреты и уязвимые зависимости
mise run contract && mise run sdk  # TypeSpec → openapi.yaml → SDK фронтенда
mise run api:breaking              # ломающие изменения openapi.yaml относительно origin/main
```

Один тест:

```bash
cd backend && ./gradlew :<модуль>:test --tests "<пакет>.<Класс>.<метод>"   # модули: domain, application, infrastructure, presentation
pnpm --dir frontend test -- <путь-к-файлу> -t "<имя теста>"                  # Vitest
pnpm --dir frontend exec playwright test <файл> -g "<имя теста>"
```

Серверы разработки запускай только через daemons mise, а не фоновыми `./gradlew run &` или `pnpm dev &`:
`mise daemons start [backend|frontend]`, `mise daemons stop`, `mise daemons status`, `mise daemons logs backend`.
Бэкенд слушает порт 8080, Vite — 5173 и проксирует `/api` на бэкенд.

## Архитектура, которую не видно из одного файла

- **Contract-first.** Источник правды — `typespec/main.tsp`. `openapi.yaml` генерируется и коммитится. SDK генерируется в `frontend/src/api/generated/` и не коммитится. Фронтенд обращается к API только через SDK. Серверный генератор не используется: роуты Ktor пишутся вручную по контракту и проверяются тестами на `testApplication`. При любом изменении API порядок такой: контракт → `openapi.yaml` → бэкенд и тесты → `mise run sdk` → фронтенд.
- **Бэкенд: Clean Architecture + CQRS.** Каждый слой — отдельный Gradle-модуль: `domain` ни от чего не зависит, `application` зависит от `domain`, `infrastructure` реализует порты `application`, `presentation` (Ktor, DI на Koin, плагин `application`) собирает всё вместе. У каждой команды и запроса свой интерфейс обработчика, наследующий `CommandHandler<C, R>` или `QueryHandler<Q, R>`, и одна реализация. Роуты зависят от интерфейса. Медиатора нет.
- **Запрет двойной записи.** Данные хранятся в памяти. Проверка пересечения и вставка брони выполняются атомарно под `Mutex` в `BookingRepository`, чтобы правило держалось при одновременных запросах. Интервалы — полуинтервалы `[start, end)` в `Instant`. `Clock` внедряется, чтобы тесты окна записи не зависели от текущей даты.
- **Расписание** (`docs/schedule.md`): часовой пояс `Asia/Almaty`, будни 09:00–18:00, шаг 30 минут, окно 14 дней начиная с завтра. API отдаёт только свободные слоты, фронтенд сам группирует их по дням.
- **Ошибки и i18n.** Ошибка API — это `{ code, message }`. Единственный список кодов находится в `docs/api.md`. Бэкенд не локализует тексты, фронтенд переводит по `errors.<code>`. Новый код ошибки добавляется в `docs/api.md`, контракт и оба файла `frontend/src/locales/{ru,en}.json`.

## Правила репозитория

- `.github/workflows/hexlet-check.yml` не трогать и не переименовывать.
- Коммиты пишутся по Conventional Commits (`тип(область): описание`, до 100 символов, без точки). Проверяет commitlint в хуке `commit-msg`.
- Хуки hk (`hk.pkl`) запускают линтеры, typos и betterleaks на `pre-commit`, тесты, oasdiff и OSV-Scanner на `pre-push`. Новая проверка оформляется задачей в `mise.toml`, а в `hk.pkl` и CI добавляется только её вызов.
- detekt, ArchUnit и stylelint подключаются как зависимости проектов, а не через mise. CLI Renovate через mise не ставится: установку блокирует trust policy. Подробности в `docs/tooling.md`.
