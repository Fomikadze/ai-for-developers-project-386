package ru.hexlet.booking.application

import ru.hexlet.booking.domain.Booking
import ru.hexlet.booking.domain.BookingMeetingType
import ru.hexlet.booking.domain.GuestRules
import ru.hexlet.booking.domain.SlotGenerator
import java.time.Duration
import java.time.Instant
import java.util.UUID

/** Порт хранилища броней. */
interface BookingRepository {
    /**
     * Вставляет бронь, если её интервал `[start, end)` не пересекается ни с одной существующей.
     * Проверка и вставка атомарны. Возвращает `false`, если слот занят.
     */
    suspend fun addIfFree(booking: Booking): Boolean

    suspend fun all(): List<Booking>
}

/**
 * Сырое тело запроса брони. Поле — `String`, если пришла строка, `null`, если поля нет или оно `null`,
 * и любой другой объект, если тип неверный. Так порядок проверок из `docs/api.md` держится в одном месте.
 */
data class CreateBooking(
    val meetingTypeId: Any?,
    val start: Any?,
    val guestName: Any?,
    val guestEmail: Any?,
    val guestPhone: Any?,
    val notes: Any?,
)

interface CreateBookingHandler : CommandHandler<CreateBooking, Booking>

class CreateBookingHandlerImpl(
    private val meetingTypes: MeetingTypeRepository,
    private val bookings: BookingRepository,
    private val clock: Clock,
) : CreateBookingHandler {
    override suspend fun handle(command: CreateBooking): Booking {
        val name = command.guestName as? String
        if (name == null || !GuestRules.isValidName(name)) invalid(ErrorCode.INVALID_NAME, "guestName is invalid")
        val email = command.guestEmail as? String
        if (email == null || !GuestRules.isValidEmail(email)) invalid(ErrorCode.INVALID_EMAIL, "guestEmail is invalid")
        val phone = command.guestPhone as? String
        if (phone == null || !GuestRules.isValidPhone(phone)) invalid(ErrorCode.INVALID_PHONE, "guestPhone is invalid")
        val notes = notesOrNull(command.notes)
        val typeId =
            command.meetingTypeId as? String ?: invalid(ErrorCode.VALIDATION_ERROR, "meetingTypeId is required")
        val start =
            (command.start as? String)?.let { runCatching { Instant.parse(it) }.getOrNull() }
                ?: invalid(ErrorCode.VALIDATION_ERROR, "start is required and must be a date")

        val meetingType = meetingTypes.findOrThrow(typeId)
        val duration = Duration.ofMinutes(meetingType.durationMinutes.toLong())
        if (SlotGenerator.generate(duration, clock.now()).none { it.start == start }) {
            invalid(ErrorCode.SLOT_OUT_OF_RANGE, "start does not match a slot")
        }
        val booking =
            Booking(
                id = UUID.randomUUID(),
                meetingType = BookingMeetingType(meetingType.id, meetingType.title),
                start = start,
                end = start.plus(duration),
                guestName = name,
                guestEmail = email,
                guestPhone = phone,
                notes = notes,
            )
        if (!bookings.addIfFree(booking)) invalid(ErrorCode.SLOT_TAKEN, "Slot is already taken")
        return booking
    }

    private fun notesOrNull(raw: Any?): String? {
        if (raw == null) return null
        if (raw !is String || !GuestRules.isValidNotes(raw)) invalid(ErrorCode.VALIDATION_ERROR, "notes is invalid")
        return raw.ifEmpty { null }
    }

    private fun invalid(
        code: ErrorCode,
        message: String,
    ): Nothing = throw ApiException(code, message)
}
