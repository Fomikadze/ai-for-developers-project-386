import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using Http;
using OpenAPI;

/**
 * API «Запись на звонок»: типы встреч, свободные слоты и брони единственного владельца.
 * Время передаётся в UTC (ISO 8601 с `Z`), часовой пояс владельца — поле `timezone` в `GET /api/owner`.
 */
@service(#{ title: "Booking API" })
@info(#{ version: "0.1.0" })
@route("/api")
namespace Booking;

// Ошибки

/** Код ошибки. Единственный список кодов и условия — `docs/api.md`. */
enum ErrorCode {
  /** Тело не разбирается как JSON, `notes` длиннее 500 символов или неверны поля типа встречи. */
  VALIDATION_ERROR,

  /** `guestName` отсутствует, неверной длины или не проходит паттерн. */
  INVALID_NAME,

  /** `guestEmail` отсутствует, длиннее 254 символов или не проходит паттерн. */
  INVALID_EMAIL,

  /** `guestPhone` отсутствует или не в формате E.164. */
  INVALID_PHONE,

  /** `start` не совпадает ни с одним слотом: вне окна записи, вне рабочих часов или не на шаге стартов. */
  SLOT_OUT_OF_RANGE,

  /** Тип встречи не найден. */
  MEETING_TYPE_NOT_FOUND,

  /** Слот пересекается с существующей бронью. */
  SLOT_TAKEN,
}

/** Тело любого ответа с ошибкой. */
@error
model ApiError {
  /** Машиночитаемый код, по нему фронтенд показывает перевод `errors.<code>`. */
  code: ErrorCode;

  /** Текст для отладки на английском, пользователю не показывается. */
  message: string;
}

@error
model BadRequestError {
  @statusCode statusCode: 400;
  ...ApiError;
}

@error
model NotFoundError {
  @statusCode statusCode: 404;
  ...ApiError;
}

@error
model ConflictError {
  @statusCode statusCode: 409;
  ...ApiError;
}

// Скаляры с правилами проверки (docs/api.md)

/** Идентификатор, который генерирует сервер. */
@format("uuid")
scalar Uuid extends string;

/** Имя гостя: слова из букв любого алфавита, разделённые одним пробелом или дефисом. */
@minLength(1)
@maxLength(100)
@pattern("^[\\p{L}\\p{M}]+(?:[ \\-][\\p{L}\\p{M}]+)*$")
scalar GuestName extends string;

/** Email гостя: WHATWG + dot-atom RFC 5321. */
@maxLength(254)
@pattern("^[A-Za-z0-9!#$%&'*+\\/=?^_`\\{\\|\\}~\\-]+(?:\\.[A-Za-z0-9!#$%&'*+\\/=?^_`\\{\\|\\}~\\-]+)*@[A-Za-z0-9](?:[A-Za-z0-9\\-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9\\-]{0,61}[A-Za-z0-9])?)+$")
scalar GuestEmail extends string;

/** Мобильный телефон в формате E.164. */
@pattern("^\\+[1-9]\\d{6,14}$")
scalar E164Phone extends string;

// Модели

model Health {
  status: "ok";
}

@example(#{
  name: "Иван Петров",
  title: "Менеджер по работе с клиентами",
  avatarUrl: null,
  timezone: "Asia/Almaty",
})
model Owner {
  name: string;

  /** Подпись под именем. */
  title: string;

  avatarUrl: url | null;

  /** Часовой пояс владельца (IANA), в нём фронтенд показывает время и группирует слоты по дням. */
  timezone: string;
}

@example(#{
  id: "3f1c2a9e-5b7d-4c8e-9a01-2b3c4d5e6f70",
  title: "Знакомство",
  description: "Короткий звонок, чтобы обсудить задачу.",
  durationMinutes: 30,
})
model MeetingType {
  id: Uuid;
  title: string;
  description: string;
  durationMinutes: int32;
}

