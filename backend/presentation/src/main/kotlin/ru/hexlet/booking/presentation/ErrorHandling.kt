package ru.hexlet.booking.presentation

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import ru.hexlet.booking.application.ApiException
import ru.hexlet.booking.application.ErrorCode

fun ErrorCode.httpStatus(): HttpStatusCode =
    when (this) {
        ErrorCode.VALIDATION_ERROR,
        ErrorCode.INVALID_NAME,
        ErrorCode.INVALID_EMAIL,
        ErrorCode.INVALID_PHONE,
        ErrorCode.SLOT_OUT_OF_RANGE,
        -> HttpStatusCode.BadRequest
        ErrorCode.MEETING_TYPE_NOT_FOUND -> HttpStatusCode.NotFound
        ErrorCode.SLOT_TAKEN -> HttpStatusCode.Conflict
    }

fun Application.configureErrorHandling() {
    install(StatusPages) {
        exception<ApiException> { call, cause ->
            call.respond(cause.code.httpStatus(), ErrorResponse(cause.code, cause.message.orEmpty()))
        }
        exception<BadRequestException> { call, _ ->
            call.respond(
                ErrorCode.VALIDATION_ERROR.httpStatus(),
                ErrorResponse(ErrorCode.VALIDATION_ERROR, "Request body is invalid"),
            )
        }
    }
}
