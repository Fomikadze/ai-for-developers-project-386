package ru.hexlet.booking.presentation

import kotlinx.serialization.Serializable
import ru.hexlet.booking.application.ErrorCode

/** Тело любого ответа с ошибкой: ровно `{ code, message }`. */
@Serializable
data class ErrorResponse(
    val code: ErrorCode,
    val message: String,
)
