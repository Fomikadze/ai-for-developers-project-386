package ru.hexlet.booking.infrastructure

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import ru.hexlet.booking.application.BookingRepository
import ru.hexlet.booking.application.MeetingTypeRepository
import ru.hexlet.booking.application.OwnerProvider
import ru.hexlet.booking.domain.Booking
import ru.hexlet.booking.domain.MeetingType
import ru.hexlet.booking.domain.Owner
import java.util.UUID

class InMemoryMeetingTypeRepository : MeetingTypeRepository {
    private val mutex = Mutex()
    private val items = mutableListOf<MeetingType>()

    override suspend fun add(meetingType: MeetingType) {
        mutex.withLock { items.add(meetingType) }
    }

    override suspend fun all(): List<MeetingType> = mutex.withLock { items.toList() }

    override suspend fun find(id: UUID): MeetingType? = mutex.withLock { items.firstOrNull { it.id == id } }
}

class InMemoryBookingRepository : BookingRepository {
    private val mutex = Mutex()
    private val items = mutableListOf<Booking>()

    override suspend fun add(booking: Booking) {
        mutex.withLock { items.add(booking) }
    }

    override suspend fun all(): List<Booking> = mutex.withLock { items.toList() }
}

/** Владелец, заданный при старте (из конфигурации приложения). */
class ConfiguredOwnerProvider(
    private val owner: Owner,
) : OwnerProvider {
    override fun owner(): Owner = owner
}
