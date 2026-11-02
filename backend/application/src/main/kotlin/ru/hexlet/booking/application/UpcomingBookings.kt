package ru.hexlet.booking.application

import ru.hexlet.booking.domain.Booking

data object ListUpcomingBookings

interface ListUpcomingBookingsHandler : QueryHandler<ListUpcomingBookings, List<Booking>>

/** Брони всех типов с `end > now` по возрастанию `start`: идущая сейчас встреча тоже предстоящая. */
class ListUpcomingBookingsHandlerImpl(
    private val bookings: BookingRepository,
    private val clock: Clock,
) : ListUpcomingBookingsHandler {
    override suspend fun handle(query: ListUpcomingBookings): List<Booking> {
        val now = clock.now()
        return bookings.all().filter { it.end > now }.sortedBy { it.start }
    }
}
