package ru.hexlet.booking.domain

import java.time.ZoneId

/** Владелец календаря. [avatarUrl] равен `null`, если аватар не задан. */
data class Owner(
    val name: String,
    val title: String,
    val avatarUrl: String?,
)

/** Параметры расписания. Часовой пояс владельца — константа, через API не меняется. */
object Schedule {
    val ZONE: ZoneId = ZoneId.of("Asia/Almaty")
}
