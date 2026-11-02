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
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.Duration
import kotlin.test.Test
import kotlin.test.assertEquals

// Часы теста: 2026-01-05T04:00:00Z. Вторник 09:00 Almaty = 2026-01-06T04:00:00Z.
private const val TUE_09 = "2026-01-06T04:00:00Z"
private const val TUE_10 = "2026-01-06T05:00:00Z"
private const val TUE_11 = "2026-01-06T06:00:00Z"

private suspend fun HttpClient.createTypeId(duration: Int): String =
    Json
        .parseToJsonElement(
            post("/api/meeting-types") {
                contentType(ContentType.Application.Json)
                setBody("""{"title":"T$duration","description":"","durationMinutes":$duration}""")
            }.bodyAsText(),
        ).jsonObject
        .getValue("id")
        .jsonPrimitive.content

private suspend fun HttpClient.book(
    typeId: String,
    start: String,
) {
    val response =
        post("/api/bookings") {
            contentType(ContentType.Application.Json)
            setBody(
                """{"meetingTypeId":"$typeId","start":"$start","guestName":"Анна",""" +
                    """"guestEmail":"anna@example.com","guestPhone":"+77011234567","notes":"Привет"}""",
            )
        }
    assertEquals(HttpStatusCode.Created, response.status)
}

private suspend fun HttpClient.upcomingStarts(): List<String> {
    val response = get("/api/bookings/upcoming")
    assertEquals(HttpStatusCode.OK, response.status)
    return (Json.parseToJsonElement(response.bodyAsText()) as JsonArray).map {
        it.jsonObject
            .getValue("start")
            .jsonPrimitive.content
    }
}

private fun JsonObject.text(key: String): String = getValue(key).jsonPrimitive.content

class UpcomingBookingsRoutesTest {
    @Test
    fun `returns empty list without bookings`() =
        testBooking {
            val response = client.get("/api/bookings/upcoming")
            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals("[]", response.bodyAsText())
        }

    @Test
    fun `sorts by start regardless of creation order`() =
        testBooking {
            val id = client.createTypeId(30)
            client.book(id, TUE_11)
            client.book(id, TUE_09)
            client.book(id, TUE_10)
            assertEquals(listOf(TUE_09, TUE_10, TUE_11), client.upcomingStarts())
        }

    @Test
    fun `returns bookings of all types in booking format`() =
        testBooking {
            val short = client.createTypeId(30)
            val long = client.createTypeId(60)
            client.book(long, TUE_10)
            client.book(short, TUE_09)
            val body = Json.parseToJsonElement(client.get("/api/bookings/upcoming").bodyAsText()) as JsonArray
            val first = body[0].jsonObject
            assertEquals(
                setOf("id", "meetingType", "start", "end", "guestName", "guestEmail", "guestPhone", "notes"),
                first.keys,
            )
            assertEquals("2026-01-06T04:30:00Z", first.text("end"))
            assertEquals(short, first.getValue("meetingType").jsonObject.text("id"))
            assertEquals("2026-01-06T06:00:00Z", body[1].jsonObject.text("end"))
        }

    @Test
    fun `ongoing meeting is listed until end and finished one is not`() {
        val clock = TestClock()
        testBooking(clock) {
            val id = client.createTypeId(30)
            client.book(id, TUE_09)
            clock.advance(Duration.ofHours(24).plusMinutes(29)) // 04:29Z вторника, встреча идёт
            assertEquals(listOf(TUE_09), client.upcomingStarts())
            clock.advance(Duration.ofMinutes(1)) // ровно end
            assertEquals(emptyList(), client.upcomingStarts())
        }
    }
}
