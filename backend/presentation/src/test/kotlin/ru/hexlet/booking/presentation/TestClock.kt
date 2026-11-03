package ru.hexlet.booking.presentation

import ru.hexlet.booking.application.Clock
import java.time.Duration
import java.time.Instant

/** Часы для тестов: фиксированный момент, который можно сдвигать. */
class TestClock(
    private var current: Instant = Instant.parse("2026-01-05T04:00:00Z"),
) : Clock {
    override fun now(): Instant = current

    fun advance(duration: Duration) {
        current = current.plus(duration)
    }
}
