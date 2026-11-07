package ru.hexlet.booking.domain

import java.time.Instant
import java.util.UUID

/** Тип встречи в составе брони. */
data class BookingMeetingType(
    val id: UUID,
    val title: String,
)

/** Бронь слота гостем. Интервал `[start, end)`. */
data class Booking(
    val id: UUID,
    val meetingType: BookingMeetingType,
    val start: Instant,
    val end: Instant,
    val guestName: String,
    val guestEmail: String,
    val guestPhone: String,
    val notes: String?,
) {
    /** Занятое время брони; считается один раз при создании. */
    val range: TimeRange = TimeRange(start, end)
}

/** Правила полей гостя. Паттерны и длины совпадают с `typespec/main.tsp`, значения проверяются как есть. */
object GuestRules {
    const val NAME_PATTERN = """^[\p{L}\p{M}]+(?:[ \-][\p{L}\p{M}]+)*$"""
    const val NAME_MAX = 100
    const val EMAIL_PATTERN =
        """^[A-Za-z0-9!#$%&'*+\/=?^_`\{\|\}~\-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`\{\|\}~\-]+)*@""" +
            """[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?""" +
            """(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$"""
    const val EMAIL_MAX = 254
    const val PHONE_PATTERN = """^\+[1-9]\d{6,14}$"""
    const val NOTES_MAX = 500

    private val name = Regex(NAME_PATTERN)
    private val email = Regex(EMAIL_PATTERN)
    private val phone = Regex(PHONE_PATTERN)

    fun isValidName(value: String) = value.codePointCount(0, value.length) in 1..NAME_MAX && name.matches(value)

    fun isValidEmail(value: String) = value.codePointCount(0, value.length) <= EMAIL_MAX && email.matches(value)

    fun isValidPhone(value: String) = phone.matches(value)

    fun isValidNotes(value: String) = value.codePointCount(0, value.length) <= NOTES_MAX
}
