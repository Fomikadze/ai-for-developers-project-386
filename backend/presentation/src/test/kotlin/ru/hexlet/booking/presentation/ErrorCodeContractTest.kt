package ru.hexlet.booking.presentation

import ru.hexlet.booking.application.ErrorCode
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class ErrorCodeContractTest {
    private fun contractErrorCodes(): List<String> {
        val lines = File("../../typespec/openapi.yaml").readLines()
        val start = lines.indexOfFirst { it.trim() == "ErrorCode:" }
        check(start >= 0) { "ErrorCode schema not found in openapi.yaml" }
        return lines
            .drop(start + 1)
            .dropWhile { it.trim() != "enum:" }
            .drop(1)
            .takeWhile { it.trim().startsWith("- ") }
            .map { it.trim().removePrefix("- ") }
    }

    @Test
    fun `kotlin error codes match ErrorCode enum in openapi`() {
        assertEquals(contractErrorCodes(), ErrorCode.entries.map { it.name })
    }
}
