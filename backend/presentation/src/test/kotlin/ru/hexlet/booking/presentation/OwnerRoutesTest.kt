package ru.hexlet.booking.presentation

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals

class OwnerRoutesTest {
    @Test
    fun `owner returns configured card with null avatar and Almaty timezone`() =
        testBooking {
            val response = client.get("/api/owner")

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals(
                """{"name":"Иван Иванов","title":"Владелец календаря","avatarUrl":null,"timezone":"Asia/Almaty"}""",
                response.bodyAsText(),
            )
        }
}
