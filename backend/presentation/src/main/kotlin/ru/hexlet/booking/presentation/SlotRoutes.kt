package ru.hexlet.booking.presentation

import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import ru.hexlet.booking.application.ListSlots
import ru.hexlet.booking.application.ListSlotsHandler

fun Route.slotRoutes(listSlots: ListSlotsHandler) {
    get("/api/meeting-types/{id}/slots") {
        val slots = listSlots.handle(ListSlots(call.parameters["id"].orEmpty()))
        call.respond(slots.map { SlotResponse(it.start.toString(), it.end.toString()) })
    }
}
