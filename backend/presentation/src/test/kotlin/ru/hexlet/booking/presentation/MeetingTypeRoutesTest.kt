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
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals

private suspend fun HttpClient.createType(body: String): HttpResponse =
    post("/api/meeting-types") {
        contentType(ContentType.Application.Json)
        setBody(body)
    }

private fun typeJson(
    title: String = "\"Знакомство\"",
    description: String = "\"Короткий звонок\"",
    duration: String = "30",
) = """{"title":$title,"description":$description,"durationMinutes":$duration}"""

private suspend fun HttpClient.listTypes(): JsonArray =
    Json.parseToJsonElement(get("/api/meeting-types").bodyAsText()) as JsonArray

private suspend fun assertValidationError(
    client: HttpClient,
    body: String,
) {
    val response = client.createType(body)
    assertEquals(HttpStatusCode.BadRequest, response.status, body)
    val json = Json.parseToJsonElement(response.bodyAsText()).jsonObject
    assertEquals(setOf("code", "message"), json.keys, body)
    assertEquals("VALIDATION_ERROR", json.getValue("code").jsonPrimitive.content, body)
    assertEquals(0, client.listTypes().size, "type must not be created: $body")
}

class MeetingTypeRoutesTest {
    @Test
    fun `list is empty after start`() =
        testBooking {
            val response = client.get("/api/meeting-types")

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals("[]", response.bodyAsText())
        }

    @Test
    fun `create returns 201 with server uuid and the type appears in the list`() =
        testBooking {
            val response = client.createType(typeJson())

            assertEquals(HttpStatusCode.Created, response.status)
            val created = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            assertEquals(setOf("id", "title", "description", "durationMinutes"), created.keys)
            UUID.fromString(created.getValue("id").jsonPrimitive.content)
            assertEquals("Знакомство", created.getValue("title").jsonPrimitive.content)
            assertEquals("Короткий звонок", created.getValue("description").jsonPrimitive.content)
            assertEquals(30, created.getValue("durationMinutes").jsonPrimitive.int)
            assertEquals(listOf(created), client.listTypes().map { it.jsonObject })
        }

    @Test
    fun `list keeps creation order`() =
        testBooking {
            client.createType(typeJson(title = "\"Первый\""))
            client.createType(typeJson(title = "\"Второй\""))
            client.createType(typeJson(title = "\"Третий\""))

            val titles =
                client.listTypes().map {
                    it.jsonObject
                        .getValue("title")
                        .jsonPrimitive.content
                }

            assertEquals(listOf("Первый", "Второй", "Третий"), titles)
        }

    @Test
    fun `each created type gets its own id`() =
        testBooking {
            client.createType(typeJson())
            client.createType(typeJson())

            val ids =
                client.listTypes().map {
                    it.jsonObject
                        .getValue("id")
                        .jsonPrimitive.content
                }

            assertEquals(2, ids.toSet().size)
        }

    @Test
    fun `boundary values are accepted`() =
        testBooking {
            val cases =
                listOf(
                    typeJson(title = "\"a\"", description = "\"\"", duration = "15"),
                    typeJson(
                        title = "\"" + "a".repeat(100) + "\"",
                        description = "\"" + "b".repeat(1000) + "\"",
                        duration = "540",
                    ),
                )
            cases.forEach { assertEquals(HttpStatusCode.Created, client.createType(it).status, it) }
            assertEquals(2, client.listTypes().size)
        }

    @Test
    fun `out of bounds values give VALIDATION_ERROR and create nothing`() =
        testBooking {
            listOf(
                typeJson(title = "\"\""),
                typeJson(title = "\"" + "a".repeat(101) + "\""),
                typeJson(description = "\"" + "b".repeat(1001) + "\""),
                typeJson(duration = "14"),
                typeJson(duration = "541"),
                typeJson(duration = "0"),
                typeJson(duration = "-30"),
            ).forEach { assertValidationError(client, it) }
        }

    @Test
    fun `missing fields give VALIDATION_ERROR and create nothing`() =
        testBooking {
            listOf(
                """{"description":"d","durationMinutes":30}""",
                """{"title":"t","durationMinutes":30}""",
                """{"title":"t","description":"d"}""",
                "{}",
            ).forEach { assertValidationError(client, it) }
        }

    @Test
    fun `wrong types give VALIDATION_ERROR and create nothing`() =
        testBooking {
            listOf(
                typeJson(duration = "\"30\""),
                typeJson(duration = "30.5"),
                typeJson(duration = "30.0"),
                typeJson(duration = "null"),
                typeJson(duration = "true"),
                typeJson(title = "123"),
                typeJson(title = "null"),
                typeJson(description = "null"),
                typeJson(description = "5"),
                "[]",
                "\"text\"",
            ).forEach { assertValidationError(client, it) }
        }

    @Test
    fun `unparsable and empty body give VALIDATION_ERROR and create nothing`() =
        testBooking {
            listOf("{not json", "", "{\"title\":").forEach { assertValidationError(client, it) }
        }
}