@example(#{
  title: "Знакомство",
  description: "Короткий звонок, чтобы обсудить задачу.",
  durationMinutes: 30,
})
model CreateMeetingTypeRequest {
  @minLength(1)
  @maxLength(100)
  title: string;

  @maxLength(1000)
  description: string;

  /** Слот должен целиком помещаться в рабочие часы, кратность шагу стартов не требуется. */
  @minValue(15)
  @maxValue(540)
  durationMinutes: int32;
}

/** Свободный слот, полуинтервал `[start, end)`. */
@example(#{
  start: utcDateTime.fromISO("2026-11-02T04:00:00Z"),
  end: utcDateTime.fromISO("2026-11-02T04:30:00Z"),
})
model Slot {
  start: utcDateTime;
  end: utcDateTime;
}

/** Поля проверяются в порядке формы: `guestName` → `guestEmail` → `guestPhone` → `notes`. */
@example(#{
  meetingTypeId: "3f1c2a9e-5b7d-4c8e-9a01-2b3c4d5e6f70",
  start: utcDateTime.fromISO("2026-11-02T04:00:00Z"),
  guestName: "Анна Смирнова",
  guestEmail: "anna@example.com",
  guestPhone: "+77011234567",
  notes: "Хочу обсудить интеграцию.",
})
model CreateBookingRequest {
  meetingTypeId: Uuid;

  /** Старт одного из слотов `GET /api/meeting-types/{id}/slots`. `end` вычисляет сервер. */
  start: utcDateTime;

  guestName: GuestName;
  guestEmail: GuestEmail;
  guestPhone: E164Phone;

  /** Пустая строка приравнивается к отсутствию заметки. */
  @maxLength(500)
  notes?: string;
}

/** Тип встречи в составе брони. */
model BookingMeetingType {
  id: Uuid;
  title: string;
}

@example(#{
  id: "9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  meetingType: #{
    id: "3f1c2a9e-5b7d-4c8e-9a01-2b3c4d5e6f70",
    title: "Знакомство",
  },
  start: utcDateTime.fromISO("2026-11-02T04:00:00Z"),
  end: utcDateTime.fromISO("2026-11-02T04:30:00Z"),
  guestName: "Анна Смирнова",
  guestEmail: "anna@example.com",
  guestPhone: "+77011234567",
  notes: "Хочу обсудить интеграцию.",
})
model Booking {
  id: Uuid;
  meetingType: BookingMeetingType;
  start: utcDateTime;
  end: utcDateTime;
  guestName: string;
  guestEmail: string;
  guestPhone: string;

  /** `null`, если заметки нет или она пустая. */
  notes: string | null;
}

// Операции

@route("/health")
@get
op getHealth(): Health;

@route("/owner")
@get
op getOwner(): Owner;

@route("/meeting-types")
interface MeetingTypes {
  @get
  list(): MeetingType[];

  /** Создать тип встречи (владелец). */
  @post
  create(@body body: CreateMeetingTypeRequest):
    | {
        @statusCode statusCode: 201;
        @body body: MeetingType;
      }
    | BadRequestError;

  /** Только свободные слоты на всё окно записи по возрастанию `start`. */
  @route("/{id}/slots")
  @get
  listSlots(@path id: Uuid): Slot[] | NotFoundError;
}

@route("/bookings")
interface Bookings {
  /**
   * Создать бронь. Порядок проверок: поля (`INVALID_*`, `VALIDATION_ERROR`) → тип встречи существует
   * (`MEETING_TYPE_NOT_FOUND`) → `start` совпадает со слотом (`SLOT_OUT_OF_RANGE`) → пересечение (`SLOT_TAKEN`).
   */
  @post
  create(@body body: CreateBookingRequest):
    | {
        @statusCode statusCode: 201;
        @body body: Booking;
      }
    | BadRequestError
    | NotFoundError
    | ConflictError;

  /** Предстоящие брони всех типов (`end > now`) по возрастанию `start` (владелец). */
  @route("/upcoming")
  @get
  listUpcoming(): Booking[];
}
