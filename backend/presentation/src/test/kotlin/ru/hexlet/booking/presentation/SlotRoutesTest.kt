package ru.hexlet.booking.presentation

import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private val almaty = ZoneId.of("Asia/Almaty")

private suspend fun HttpClient.createTypeId(duration: Int): String {
    val response =
        post("/api/meeting-types") {
            contentType(ContentType.Application.Json)
            setBody("""{"title":"T","description":"","durationMinutes":$duration}""")
        }
    return Json
        .parseToJsonElement(response.bodyAsText())
        .jsonObject
        .getValue("id")
        .jsonPrimitive.content
}

private data class SlotView(
    val start: Instant,
    val end: Instant,
    val rawStart: String,
    val rawEnd: String,
)

private suspend fun HttpClient.slots(id: String): List<SlotView> {
    val response = get("/api/meeting-types/$id/slots")
    assertEquals(HttpStatusCode.OK, response.status)
    return (Json.parseToJsonElement(response.bodyAsText()) as JsonArray).map {
        val o = it.jsonObject
        assertEquals(setOf("start", "end"), o.keys)
        val s = o.getValue("start").jsonPrimitive.content
        val e = o.getValue("end").jsonPrimitive.content
        SlotView(Instant.parse(s), Instant.parse(e), s, e)
    }
}

private fun List<SlotView>.localDays(): Map<LocalDate, List<SlotView>> =
    groupBy { it.start.atZone(almaty).toLocalDate() }

class SlotRoutesTest {
    // 2026-01-05 04:00Z = понедельник 09:00 в Asia/Almaty. Окно: 6..19 января.

    @Test
    fun `30 minute type has 18 starts on each weekday of the window starting tomorrow`() =
        testBooking {
            val slots = client.slots(client.createTypeId(30))

            val days = slots.localDays()
            val weekdays =
                (0L..13L).map { LocalDate.of(2026, 1, 6).plusDays(it) }.filter { it.dayOfWeek.value <= 5 }
            assertEquals(weekdays, days.keys.toList())
            days.values.forEach { assertEquals(18, it.size) }
            assertEquals(Instant.parse("2026-01-06T04:00:00Z"), slots.first().start)
            assertEquals(Instant.parse("2026-01-19T12:30:00Z"), slots.last().start)
            assertEquals(slots.sortedBy { it.start }, slots)
        }

    @Test
    fun `end is start plus duration and times are UTC with Z`() =
        testBooking {
            val slots = client.slots(client.createTypeId(45))

            slots.forEach {
                assertEquals(Duration.ofMinutes(45), Duration.between(it.start, it.end))
                assertTrue(it.rawStart.endsWith("Z") && it.rawEnd.endsWith("Z"))
            }
        }

    @Test
    fun `45 minute type last start is 17 00 and 540 minute type has only 09 00`() =
        testBooking {
            val long = client.slots(client.createTypeId(45)).localDays().getValue(LocalDate.of(2026, 1, 6))
            assertEquals(
                "17:00",
                long
                    .last()
                    .start
                    .atZone(almaty)
                    .toLocalTime()
                    .toString(),
            )

            val full = client.slots(client.createTypeId(540)).localDays().getValue(LocalDate.of(2026, 1, 6))
            assertEquals(1, full.size)
            assertEquals(
                "09:00",
                full
                    .single()
                    .start
                    .atZone(almaty)
                    .toLocalTime()
                    .toString(),
            )
        }

    @Test
    fun `window moves when the clock moves`() {
        val clock = TestClock()
        testBooking(clock) {
            val id = client.createTypeId(30)
            assertEquals(Instant.parse("2026-01-06T04:00:00Z"), client.slots(id).first().start)

            clock.advance(Duration.ofDays(4)) // пятница, завтра суббота: ближайший старт в понедельник
            val moved = client.slots(id)
            assertEquals(Instant.parse("2026-01-12T04:00:00Z"), moved.first().start)
            assertEquals(Instant.parse("2026-01-23T12:30:00Z"), moved.last().start)
        }
    }

    @Test
    fun `window is computed in the owner zone, not UTC`() {
        // 2026-01-05T20:00Z = вторник 01:00 в Almaty, завтра = среда 7 января.
        testBooking(TestClock(Instant.parse("2026-01-05T20:00:00Z"))) {
            val slots = client.slots(client.createTypeId(30))
            assertEquals(Instant.parse("2026-01-07T04:00:00Z"), slots.first().start)
        }
    }

    @Test
    fun `unknown and malformed ids give 404 MEETING_TYPE_NOT_FOUND`() =
        testBooking {
            listOf("00000000-0000-0000-0000-000000000000", "not-a-uuid").forEach { id ->
                val response = client.get("/api/meeting-types/$id/slots")
                assertEquals(HttpStatusCode.NotFound, response.status, id)
                val json = Json.parseToJsonElement(response.bodyAsText()).jsonObject
                assertEquals(setOf("code", "message"), json.keys)
                assertEquals("MEETING_TYPE_NOT_FOUND", json.getValue("code").jsonPrimitive.content)
            }
        }
}
