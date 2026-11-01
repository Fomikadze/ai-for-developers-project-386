# TypeSpec для ошибок, `@pattern` и `utcDateTime` под `@hey-api/openapi-ts`

Исследование к [#9](https://github.com/Fomikadze/ai-for-developers-project-386/issues/9), карта [#6](https://github.com/Fomikadze/ai-for-developers-project-386/issues/6). Контракт пишется в [#12](https://github.com/Fomikadze/ai-for-developers-project-386/issues/12). Здесь только паттерны и подводные камни.

## Как проверялось

Выводы проверены на прототипе, а не только по документации. Версии на 2026-11-01:

- `@typespec/compiler`, `@typespec/http`, `@typespec/openapi`, `@typespec/openapi3` — **1.17.0** (вышли 2026-10-08, `npm view`);
- `@hey-api/openapi-ts` — **0.99.0** (2026-06-22, последняя). Конфиг тот же, что в `frontend/openapi-ts.config.ts`: `@hey-api/client-fetch` + `@tanstack/react-query`;
- `oasdiff` **1.35.0** из `mise.toml`, запуск как в `scripts/api-breaking.sh`: `oasdiff breaking base new --fail-on ERR`.

Цепочка: прототип `main.tsp` → `tsp compile` (OpenAPI 3.1.0 и 3.0.0) → `openapi-ts` → `tsc --strict --noEmit` с `lib` из `frontend/tsconfig.json` (`ES2022, DOM, DOM.Iterable`). Сгенерированный код проходит проверку типов без ошибок. Цитаты ниже взяты из вывода инструментов.

Первичные источники:

- README эмиттера `@typespec/openapi3@1.17.0` (`node_modules/@typespec/openapi3/README.md`), он же <https://typespec.io/docs/emitters/openapi3/reference/emitter/>;
- TypeSpec HTTP: операции и ответы — <https://typespec.io/docs/libraries/http/operations/>, ошибки — <https://typespec.io/docs/getting-started/getting-started-rest/03-handling-errors/>, декораторы — <https://typespec.io/docs/standard-library/built-in-decorators/>, примеры — <https://typespec.io/docs/language-basics/documentation/> и <https://typespec.io/docs/standard-library/examples/>;
- hey-api: плагин TanStack Query — <https://heyapi.dev/openapi-ts/plugins/tanstack-query>, трансформеры — <https://heyapi.dev/openapi-ts/plugins/transformers>, типы конфига в `@hey-api/openapi-ts@0.99.0/dist/index.d.mts`, релиз 0.99.0 — <https://github.com/hey-api/openapi-ts/releases/tag/2026-06-22>;
- oasdiff: `oasdiff breaking --help` и тексты правил в его выводе.

## Итог в одном абзаце

Ошибки описываются одной моделью `ApiError { code: ErrorCode; message: string }` и тремя обёртками `@error` с `@statusCode` (400/404/409). Операция возвращает `Успех | BadRequestError | NotFoundError | ConflictError`. hey-api по этому генерирует типизированные `XxxErrors`/`XxxError` и передаёт их в `UseMutationOptions<…, XxxError, …>` и `queryOptions<…, XxxError, …>`. `ErrorCode` лучше сделать **закрытым** `enum`: тогда на фронтенде получается union литералов. Открытый union `string | …` в TypeScript схлопывается в `string`. Цена закрытого enum в том, что oasdiff считает новый код в ответе ошибкой `response-property-enum-value-added`. Это лечится файлом `--severity-levels`. `utcDateTime` эмитится как `string` + `format: date-time`, на фронтенде по умолчанию это `string`, и для нашего проекта это правильно. Nullable (`url | null`) корректно работает и в OpenAPI 3.0, и в 3.1, а в TypeScript даёт `string | null`. Рекомендуемая версия — OpenAPI **3.1.0**, путь вывода — `typespec/openapi.yaml` через `emitter-output-dir: "{project-root}"`.

## Что ожидает репозиторий

- `mise run contract` выполняет `pnpm --dir typespec exec tsp compile .`, то есть читает `typespec/tspconfig.yaml`. `typespec/package.json` должен содержать `@typespec/compiler`, `@typespec/http`, `@typespec/openapi`, `@typespec/openapi3`, иначе шаги пропускаются (`mise.toml`, задача `install`).
- `mise run sdk` зависит от `contract` и вызывает `pnpm --dir frontend generate`. Генерация запускается, только если существует `../typespec/openapi.yaml` (`frontend/package.json`). Значит, файл должен лежать **ровно** в `typespec/openapi.yaml`.
- `lint:contract` выполняет `tsp format --check '**/*.tsp'`, поэтому `main.tsp` должен быть отформатирован через `tsp format`.
- `mise run api:breaking` (`scripts/api-breaking.sh`) сравнивает `typespec/openapi.yaml` с `origin/main` и падает на уровне `ERR`. Пока файла нет в `main`, проверка пропускается.
- `docs/api.md` задаёт 7 эндпоинтов под `/api`, ошибки 400 (`POST /meeting-types`), 404 (`GET /meeting-types/{id}/slots`) и 400/404/409 (`POST /bookings`), а также 5 кодов ошибок и регулярное выражение для телефона `^\+[1-9]\d{6,14}$`.

## Паттерны TypeSpec и что из них получается

### Ошибки `{ code, message }` с несколькими статусами

```tsp
@error
model ApiError {
  code: ErrorCode;
  message: string;
}

@error
model BadRequestError {
  @statusCode statusCode: 400;
  ...ApiError;
}
// NotFoundError (404) и ConflictError (409) по тому же шаблону

@post create(@body body: CreateBookingRequest): {
  @statusCode statusCode: 201;
  @body body: Booking;
} | BadRequestError | NotFoundError | ConflictError;
```

- Эмиттер выносит тело всех трёх обёрток в **одну** схему `#/components/schemas/ApiError` и ставит её на `'400'`, `'404'`, `'409'`. Поле `statusCode` в тело не попадает. Описания ответов стандартные (`The server could not understand the request…`).
- hey-api генерирует `BookingsCreateErrors = { 400: ApiError; 404: ApiError; 409: ApiError }`, `BookingsCreateError = ApiError` и `bookingsCreateMutation(): UseMutationOptions<BookingsCreateResponse, BookingsCreateError, Options<BookingsCreateData>>`. Для `listSlots` получается `queryOptions<…, MeetingTypesListSlotsError, …>`.
- Если у операции ошибки не объявлены, тип ошибки будет `DefaultError` в TanStack и `unknown` в SDK. Чтобы все операции получили `ApiError`, можно добавить `@error model` **без** `@statusCode`, это ответ `default`. Для нашего API это не обязательно.
- **Камень: статуса в ошибке нет.** В TanStack-обёртках `throwOnError: true`, и клиент `client-fetch` бросает распарсенное JSON-тело (`throw finalError`, `client/client.gen.ts`). То есть `error` в `onError` — это `ApiError`, без HTTP-статуса. Ветвиться нужно по `error.code`, это и так совпадает с i18n `errors.<code>`. Если статус всё-таки понадобится, его можно добавить через `client.interceptors.error`.
- **Камень: имя поля `@statusCode`.** В `@opExample` поле ответа указывается по имени свойства. При `@statusCode _: 409` пример `returnType: #{ statusCode: 409, … }` не компилируется (`unassignable`). Поле стоит назвать `statusCode`.

### Коды ошибок: enum, а не открытый union

| Вариант в TypeSpec | OpenAPI | Тип в hey-api | oasdiff при добавлении кода |
| --- | --- | --- | --- |
| `enum ErrorCode { VALIDATION_ERROR, … }` (или union без `string`) | `type: string, enum: […]` | `'VALIDATION_ERROR' \| …` | `ERR response-property-enum-value-added` |
| `union ErrorCode { string, A: "A", … }` (открытый) | `anyOf: [{type: string}, {enum}]` | `string \| 'A' \| …`, то есть фактически `string` | тоже `ERR` (oasdiff смотрит в `anyOf`) |
| `x-extensible-enum` через `@extension` | `type: string, x-extensible-enum: […]` | `string` (hey-api 0.99 расширение не знает) | не ломающее |

Рекомендация: закрытый `enum ErrorCode` с членами в UPPER_SNAKE, значения совпадают с именами. Тогда фронтенд получает тип для ключей `errors.<code>`. Новый код ошибки в ответе oasdiff по умолчанию считает ломающим изменением («The server may now return a value the previous contract excluded… declare it with x-extensible-enum»). Проверено: файл с одной строкой

```text
response-property-enum-value-added warn
```

переданный через `oasdiff breaking … --severity-levels <файл>`, понижает это правило до `warning`, и проверка проходит (`exit=0`). Включать ли это в `scripts/api-breaking.sh` — решение для #12 или отдельной задачи по tooling. Без этого добавление кода из `docs/api.md` будет блокировать `pre-push` и CI. Вариант с `enum` и `x-extensible-enum` одновременно не помогает: oasdiff всё равно смотрит на `enum`.

`enum-strategy: annotated` (только 3.1) эмитит `oneOf` с `const`. Для hey-api это не нужно, оставляем `default`.

### `@pattern`, `@minLength`/`@maxLength`, `@minValue`/`@maxValue`

```tsp
@pattern("^\\+[1-9]\\d{6,14}$")
scalar E164Phone extends string;

@minLength(1) @maxLength(100) title: string;
@maxLength(500) notes?: string;
@minValue(5) @maxValue(480) durationMinutes: int32;
```

- Эмитится `pattern: ^\+[1-9]\d{6,14}$`. В строке TypeSpec обратные слэши **удваиваются**. Ограничения превращаются в `minLength`/`maxLength`/`minimum`/`maximum`, `int32` — в `type: integer, format: int32`.
- На `scalar` паттерн становится отдельной схемой `E164Phone` с `$ref`, hey-api даёт `export type E164Phone = string`. В типы TypeScript ограничения не попадают. Это нормально: проверка остаётся на бэкенде (400) и в форме фронтенда. При желании валидатор можно сгенерировать плагином `zod` (`validator` в `@hey-api/sdk`), но нам он не нужен.
- oasdiff ловит ужесточение (`request-property-max-length-decreased`, проверено).
- `@format("email")` даёт `format: email` и тип `string`.

### `utcDateTime`

- `start: utcDateTime` эмитится как `type: string, format: date-time`. В `@example` значения задаются как `utcDateTime.fromISO("2026-11-02T04:00:00Z")`.
- По умолчанию hey-api даёт `string`. Плагин `{ name: '@hey-api/transformers', dates: true }` вместе с `{ name: '@hey-api/sdk', transformer: true }` превращает поля в `Date` и генерирует `transformers.gen.ts` (`new Date(data.start)`).
- **Камни трансформеров** (документация и прототип): `Date` становится и тип **запросов** (`CreateBookingRequest.start: Date`), а `JSON.stringify` отправит `…T04:00:00.000Z` с миллисекундами (`Instant.parse` в Kotlin это принимает). Ответы-ошибки не трансформируются. Union-ответы не трансформируются. Трансформируются только типы через `$ref`. Есть цена в рантайме.
- Рекомендация: **оставить `string`**, трансформеры не включать. API отдаёт ISO-строки в UTC, фронтенд группирует слоты по дням в `Asia/Almaty` через `dayjs` (`docs/schedule.md`). Строка проще передаётся обратно в `POST /bookings` без потерь, а `Date` в ключах запросов и состоянии TanStack ничего не даёт.

### Nullable (`avatarUrl: string | null`)

| | OpenAPI 3.1.0 | OpenAPI 3.0.0 |
| --- | --- | --- |
| TypeSpec `avatarUrl: url \| null` | `anyOf: [{type: string, format: uri}, {type: 'null'}]` | `type: string, format: uri, nullable: true` |
| hey-api | `avatarUrl: string \| null` | `avatarUrl: string \| null` |
| oasdiff (поле стало nullable в ответе) | `ERR response-property-list-of-types-widened` | `ERR response-property-became-nullable` |

Обе версии работают одинаково. Поле обязательное и nullable (ключ есть всегда). Это отличается от `avatarUrl?: string`, где ключа может не быть. В `docs/api.md` написано «может быть `null`», значит нужен первый вариант.

### `@example` и `@opExample`

- `@example(#{ … })` на модели в 3.1 даёт `examples: [ … ]` в схеме, в 3.0 — `example:`. На hey-api это не влияет.
- `@opExample(#{ parameters: #{ body: #{…} }, returnType: #{ statusCode: 409, code: "SLOT_TAKEN", message: "…" } })` кладёт `example` в `requestBody` и в ответ с подходящим статусом. Значения проверяются компилятором на соответствие типам.
- Примеры моделей не наследуются через spread (`...CreateBookingRequest` в `Booking`).

### Только чтение и тела запросов

`@visibility(Lifecycle.Read) id: string` в модели, которая используется и как тело `POST`, эмитится как `readOnly: true`, отдельной схемы не создаётся. hey-api сам генерирует `MeetingTypeWritable` без `id` и подставляет его в `MeetingTypesCreateData.body`. Это работает, но отдельная модель запроса (`CreateMeetingTypeRequest`, как уже сделано с `CreateBookingRequest`) понятнее и совпадает с DTO бэкенда. Рекомендую отдельные модели запросов.

### operationId и имена в SDK

- По умолчанию `operation-id-strategy: parent-container`: операция внутри `interface Bookings` получает `Bookings_create`, операция в корне namespace — просто `getOwner`.
- hey-api переводит это в camelCase: `bookingsCreate` (SDK), `bookingsCreateMutation`, `meetingTypesListSlotsOptions`/`…QueryKey`, `getOwnerOptions`.
- Хуки `useXxx` **по умолчанию не генерируются**. Генерируются фабрики опций для `useQuery(getOwnerOptions())` и `useMutation(bookingsCreateMutation())`. В 0.99 у плагина `@tanstack/react-query` есть опции `useQuery: true` и `useMutation: true` (`@default false`, шаблоны имён `use{{name}}Query`/`use{{name}}Mutation`), проверено: получаются `useGetOwnerQuery`, `useBookingsCreateMutation`. Документация плагина хуки не описывает, поэтому каноничный путь — фабрики опций.
- **Камень:** переименование интерфейса или операции меняет имена во всём фронтенде. oasdiff такое не ловит. Имена лучше зафиксировать сразу: либо осмысленными `interface` + `op` (`MeetingTypes.listSlots` → `meetingTypesListSlots`), либо `@operationId("…")` на каждой операции.

### Вывод в `typespec/openapi.yaml`

По умолчанию эмиттер пишет в `{output-dir}/@typespec/openapi3`, то есть в `tsp-output/@typespec/openapi3/openapi.yaml`, а версия по умолчанию — `["3.0.0"]` (README эмиттера). Нужно переопределить оба значения. `openapi-versions` — это **массив**: строка даёт `invalid-schema: must be array`.

## Минимальный `tspconfig.yaml`

```yaml
emit:
  - "@typespec/openapi3"
options:
  "@typespec/openapi3":
    emitter-output-dir: "{project-root}"
    output-file: "openapi.yaml"
    openapi-versions:
      - "3.1.0"
warn-as-error: true
```

Почему 3.1.0: nullable получается стандартным `type: 'null'`, а hey-api 0.99 и oasdiff 1.35 работают с ним без проблем (проверено, включая `breaking` на собственном выводе TypeSpec). 3.2.0 эмиттер уже умеет, но поддержку в hey-api и oasdiff я не проверял, поэтому её не берём.

## Скелет `main.tsp` (паттерн, не контракт)

```tsp
import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using Http;
using OpenAPI;

@service(#{ title: "Booking API" })
@info(#{ version: "0.1.0" })
@route("/api")
namespace Booking;

/** Единственный список кодов — docs/api.md. */
enum ErrorCode {
  VALIDATION_ERROR,
  // … остальные коды из docs/api.md
}

@error
model ApiError {
  code: ErrorCode;
  message: string;
}

@error
model BadRequestError {
  @statusCode statusCode: 400;
  ...ApiError;
}
// NotFoundError (404), ConflictError (409) аналогично

@pattern("^\\+[1-9]\\d{6,14}$")
scalar E164Phone extends string;

model Owner {
  name: string;
  title: string;
  avatarUrl: url | null;
}

model Slot {
  start: utcDateTime;
  end: utcDateTime;
}

@example(#{ start: utcDateTime.fromISO("2026-11-02T04:00:00Z") /* … */ })
model CreateBookingRequest {
  start: utcDateTime;
  guestPhone: E164Phone;
  @maxLength(500) notes?: string;
  // …
}

@route("/owner") @get op getOwner(): Owner;

@route("/bookings")
interface Bookings {
  @post create(@body body: CreateBookingRequest): {
    @statusCode statusCode: 201;
    @body body: Booking;
  } | BadRequestError | NotFoundError | ConflictError;
}
```

Использование на фронтенде:

```ts
const owner = useQuery(getOwnerOptions());
const create = useMutation({
  ...bookingsCreateMutation(),
  onError: (error) => notify(t(`errors.${error.code}`)), // error: ApiError
});
```

## Чек-лист подводных камней

1. Открытый union кодов (`string | …`) в TypeScript схлопывается в `string`. Нужен закрытый `enum`.
2. Новое значение enum в ответе oasdiff считает `ERR`, в том числе внутри `anyOf`. Понижается через `--severity-levels` (`response-property-enum-value-added warn`). `x-extensible-enum` hey-api превращает в `string`.
3. Брошенная ошибка в TanStack — это тело `ApiError` без статуса. Ветвиться по `code`.
4. У операций без объявленных ошибок тип ошибки `DefaultError`/`unknown`.
5. `utcDateTime` даёт `string`. Трансформер `dates` меняет и типы запросов, не трогает ошибки и union-ответы. Для проекта не включаем.
6. Nullable корректен в 3.0 и 3.1. `x: T | null` (обязательное) ≠ `x?: T`.
7. В TypeSpec по умолчанию OpenAPI 3.0.0 и `tsp-output/…`. Нужны `openapi-versions: ["3.1.0"]` (массив) и `emitter-output-dir: "{project-root}"`.
8. Хуки `useXxx` не генерируются без `useQuery`/`useMutation: true`. Имена берутся из operationId (`Interface_op` → `interfaceOp`), их переименование oasdiff не ловит.
9. В `@pattern` обратные слэши удваиваются. Ограничения в типы TypeScript не попадают.
10. Имя поля `@statusCode` видно в `@opExample` (`returnType: #{ statusCode: … }`).
