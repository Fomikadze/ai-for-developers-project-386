package ru.hexlet.booking.infrastructure

import ru.hexlet.booking.application.Clock
import java.time.Instant

class SystemClock : Clock {
    override fun now(): Instant = Instant.now()
}
