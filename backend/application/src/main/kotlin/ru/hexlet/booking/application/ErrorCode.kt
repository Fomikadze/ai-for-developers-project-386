package ru.hexlet.booking.application

/** Коды ошибок API. Совпадают с `enum ErrorCode` контракта, список и условия — в `docs/api.md`. */
enum class ErrorCode {
    VALIDATION_ERROR,
    INVALID_NAME,
    INVALID_EMAIL,
    INVALID_PHONE,
    SLOT_OUT_OF_RANGE,
    MEETING_TYPE_NOT_FOUND,
    SLOT_TAKEN,
}

/** Ошибка, которую `presentation` превращает в ответ `{ code, message }`. `message` — на английском. */
class ApiException(
    val code: ErrorCode,
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
