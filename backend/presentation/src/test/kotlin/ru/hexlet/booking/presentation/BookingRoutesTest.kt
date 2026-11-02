package ru.hexlet.booking.presentation

import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

// Часы теста: понедельник 2026-01-05 09:00 Asia/Almaty. Вторник 09:00 = 04:00Z.
private const val VALID_START = "2026-01-06T04:00:00Z"

private val badRequest = HttpStatusCode.BadRequest

private suspend fun HttpClient.createTypeId(duration: Int = 30): String =
    Json
        .parseToJsonElement(
            post("/api/meeting-types") {
                contentType(ContentType.Application.Json)
                setBody("""{"title":"T$duration","description":"","durationMinutes":$duration}""")
            }.bodyAsText(),
        ).jsonObject
        .getValue("id")
        .jsonPrimitive.content

/** Тело брони. В [overrides] значение — готовый JSON-литерал, `null` убирает поле. */
private fun bodyJson(
    typeId: String?,
    start: String? = VALID_START,
    overrides: Map<String, String?> = emptyMap(),
): String {
    val fields =
        linkedMapOf<String, String?>(
            "meetingTypeId" to typeId?.let { "\"$it\"" },
            "start" to start?.let { "\"$it\"" },
            "guestName" to "\"Анна Смирнова\"",
            "guestEmail" to "\"anna@example.com\"",
            "guestPhone" to "\"+77011234567\"",
            "notes" to "\"Привет\"",
        )
    fields.putAll(overrides)
    return fields.entries.filter { it.value != null }.joinToString(",", "{", "}") { "\"${it.key}\":${it.value}" }
}

private suspend fun HttpClient.book(body: String): HttpResponse =
    post("/api/bookings") {
        contentType(ContentType.Application.Json)
        setBody(body)
    }

private suspend fun HttpClient.slotStarts(typeId: String): List<String> =
    (Json.parseToJsonElement(get("/api/meeting-types/$typeId/slots").bodyAsText()) as JsonArray)
        .map {
            it.jsonObject
                .getValue("start")
                .jsonPrimitive.content
        }

private suspend fun HttpResponse.error(): Pair<HttpStatusCode, String> {
    val o = Json.parseToJsonElement(bodyAsText()).jsonObject
    assertEquals(setOf("code", "message"), o.keys)
    return status to o.getValue("code").jsonPrimitive.content
}

class BookingRoutesTest {
    @Test
    fun `creates booking and returns full booking with computed end`() =
        testBooking {
            val id = client.createTypeId(45)
            val response = client.book(bodyJson(id))

            assertEquals(HttpStatusCode.Created, response.status)
            val o = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            assertEquals(
                setOf("id", "meetingType", "start", "end", "guestName", "guestEmail", "guestPhone", "notes"),
                o.keys,
            )
            assertEquals(
                36,
                o
                    .getValue("id")
                    .jsonPrimitive.content.length,
            )
            val type = o.getValue("meetingType").jsonObject
            assertEquals(setOf("id", "title"), type.keys)
            assertEquals(id, type.getValue("id").jsonPrimitive.content)
            assertEquals("T45", type.getValue("title").jsonPrimitive.content)
            assertEquals(VALID_START, o.getValue("start").jsonPrimitive.content)
            assertEquals("2026-01-06T04:45:00Z", o.getValue("end").jsonPrimitive.content)
            assertEquals("Анна Смирнова", o.getValue("guestName").jsonPrimitive.content)
            assertEquals("anna@example.com", o.getValue("guestEmail").jsonPrimitive.content)
            assertEquals("+77011234567", o.getValue("guestPhone").jsonPrimitive.content)
            assertEquals("Привет", o.getValue("notes").jsonPrimitive.content)
        }

