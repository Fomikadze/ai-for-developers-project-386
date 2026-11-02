package ru.hexlet.booking.presentation

import ru.hexlet.booking.domain.GuestRules
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class GuestRulesContractTest {
    private val lines = File("../../typespec/openapi.yaml").readLines()

    /** Строки схемы `name:` из `components.schemas` до следующей схемы. */
    private fun schema(name: String): List<String> {
        val start = lines.indexOfFirst { it == "    $name:" }
        check(start >= 0) { "Schema $name not found in openapi.yaml" }
        return lines.drop(start + 1).takeWhile { it.startsWith("      ") }
    }

    private fun value(
        schema: String,
        key: String,
    ): String? =
        schema(schema)
            .firstOrNull { it.trim().startsWith("$key: ") }
            ?.trim()
            ?.removePrefix("$key: ")

    @Test
    fun `guest name rules match openapi`() {
        assertEquals(GuestRules.NAME_PATTERN, value("GuestName", "pattern"))
        assertEquals(GuestRules.NAME_MAX.toString(), value("GuestName", "maxLength"))
        assertEquals("1", value("GuestName", "minLength"))
    }

    @Test
    fun `guest email rules match openapi`() {
        assertEquals(GuestRules.EMAIL_PATTERN, value("GuestEmail", "pattern"))
        assertEquals(GuestRules.EMAIL_MAX.toString(), value("GuestEmail", "maxLength"))
    }

    @Test
    fun `guest phone pattern matches openapi`() {
        assertEquals(GuestRules.PHONE_PATTERN, value("E164Phone", "pattern"))
    }

    @Test
    fun `notes length matches openapi`() {
        assertEquals(GuestRules.NOTES_MAX.toString(), value("CreateBookingRequest", "maxLength"))
    }
}
