# Календарь звонков

[![hexlet-check](https://github.com/Fomikadze/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Fomikadze/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: <https://ru.hexlet.io/programs/ai-for-developers>
Как это должно работать: <https://files.hexlet.app/a/2ipc5m>

## Описание проекта

«Запись на звонок» это упрощённый сервис бронирования времени по мотивам Cal.com.

![Референс на cal.com](/references/img/cal-com.png)

Cal.com это сервис, где пользователь публикует доступные интервалы, а другой человек выбирает свободное время и бронирует встречу. У данного приложения тот же базовый сценарий: владелец публикует доступное время для встреч, а другой пользователь выбирает свободный слот и записывается на звонок.

В проекте нет авторизации, личных кабинетов и интеграций с внешними календарями. Функциональность намеренно ограничена, чтобы сосредоточиться на главном.

В результате должно получиться небольшое, но законченное приложение.

Пример того, что должно получиться:

![Начальный экран](/references/img/01-home.png)
![Выбор типа события и времени](/references/img/02-book-catalog.png)
![Выбор дня и свободного времени для записи](/references/img/03-book-event-type.png)

## Документация для ИИ-агента

Подробности лежат в [docs/](docs/). Перед началом задачи прочитай все файлы, условия которых подходят. Если не уверен, начни с `requirements.md`.

| Файл | Читай, если задача |
| --- | --- |
| [docs/requirements.md](docs/requirements.md) | добавляет или меняет поведение приложения: любую фичу, экран или эндпоинт |
| [docs/schedule.md](docs/schedule.md) | касается слотов, окна записи, рабочих часов, часового пояса или пересечений броней |
| [docs/api.md](docs/api.md) | меняет `typespec/`, эндпоинты, поля запросов и ответов, коды ошибок или SDK |
| [docs/architecture.md](docs/architecture.md) | меняет код в `backend/` |
| [docs/frontend.md](docs/frontend.md) | меняет код во `frontend/`: экраны, маршруты, компоненты, запросы к API |
| [docs/i18n.md](docs/i18n.md) | меняет тексты интерфейса, переводы или вывод дат и ошибок во `frontend/` |
| [docs/stack.md](docs/stack.md) | добавляет зависимость, выбирает библиотеку или пишет тесты |
| [docs/tooling.md](docs/tooling.md) | меняет `mise.toml`, `hk.pkl`, `.github/workflows/`, `scripts/`, конфигурацию проверок, Docker, сборку или запуск; запускает или останавливает серверы разработки; делает коммит |

Структура репозитория: монорепозиторий из `typespec/` (контракт), `backend/` (Kotlin + Ktor) и `frontend/` (React + TypeScript). Файл `.github/workflows/hexlet-check.yml` не трогаем и не меняем.

## Установка

```bash
git clone https://github.com/Fomikadze/ai-for-developers-project-386.git
cd ai-for-developers-project-386
mise install   # JDK, Node, pnpm нужных версий
mise run install
mise run hooks:install   # git-хуки hk
```

Для установки нужен [mise](https://mise.jdx.dev/).

## Использование

<!-- Добавьте примеры запуска и запись asciinema — именно это смотрит работодатель -->

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
