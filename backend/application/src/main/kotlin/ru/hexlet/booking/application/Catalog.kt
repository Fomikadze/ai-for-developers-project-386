package ru.hexlet.booking.application

import ru.hexlet.booking.domain.MeetingType
import ru.hexlet.booking.domain.Owner
import ru.hexlet.booking.domain.Schedule
import ru.hexlet.booking.domain.Slot
import ru.hexlet.booking.domain.SlotGenerator
import java.time.Duration
import java.util.UUID

/** Порт хранилища типов встреч. */
interface MeetingTypeRepository {
    suspend fun add(meetingType: MeetingType)

    /** Типы в порядке создания. */
    suspend fun all(): List<MeetingType>

    suspend fun find(id: UUID): MeetingType?
}

/** Порт данных владельца (имя, подпись, аватар из конфигурации). */
interface OwnerProvider {
    fun owner(): Owner
}

/** Владелец вместе с часовым поясом расписания. */
data class OwnerView(
    val name: String,
    val title: String,
    val avatarUrl: String?,
    val timezone: String,
)

data object GetOwner

data object ListMeetingTypes

data class CreateMeetingType(
    val title: String,
    val description: String,
    val durationMinutes: Int,
)

/** [meetingTypeId] приходит строкой из пути: не-UUID трактуется как несуществующий тип. */
data class ListSlots(
    val meetingTypeId: String,
)

interface ListSlotsHandler : QueryHandler<ListSlots, List<Slot>>

class ListSlotsHandlerImpl(
    private val repository: MeetingTypeRepository,
    private val clock: Clock,
) : ListSlotsHandler {
    override suspend fun handle(query: ListSlots): List<Slot> {
        val meetingType =
            runCatching { UUID.fromString(query.meetingTypeId) }.getOrNull()?.let { repository.find(it) }
                ?: throw ApiException(ErrorCode.MEETING_TYPE_NOT_FOUND, "Meeting type not found")
        return SlotGenerator.generate(Duration.ofMinutes(meetingType.durationMinutes.toLong()), clock.now())
    }
}

interface GetOwnerHandler : QueryHandler<GetOwner, OwnerView>

interface ListMeetingTypesHandler : QueryHandler<ListMeetingTypes, List<MeetingType>>

interface CreateMeetingTypeHandler : CommandHandler<CreateMeetingType, MeetingType>

class GetOwnerHandlerImpl(
    private val owners: OwnerProvider,
) : GetOwnerHandler {
    override suspend fun handle(query: GetOwner): OwnerView {
        val owner = owners.owner()
        return OwnerView(owner.name, owner.title, owner.avatarUrl, Schedule.ZONE.id)
    }
}

class ListMeetingTypesHandlerImpl(
    private val repository: MeetingTypeRepository,
) : ListMeetingTypesHandler {
    override suspend fun handle(query: ListMeetingTypes): List<MeetingType> = repository.all()
}

class CreateMeetingTypeHandlerImpl(
    private val repository: MeetingTypeRepository,
) : CreateMeetingTypeHandler {
    override suspend fun handle(command: CreateMeetingType): MeetingType {
        val meetingType =
            try {
                MeetingType.create(UUID.randomUUID(), command.title, command.description, command.durationMinutes)
            } catch (e: IllegalArgumentException) {
                throw ApiException(ErrorCode.VALIDATION_ERROR, e.message.orEmpty(), e)
            }
        repository.add(meetingType)
        return meetingType
    }
}
