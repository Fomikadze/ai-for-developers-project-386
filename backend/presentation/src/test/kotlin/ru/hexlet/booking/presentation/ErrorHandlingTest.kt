package ru.hexlet.booking.presentation

import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import kotlinx.serialization.Serializable
import org.koin.ktor.ext.inject
import ru.hexlet.booking.application.ApiException
import ru.hexlet.booking.application.Clock
import ru.hexlet.booking.application.ErrorCode
import java.time.Duration
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals

@Serializable
private data class Payload(
    val name: String,
)

private fun Application.probeRoutes() =
    routing {
        get("/probe/{code}") {
            val code = ErrorCode.valueOf(call.parameters["code"]!!)
            throw ApiException(code, "Probe failure")
        }
        post("/probe-body") {
            call.respond(call.receive<Payload>())
        }
    }

class ErrorHandlingTest {
    @Test
    fun `api exception becomes status and exact code-message body`() =
        testApplication {
            application {
                testModule()
                probeRoutes()
            }

            val response = client.get("/probe/SLOT_TAKEN")

            assertEquals(HttpStatusCode.Conflict, response.status)
            assertEquals("""{"code":"SLOT_TAKEN","message":"Probe failure"}""", response.bodyAsText())
        }

    @Test
    fun `every error code maps to its documented status`() =
        testApplication {
            application {
                testModule()
                probeRoutes()
            }
            val expected =
                mapOf(
                    ErrorCode.VALIDATION_ERROR to 400,
                    ErrorCode.INVALID_NAME to 400,
                    ErrorCode.INVALID_EMAIL to 400,
                    ErrorCode.INVALID_PHONE to 400,
                    ErrorCode.SLOT_OUT_OF_RANGE to 400,
                    ErrorCode.MEETING_TYPE_NOT_FOUND to 404,
                    ErrorCode.SLOT_TAKEN to 409,
                )

            assertEquals(ErrorCode.entries.toSet(), expected.keys)
            expected.forEach { (code, status) ->
                assertEquals(status, client.get("/probe/$code").status.value, code.name)
            }
        }

    @Test
    fun `malformed json body becomes VALIDATION_ERROR`() =
        testApplication {
            application {
                testModule()
                probeRoutes()
            }

            val response =
                client.post("/probe-body") {
                    contentType(ContentType.Application.Json)
                    setBody("{not json")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
            assertEquals(
                """{"code":"VALIDATION_ERROR","message":"Request body is invalid"}""",
                response.bodyAsText(),
            )
        }

    @Test
    fun `test harness injects a clock the test can advance`() {
        val clock = TestClock(Instant.parse("2026-01-05T04:00:00Z"))
        testApplication {
            application {
                testModule(clock)
                val injected by inject<Clock>()
                routing { get("/now") { call.respondText(injected.now().toString()) } }
            }
            clock.advance(Duration.ofDays(1))

            assertEquals("2026-01-06T04:00:00Z", client.get("/now").bodyAsText())
        }
    }
}
