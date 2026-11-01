# Проверка имени и email гостя одинаково в OpenAPI, Kotlin и браузере

Исследование к тикету [#8](https://github.com/Fomikadze/ai-for-developers-project-386/issues/8), карта [#6](https://github.com/Fomikadze/ai-for-developers-project-386/issues/6). Решение здесь не принимается — его примет grilling-тикет [#10](https://github.com/Fomikadze/ai-for-developers-project-386/issues/10). Ниже факты из первоисточников, проверки на реальных движках и кандидаты с компромиссами.

Дата: 2026-11-01. Версии, на которых проверено: TypeSpec compiler / openapi3 1.17.0, Node 22.23 (V8), Temurin 21.0.13 (`java.util.regex`), `@hey-api/openapi-ts` 0.99.0 (ветка main на 2026-10-01), `@mantine/form` 9.7.4.

## Коротко

1. **Один и тот же текст регулярки работает в TypeSpec → `openapi.yaml` → Java → JS**, если держаться общего подмножества: классы символов, `(?:…)`, квантификаторы, `^`/`$`, `\p{L}`/`\p{M}`, а внутри `[...]` экранировать `- / { } |`. Lookahead, именованные группы и флаги (`i`, `u`) в `pattern` не записываются.
2. **`\p{L}` в JS работает только с флагом `u` или `v`.** Без флага `/\p{L}/` молча означает «буква `p` и `{L}`» и не матчит ни одной буквы — ошибки нет, валидация просто всегда падает (проверено). Java понимает `\p{L}` без флагов.
3. **Флаг `u` при переносе паттерна из OpenAPI ставят не все.** JSON Schema 2020-12 требует его (SHOULD), Ajv ставит по умолчанию, плагины zod/valibot у hey-api ставят `u` только если в паттерне есть `\p{` или `\P{`. OpenAPI 3.0 (TypeSpec по умолчанию выпускает `openapi: 3.0.0`) формально ссылается на ECMA-262 5.1, где `\p{…}` нет вовсе.
4. **Атрибут HTML `pattern` компилируется с флагом `v`.** В `v`-режиме неэкранированный `-` внутри класса — синтаксическая ошибка, и браузер молча игнорирует такой `pattern`. Регулярка WHATWG для `type=email` в `v`-режиме тоже не компилируется.
5. **«Строгий» email = WHATWG, ужесточённый по RFC 5321:** dot-atom без ведущих, хвостовых и двойных точек, LDH-метки домена 1–63, минимум одна точка в домене, длина ≤ 254 (RFC 3696, erratum 1690). Кавычки, комментарии, IP-литералы и не-ASCII (SMTPUTF8) не принимаются.
6. **Готовые библиотеки реализуют другие правила, и правила на сторонах не совпадут.** Commons Validator сверяет TLD со списком IANA и принимает кавычки, Hibernate `@Email` принимает не-ASCII, `z.email()` у zod и `isEmail` у Mantine дают свои регулярки. Чтобы правило было одно, источником должен быть `pattern` из контракта, а библиотеки — разве что дополнением.

## 1. Как паттерн проходит по цепочке

### TypeSpec `@pattern`

- Сигнатура `@pattern(pattern: valueof string, validationMessage?: valueof string)`. Документация описывает «simple regular expression syntax»: альтернация, квантификаторы, `.`, группы; «Advanced features like look-around, capture groups, and references are not supported» ([TypeSpec, built-in decorators](https://typespec.io/docs/standard-library/built-in-decorators/#@pattern)). Классы символов в этом списке не названы, но на практике компилятор паттерн не разбирает и переносит в OpenAPI как есть (проверено на 1.17.0).
- Строки TypeSpec обрабатывают escape-последовательности: `@pattern("^[\p{L}]+$")` даёт ошибку компиляции на `\p`. Нужно писать `"\\p{L}"`, `"\\-"`, `"\\."` и так далее (проверено).
- Есть `@format("email")`: это подсказка формата, она ложится в `format: email` и от `@pattern` не зависит (там же).
- Эмиттер `@typespec/openapi3` по умолчанию пишет `openapi: 3.0.0` (проверено). Для 3.1 нужна опция `openapi-versions`.

Вывод `tsp compile` для кандидатов из разделов 3–4 (YAML без лишнего экранирования):

```yaml
guestName:
  type: string
  minLength: 1
  maxLength: 100
  pattern: ^[\p{L}\p{M}]+(?:[ \-][\p{L}\p{M}]+)*$
guestEmail:
  type: string
  maxLength: 254
  pattern: ^[A-Za-z0-9!#$%&'*+\/=?^_`\{\|\}~\-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`\{\|\}~\-]+)*@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$
  format: email
```

### Семантика `pattern` в OpenAPI и JSON Schema

- OpenAPI 3.0.3, Schema Object: `pattern` «SHOULD be a valid regular expression, according to the Ecma-262 Edition 5.1 regular expression dialect» ([OAS 3.0.3](https://spec.openapis.org/oas/v3.0.3.html#properties)). В ES5.1 нет `\p{…}` и флага `u` — формально `\p{L}` в документе 3.0 выходит за рамки спецификации, хотя инструменты его пропускают.
- OpenAPI 3.1 использует JSON Schema 2020-12. Её раздел 6.4 говорит: паттерны «SHOULD be valid according to the regular expression dialect described in ECMA-262, section 21.2.1», «SHOULD be built with the "u" flag (or equivalent) to provide Unicode support», и «implementations MUST NOT take regular expressions to be anchored» ([JSON Schema Core 2020-12, §6.4](https://json-schema.org/draft/2020-12/json-schema-core#name-regular-expressions)). Отсюда: `^` и `$` надо писать явно, иначе `pattern` проверяет вхождение подстроки.
- Там же рекомендовано ограничиться базовым подмножеством: символы, классы, квантификаторы, якоря, группы и альтернация. Lookahead в него не входит.
- `minLength`/`maxLength` в JSON Schema считают символы (code points) по RFC 8259, а `String.length` в JS и Java считает UTF-16 code units. Буква вне BMP, например `𝓐`, — это 1 code point, но 2 units (проверено: `"𝓐lice".length` = 6 в обоих языках, code points — 5). Для имени до 100 символов эта разница почти не встречается, но тесты на границу её покажут. Zod 4 считает code points (комментарий в `packages/zod/src/v4/core/checks.ts`).

### Java / Kotlin (`java.util.regex`)

- `\p{L}` и `\p{IsL}` обозначают категорию «буква». Поддерживаются `gc=`, скрипты (`IsCyrillic`, `sc=…`) и бинарные свойства (`IsAlphabetic`), внутри и вне класса, без флагов ([Pattern, JDK 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html)).
- `UNICODE_CHARACTER_CLASS` (`(?U)`) влияет только на `\w`, `\d`, `\s` и POSIX-классы, к `\p{…}` он не нужен (там же).
- `Matcher.matches()` требует совпадения всей строки, `find()` ищет подстроку. Поскольку в паттерне стоят явные `^…$`, поведение одинаковое.
- Обратный слэш перед неалфавитным символом в Java допустим, поэтому `\-`, `\/`, `\{`, `\|` компилируются (проверено).
- Kotlin: в raw string `"""…"""` экранировать обратный слэш не нужно, но `$` перед буквой или `{` станет шаблоном строки. В кандидатах `$` стоит перед `%` и в конце строки, поэтому шаблонов не возникает. Надёжнее держать паттерн одной константой и в тесте сверять её с `pattern` из `openapi.yaml`.
- Версия Unicode в JDK 21 — 15.0, а V8 обычно новее. Буквы, добавленные в Unicode позже, браузер примет, а бэкенд отклонит. На практике это редкие исторические письменности.

### JS `RegExp` в браузере

- `\p{…}` (Unicode property escapes) действуют только в unicode-aware режиме, то есть с флагом `u` или `v` ([MDN: Unicode character class escape](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape)).
- Без флага ошибки нет: `\p` превращается в букву `p`. Проверка: `new RegExp('^[\\p{L}\\p{M} \\-]+$')` на «Иван Петров» даёт `false`, а на `-` — `true`.
- `v`-режим (unicodeSets): внутри класса помимо `]` и `\` экранируются `( ) [ { } / - |` ([MDN: pattern attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/pattern), [MDN: unicodeSets](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets)). Проверено: `[\p{L}\p{M} -]` с флагом `v` выдаёт `SyntaxError: Invalid character in character class`.
- Атрибут `<input pattern>` компилируется с флагом `v` (до середины 2023 года — с `u`), а паттерн неявно оборачивается в `^(?:…)$`. Невалидный паттерн браузер молча не применяет (MDN, там же).
- В `u`-режиме identity escape разрешён только для синтаксических символов и `/`, плюс `\-` внутри класса. Поэтому `\'` или `` \` `` сломают паттерн в браузере, хотя Java их примет. Экранировать нужно только `- / { } |`.

### SDK hey-api и `@mantine/form`

- Сейчас в `frontend/openapi-ts.config.ts` подключены только `@hey-api/client-fetch` и `@tanstack/react-query`. Типы TS ограничений `pattern`/`maxLength` не несут, и в рантайме SDK без плагина-валидатора ничего не проверяет.
- Если подключить плагин `zod` (v3, v4, mini) или `valibot`, он сгенерирует `.regex(/…/u)`. Флаг `u` выставляется по эвристике `/\\[pP]\{/.test(schema.pattern) ? 'u' : undefined` (`packages/openapi-ts/src/plugins/zod/v4/toAst/string.ts`, аналогично в `zod/v3`, `zod/mini`, `valibot/v1`). Для имени с `\p{L}` флаг будет. Для email без `\p` флага не будет, но кандидаты email работают одинаково без флага и с `u`/`v` (проверено).
- Тот же плагин превращает `format: email` в `z.email()` (или `v.email()`), а `pattern` навешивает поверх: `z.email().max(254).regex(…)`. Тогда на фронтенде действуют две регулярки, а на бэкенде одна. Регулярка `z.email()` в zod 4 — «practical»: `^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$` (`packages/zod/src/v4/core/regexes.ts`). Она отклоняет, например, `!#$%&*/=?^{|}~` в локальной части и TLD с цифрами (`xn--p1ai`). `@format("email")` поэтому меняет правило на фронтенде.
- `isEmail()` в `@mantine/form` 9.7.4 — это `matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)` ([исходник](https://github.com/mantinedev/mantine/blob/master/packages/%40mantine/form/src/validators/is-email/is-email.ts)): это третье, своё правило. `matches(regexp)` принимает готовый `RegExp` и вызывает `regexp.test(value)`, так что паттерн из контракта можно передать туда с нужным флагом.

## 2. Что значит «строгий» email

### Нормы

- **RFC 5321 §4.1.2:** `Mailbox = Local-part "@" ( Domain / address-literal )`, `Local-part = Dot-string / Quoted-string`, `Dot-string = Atom *("." Atom)`, `Atom = 1*atext`. Домен: `sub-domain = Let-dig [Ldh-str]`. Получателю «SHOULD avoid defining mailboxes where the Local-part requires (or uses) the Quoted-string form» ([RFC 5321](https://www.rfc-editor.org/rfc/rfc5321#section-4.1.2)).
- **RFC 5321 §4.5.3.1:** local-part ≤ 64 октетов, домен ≤ 255, путь ≤ 256 октетов вместе с `<>`. **RFC 3696, erratum 1690 (Verified):** отсюда адрес ≤ 254 символов ([EID 1690](https://www.rfc-editor.org/errata/eid1690)).
- **RFC 5321 §2.4:** local-part MAY быть чувствительна к регистру, домен — нет. Это важно для сравнения, но не для формата.
- **RFC 5322 §3.2.3, `atext`:** `ALPHA / DIGIT / ! # $ % & ' * + - / = ? ^ _ \` { | } ~`. Кроме того, RFC 5322 допускает CFWS-комментарии и obsolete-синтаксис — для формы записи это лишнее.
- **WHATWG HTML, valid email address:** `email = 1*( atext / "." ) "@" label *( "." label )`, где метка — LDH длиной до 63 символов. Это «willful violation of RFC 5322»: правило слишком строгое до `@` и слишком мягкое после. Эталонная регулярка ([HTML Standard](https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address)):

  ```text
  ^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$
  ```

### Где WHATWG мягче RFC 5321 (кандидаты на ужесточение)

| Случай | WHATWG | RFC 5321 | Комментарий |
| --- | --- | --- | --- |
| `.a@x.com`, `a.@x.com`, `a..b@x.com` | принимает | нет (dot-string) | реальные почтовые серверы такие адреса отвергают |
| `user@localhost` (домен без точки) | принимает | формально да | для публичной формы бесполезно |
| общая длина > 254, local-part > 64 | не проверяет | нет | `maxLength: 254`; 64 регуляркой без lookahead не выразить |
| `"quoted"@x.com`, `a@[1.2.3.4]` | нет | да | RFC сам не советует; брать не нужно |
| не-ASCII (`пользователь@пример.рф`) | нет | нет (нужен SMTPUTF8, RFC 6531) | IDN-домен проходит в виде punycode `xn--…` |

Кроме того, сама регулярка WHATWG в `v`-режиме не компилируется из-за неэкранированных `/ { | } -` в классе (проверено), так что дословно в `<input pattern>` её не вставить.

## 3. Кандидаты для имени

Требование: буквы любого алфавита, пробел и дефис; длина 1–100 после `trim`.

Общее для обоих кандидатов:

- Нужен `\p{M}` (комбинирующие знаки): без него не проходят имена в деванагари и тайском, а также кириллица в NFD (`й` = `и` + U+0306). Проверено: `^\p{L}+$` на `"й".normalize("NFD")` даёт `false`, `^[\p{L}\p{M}]+$` — `true`.
- `trim` регуляркой не выражается. Варианты: клиент присылает уже обрезанное значение и контракт проверяет его как есть, либо сервер обрезает сам и потом сверяет с тем же паттерном. Во втором случае контракт строже фактического поведения сервера.
- Апостроф (`O'Brien`, `D'Artagnan`) и точка (`Jr.`) требованием исключены — это продуктовый вопрос для #10.

**N1 — структурный:**

```text
^[\p{L}\p{M}]+(?:[ \-][\p{L}\p{M}]+)*$      + minLength: 1, maxLength: 100
```

- Слова из букв разделены одним пробелом или дефисом. Ведущие и хвостовые пробелы, двойные пробелы, `-`, `Иван-`, «пробел + дефис» отклоняются.
- Длину 1–100 задают `minLength`/`maxLength`, не регулярка.
- Минус: «Иван - Петров» (пробел, дефис, пробел) не пройдёт. Строку из одних пробелов ловит сам паттерн, но только если `trim` выполнен до проверки.

**N2 — простой класс:**

```text
^[\p{L}\p{M} \-]+$                          + minLength: 1, maxLength: 100
```

- Проще читать и объяснять пользователю.
- Пропускает «Иван» с ведущим пробелом, `Иван  Петров`, `Иван-`, `-`, `---`. Поэтому нужен обязательный `trim` с обеих сторон и, скорее всего, отдельная проверка «есть хотя бы одна буква», иначе `-` — валидное имя. Lookahead `(?=.*\p{L})` для этого противоречит TypeSpec и рекомендованному подмножеству JSON Schema.

Проверено одинаково на Java 21 и V8 (флаги `u` и `v`): «Иван Петров», «Anna-Maria», «李小龍», «Nguyễn Văn A», «й», «𝓐lice» принимаются обоими кандидатами; «Иван2» и «O'Brien» отклоняются обоими.

## 4. Кандидаты для email

Общее для обоих кандидатов:

- `maxLength: 254` в контракте (RFC 3696 erratum 1690).
- Регистр: в `pattern` флаг `i` не записать, поэтому везде явный `A-Za-z`.
- Внутри классов экранированы `- / { } |`, так что паттерн компилируется в Java, в JS без флага, с `u` и с `v`.

**E1 — WHATWG + dot-atom из RFC 5321 (строже браузера, полный `atext`):**

```text
^[A-Za-z0-9!#$%&'*+\/=?^_`\{\|\}~\-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`\{\|\}~\-]+)*@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$
```

- Любой адрес, который пропускает E1, пропускает и `input type=email`. Обратное неверно: E1 дополнительно отклоняет точки по краям и подряд, а также домен без точки.
- Принимает `o'neil@example.com`, `user@xn--e1afmkfd.xn--p1ai` (punycode-TLD) и `user@example.c0m` (TLD с цифрой — формально допустимая LDH-метка).
- Минус: длинный и трудно читаемый. Символы `` ` ``, `'`, `$` требуют аккуратности в YAML, в строках TypeSpec (`\\`) и в Kotlin. Local-part ≤ 64 не проверяется.

**E2 — «практичный» (ограниченный набор символов local-part, буквенный TLD):**

```text
^[A-Za-z0-9_%+\-]+(?:\.[A-Za-z0-9_%+\-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$
```

- Ближе к тому, что пользователи считают нормальным email (похож на `isEmail` из Mantine и `z.email()` из zod, но без двойных точек).
- Отклоняет редкие, но валидные адреса с `! # $ & ' * / = ? ^ { | } ~` (в том числе `o'neil@…`, а апострофы в адресах встречаются).
- `[A-Za-z]{2,63}` отклоняет punycode-TLD (`.xn--p1ai` = `.рф`) — домены `.рф` в ASCII-записи не пройдут. Если вместо этого разрешить в TLD цифры и дефис, разница с E1 сводится к набору символов local-part.

Для сравнения: опубликованная регулярка WHATWG принимает `a..b@example.com`, `.a@example.com` и `user@localhost`, которые E1 отклоняет. В черновом варианте E2 `[A-Za-z0-9._%+\-]+@` (как у Mantine) пропускал `a..b@` и `.a@` — поэтому в E2 выше local-part собирается из атомов, разделённых точками.

## 5. Готовые библиотеки

| Сторона | Библиотека | Что делает | Совпадёт ли с `pattern` |
| --- | --- | --- | --- |
| JVM | Apache Commons Validator `EmailValidator` | local-part до 64 символов, допускает кавычки и не-ASCII; домен проверяет `DomainValidator`, в том числе по списку TLD IANA; IP-литералы по флагам ([исходник](https://github.com/apache/commons-validator/blob/master/src/main/java/org/apache/commons/validator/routines/EmailValidator.java)) | нет: другое правило, а список TLD стареет вместе с версией библиотеки |
| JVM | Hibernate Validator (`jakarta.validation.constraints.Email`) | atom с `\u0080-￿`, кавычки, local-part ≤ 64, домен ≤ 255 ([исходник](https://github.com/hibernate/hibernate-validator/blob/main/engine/src/main/java/org/hibernate/validator/internal/constraintvalidators/AbstractEmailValidator.java)); в Ktor без Bean Validation не интегрирован | нет: мягче и допускает не-ASCII |
| JVM | Ktor `RequestValidation` | только механизм `validate<T> { … }`, готовых правил email нет | — (сюда вызывают `Regex(pattern).matches(…)`) |
| TS | zod 4: `z.email()` и `z.regexes.html5Email` / `rfc5322Email` / `unicodeEmail` | набор регулярок на выбор; `html5Email` — дословно WHATWG ([исходник](https://github.com/colinhacks/zod/blob/main/packages/zod/src/v4/core/regexes.ts)) | `html5Email` совпадёт с WHATWG, но не с E1/E2 |
| TS | `@mantine/form` `isEmail` / `matches` | своя простая регулярка; `matches(re)` принимает любую | `matches` с паттерном из контракта — да |
| TS | плагины zod / valibot у `@hey-api/openapi-ts` | генерируют схему из `openapi.yaml`, `pattern` переносится дословно | да, если не мешает `format: email` (см. выше) |

Выходит, что «одно правило» получается только тогда, когда источником служит сам `pattern` из контракта, а бэкенд и фронтенд компилируют этот текст: Kotlin через `Regex(...)`, фронтенд через сгенерированную схему или `new RegExp(pattern, 'u')`. Библиотека на одной из сторон добавит расхождения.

## 6. Открытые вопросы для #10

- Имя: N1 или N2; нужны ли апостроф и точка; кто делает `trim` — клиент или сервер, и как это записать в контракте.
- Email: E1 (вся ширина `atext`) или E2 (практичный); принимать ли punycode-TLD; ставить ли `@format("email")`, учитывая, что hey-api/zod тогда добавит `z.email()`.
- OpenAPI 3.0 или 3.1. В 3.1 `\p{L}` и флаг `u` оговорены спецификацией, в 3.0 — нет.
- Подключать ли плагин `zod` (или `valibot`) к hey-api, чтобы фронтенд брал паттерн из сгенерированного кода, а не дублировал его.
- Код ошибки: остаётся ли `VALIDATION_ERROR` или нужны отдельные коды, как `INVALID_PHONE` (любой новый код проходит через `docs/api.md`, контракт и `ru`/`en.json`).

## Как проверялось

Матрица «паттерн × вход» прогнана на `java.util.regex.Pattern.matcher(s).matches()` (JDK 21.0.13) и на `new RegExp(p, flag).test(s)` с флагами `''`, `u`, `v` (Node 22.23). На всех движках, где паттерн компилируется, результаты совпали. Исключения — паттерны, которые не компилируются в `v`-режиме (неэкранированный `-` и регулярка WHATWG), а также `\p{…}` без флага в JS. TypeSpec 1.17.0 скомпилировал кандидаты в `openapi.yaml` (фрагмент в разделе 1) и отклонил `"\p{L}"` без двойного слэша.
