package ru.hexlet.booking.application

import ru.hexlet.booking.domain.Slot
import ru.hexlet.booking.domain.SlotGenerator
import java.time.Duration

/** [meetingTypeId] приходит строкой из пути: не-UUID трактуется как несуществующий тип. */
data class ListSlots(
    val meetingTypeId: String,
)

interface ListSlotsHandler : QueryHandler<ListSlots, List<Slot>>

class ListSlotsHandlerImpl(
    private val repository: MeetingTypeRepository,
    private val bookings: BookingRepository,
    private val clock: Clock,
) : ListSlotsHandler {
    override suspend fun handle(query: ListSlots): List<Slot> {
        val meetingType = repository.findOrThrow(query.meetingTypeId)
        val taken = bookings.all()
        return SlotGenerator
            .generate(Duration.ofMinutes(meetingType.durationMinutes.toLong()), clock.now())
            .filter { slot -> taken.none { it.range.overlaps(slot.range) } }
    }
}
