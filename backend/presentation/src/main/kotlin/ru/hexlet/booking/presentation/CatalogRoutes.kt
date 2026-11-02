package ru.hexlet.booking.presentation

import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import ru.hexlet.booking.application.CreateMeetingType
import ru.hexlet.booking.application.CreateMeetingTypeHandler
import ru.hexlet.booking.application.GetOwner
import ru.hexlet.booking.application.GetOwnerHandler
import ru.hexlet.booking.application.ListMeetingTypes
import ru.hexlet.booking.application.ListMeetingTypesHandler
import ru.hexlet.booking.application.OwnerView
import ru.hexlet.booking.domain.MeetingType

@Serializable
data class OwnerResponse(
    val name: String,
    val title: String,
    val avatarUrl: String?,
    val timezone: String,
)

@Serializable
data class MeetingTypeResponse(
    val id: String,
    val title: String,
    val description: String,
    val durationMinutes: Int,
)

/** Целое число строго из JSON-числа: `"30"`, `30.5` и `30.0` отклоняются (kotlinx по умолчанию принимает `"30"`). */
object StrictIntSerializer : KSerializer<Int> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("StrictInt", PrimitiveKind.INT)

    override fun deserialize(decoder: Decoder): Int {
        val primitive =
            (decoder as JsonDecoder).decodeJsonElement() as? JsonPrimitive
                ?: throw SerializationException("Expected an integer")
        val value = primitive.intOrNull
        if (primitive.isString || value == null || primitive.content != value.toString()) {
            throw SerializationException("Expected an integer")
        }
        return value
    }

    override fun serialize(
        encoder: Encoder,
        value: Int,
    ) = encoder.encodeInt(value)
}

@Serializable
data class CreateMeetingTypeRequest(
    val title: String,
    val description: String,
    @Serializable(with = StrictIntSerializer::class) val durationMinutes: Int,
)

private fun OwnerView.toResponse() = OwnerResponse(name, title, avatarUrl, timezone)

private fun MeetingType.toResponse() = MeetingTypeResponse(id.toString(), title, description, durationMinutes)

fun Route.catalogRoutes(
    getOwner: GetOwnerHandler,
    listMeetingTypes: ListMeetingTypesHandler,
    createMeetingType: CreateMeetingTypeHandler,
) {
    get("/api/owner") {
        call.respond(getOwner.handle(GetOwner).toResponse())
    }
    get("/api/meeting-types") {
        call.respond(listMeetingTypes.handle(ListMeetingTypes).map { it.toResponse() })
    }
    post("/api/meeting-types") {
        val request = call.receive<CreateMeetingTypeRequest>()
        val command = CreateMeetingType(request.title, request.description, request.durationMinutes)
        val created = createMeetingType.handle(command)
        call.respond(HttpStatusCode.Created, created.toResponse())
    }
}
