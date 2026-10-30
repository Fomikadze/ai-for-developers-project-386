package ru.hexlet.booking.application

import java.time.Instant

/** Порт времени: тесты подменяют его, чтобы окно записи не зависело от текущей даты. */
interface Clock {
    fun now(): Instant
}