    @Test
    fun `missing or empty notes become null`() =
        testBooking {
            val id = client.createTypeId()
            val first = client.book(bodyJson(id, overrides = mapOf("notes" to null)))
            assertEquals(JsonNull, Json.parseToJsonElement(first.bodyAsText()).jsonObject.getValue("notes"))
            val second = client.book(bodyJson(id, "2026-01-06T05:00:00Z", mapOf("notes" to "\"\"")))
            assertEquals(JsonNull, Json.parseToJsonElement(second.bodyAsText()).jsonObject.getValue("notes"))
        }

    @Test
    fun `notes of 500 characters and name of 100 characters are accepted`() =
        testBooking {
            val id = client.createTypeId()
            val notes = "\"${"я".repeat(500)}\""
            val name = "\"${"а".repeat(100)}\""
            val r = client.book(bodyJson(id, overrides = mapOf("notes" to notes, "guestName" to name)))
            assertEquals(HttpStatusCode.Created, r.status)
        }

    @Test
    fun `booked interval disappears from slots of every type and adjacent slots stay`() =
        testBooking {
            val t30 = client.createTypeId(30)
            val t60 = client.createTypeId(60)
            // занимаем 09:00-09:30
            assertEquals(HttpStatusCode.Created, client.book(bodyJson(t30)).status)

            val s30 = client.slotStarts(t30)
            assertTrue("2026-01-06T04:00:00Z" !in s30)
            assertTrue("2026-01-06T04:30:00Z" in s30)
            val s60 = client.slotStarts(t60)
            assertTrue("2026-01-06T04:00:00Z" !in s60)
            assertTrue("2026-01-06T04:30:00Z" in s60)
        }

    @Test
    fun `longer booking removes overlapping starts of other types and keeps adjacent`() =
        testBooking {
            val t30 = client.createTypeId(30)
            val t60 = client.createTypeId(60)
            // занимаем 10:00-11:00 (05:00Z-06:00Z)
            assertEquals(HttpStatusCode.Created, client.book(bodyJson(t60, "2026-01-06T05:00:00Z")).status)

            val s30 = client.slotStarts(t30)
            listOf("05:00", "05:30").forEach { assertTrue("2026-01-06T$it:00Z" !in s30, it) }
            listOf("04:30", "06:00").forEach { assertTrue("2026-01-06T$it:00Z" in s30, it) }
            val s60 = client.slotStarts(t60)
            listOf("04:30", "05:00", "05:30").forEach { assertTrue("2026-01-06T$it:00Z" !in s60, it) }
            listOf("04:00", "06:00").forEach { assertTrue("2026-01-06T$it:00Z" in s60, it) }
        }

    @Test
    fun `invalid name`() =
        testBooking {
            val id = client.createTypeId()
            val expected = badRequest to "INVALID_NAME"
            listOf("\"Иван1\"", "\" Иван\"", "\"\"", "12", "null", "\"${"а".repeat(101)}\"", null).forEach {
                assertEquals(expected, client.book(bodyJson(id, overrides = mapOf("guestName" to it))).error(), it)
            }
        }

    @Test
    fun `invalid email`() =
        testBooking {
            val id = client.createTypeId()
            val expected = badRequest to "INVALID_EMAIL"
            listOf("\"x\"", "\"\"", "5", "\"${"a".repeat(250)}@b.co\"", null).forEach {
                assertEquals(expected, client.book(bodyJson(id, overrides = mapOf("guestEmail" to it))).error(), it)
            }
        }

    @Test
    fun `invalid phone`() =
        testBooking {
            val id = client.createTypeId()
            val expected = badRequest to "INVALID_PHONE"
            listOf("\"8 701\"", "\"77011234567\"", "\"\"", "77011234567", null).forEach {
                assertEquals(expected, client.book(bodyJson(id, overrides = mapOf("guestPhone" to it))).error(), it)
            }
        }

