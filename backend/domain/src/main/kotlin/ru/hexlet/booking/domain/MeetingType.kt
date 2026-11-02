package ru.hexlet.booking.domain

import java.util.UUID

/** Тип встречи владельца. Создаётся только через [create], который проверяет границы полей. */
class MeetingType private constructor(
    val id: UUID,
    val title: String,
    val description: String,
    val durationMinutes: Int,
) {
    companion object {
        const val TITLE_MAX = 100
        const val DESCRIPTION_MAX = 1000
        const val DURATION_MIN = 15
        const val DURATION_MAX = 540

        /** @throws IllegalArgumentException если поле выходит за границы контракта. */
        fun create(
            id: UUID,
            title: String,
            description: String,
            durationMinutes: Int,
        ): MeetingType {
            require(title.codePointCount(0, title.length) in 1..TITLE_MAX) { "title must be 1..$TITLE_MAX characters" }
            require(description.codePointCount(0, description.length) <= DESCRIPTION_MAX) {
                "description must be at most $DESCRIPTION_MAX characters"
            }
            require(durationMinutes in DURATION_MIN..DURATION_MAX) {
                "durationMinutes must be $DURATION_MIN..$DURATION_MAX"
            }
            return MeetingType(id, title, description, durationMinutes)
        }
    }
}
