package ru.hexlet.booking.presentation

import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import ru.hexlet.booking.application.CreateBooking
import ru.hexlet.booking.application.CreateBookingHandler
import ru.hexlet.booking.application.ListUpcomingBookings
import ru.hexlet.booking.application.ListUpcomingBookingsHandler
import ru.hexlet.booking.domain.Booking

@Serializable
data class BookingMeetingTypeResponse(
    val id: String,
    val title: String,
)

@Serializable
data class BookingResponse(
    val id: String,
    val meetingType: BookingMeetingTypeResponse,
    val start: String,
    val end: String,
    val guestName: String,
    val guestEmail: String,
    val guestPhone: String,
    val notes: String?,
)

private fun Booking.toResponse() =
    BookingResponse(
        id = id.toString(),
        meetingType = BookingMeetingTypeResponse(meetingType.id.toString(), meetingType.title),
        start = start.toString(),
        end = end.toString(),
        guestName = guestName,
        guestEmail = guestEmail,
        guestPhone = guestPhone,
        notes = notes,
    )

/** Строка остаётся строкой, отсутствующее поле и `null` дают `null`, остальные типы передаются как есть. */
private fun JsonObject.raw(key: String): Any? =
    when (val value: JsonElement? = this[key]) {
        null, JsonNull -> null
        is JsonPrimitive -> if (value.isString) value.content else value
        else -> value
    }

fun Route.bookingRoutes(
    createBooking: CreateBookingHandler,
    listUpcomingBookings: ListUpcomingBookingsHandler,
) {
    get("/api/bookings/upcoming") {
        call.respond(listUpcomingBookings.handle(ListUpcomingBookings).map { it.toResponse() })
    }
    post("/api/bookings") {
        // Тело, которое не объект, даёт BadRequestException и VALIDATION_ERROR.
        val body = call.receive<JsonObject>()
        val command =
            CreateBooking(
                meetingTypeId = body.raw("meetingTypeId"),
                start = body.raw("start"),
                guestName = body.raw("guestName"),
                guestEmail = body.raw("guestEmail"),
                guestPhone = body.raw("guestPhone"),
                notes = body.raw("notes"),
            )
        call.respond(HttpStatusCode.Created, createBooking.handle(command).toResponse())
    }
}