    @Test
    fun `invalid notes`() =
        testBooking {
            val id = client.createTypeId()
            val expected = badRequest to "VALIDATION_ERROR"
            listOf("\"${"я".repeat(501)}\"", "5", "true").forEach {
                assertEquals(expected, client.book(bodyJson(id, overrides = mapOf("notes" to it))).error(), it)
            }
        }

    @Test
    fun `several invalid fields return the first in form order`() =
        testBooking {
            val id = client.createTypeId()
            val all = mapOf("guestName" to "\"1\"", "guestEmail" to "\"x\"", "guestPhone" to "\"1\"", "notes" to "5")
            assertEquals(badRequest to "INVALID_NAME", client.book(bodyJson(id, overrides = all)).error())
            val noName = all - "guestName"
            assertEquals(badRequest to "INVALID_EMAIL", client.book(bodyJson(id, overrides = noName)).error())
            val noEmail = noName - "guestEmail"
            assertEquals(badRequest to "INVALID_PHONE", client.book(bodyJson(id, overrides = noEmail)).error())
        }

    @Test
    fun `malformed body is validation error`() =
        testBooking {
            assertEquals(badRequest to "VALIDATION_ERROR", client.book("{").error())
            assertEquals(badRequest to "VALIDATION_ERROR", client.book("[]").error())
        }

    @Test
    fun `missing or malformed meetingTypeId and start are validation errors after form fields`() =
        testBooking {
            val id = client.createTypeId()
            val expected = badRequest to "VALIDATION_ERROR"
            assertEquals(expected, client.book(bodyJson(null)).error())
            assertEquals(expected, client.book(bodyJson(id, null)).error())
            assertEquals(expected, client.book(bodyJson(id, overrides = mapOf("meetingTypeId" to "5"))).error())
            assertEquals(expected, client.book(bodyJson(id, overrides = mapOf("start" to "5"))).error())
            assertEquals(expected, client.book(bodyJson(id, "not a date")).error())
            val formFirst = client.book(bodyJson(null, null, mapOf("guestPhone" to "\"1\"")))
            assertEquals(badRequest to "INVALID_PHONE", formFirst.error())
        }

    @Test
    fun `unknown or non uuid type is 404 and comes before slot check`() =
        testBooking {
            val notFound = HttpStatusCode.NotFound to "MEETING_TYPE_NOT_FOUND"
            assertEquals(notFound, client.book(bodyJson("3f1c2a9e-5b7d-4c8e-9a01-2b3c4d5e6f70")).error())
            assertEquals(notFound, client.book(bodyJson("not-a-uuid")).error())
            assertEquals(notFound, client.book(bodyJson("not-a-uuid", "2026-01-05T04:00:00Z")).error())
            val formFirst = client.book(bodyJson("not-a-uuid", overrides = mapOf("guestName" to "\"1\"")))
            assertEquals(badRequest to "INVALID_NAME", formFirst.error())
        }

    @Test
    fun `start must match a slot`() =
        testBooking {
            val id = client.createTypeId(30)
            val out = badRequest to "SLOT_OUT_OF_RANGE"
            listOf(
                "2026-01-05T05:00:00Z", // сегодня
                "2026-01-20T04:00:00Z", // после окна
                "2026-01-10T04:00:00Z", // суббота
                "2026-01-06T03:30:00Z", // 08:30, до начала дня
                "2026-01-06T04:15:00Z", // не на шаге
                "2026-01-06T13:00:00Z", // 18:00, после конца дня
            ).forEach { assertEquals(out, client.book(bodyJson(id, it)).error(), it) }
            // последний слот дня 17:30-18:00 допустим
            assertEquals(HttpStatusCode.Created, client.book(bodyJson(id, "2026-01-06T12:30:00Z")).status)

            val long = client.createTypeId(60)
            assertEquals(out, client.book(bodyJson(long, "2026-01-06T12:30:00Z")).error())
            assertEquals(HttpStatusCode.Created, client.book(bodyJson(long, "2026-01-07T12:00:00Z")).status)
        }
}
