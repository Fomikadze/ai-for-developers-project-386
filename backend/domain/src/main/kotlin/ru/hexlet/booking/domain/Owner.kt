package ru.hexlet.booking.domain

import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/** Владелец календаря. [avatarUrl] равен `null`, если аватар не задан. */
data class Owner(
    val name: String,
    val title: String,
    val avatarUrl: String?,
)

/** Параметры расписания. Константы, через API не меняются. */
object Schedule {
    val ZONE: ZoneId = ZoneId.of("Asia/Almaty")
    val WORKING_DAYS: Set<DayOfWeek> =
        setOf(
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
        )
    val DAY_START: LocalTime = LocalTime.of(9, 0)
    val DAY_END: LocalTime = LocalTime.of(18, 0)
    val STEP: Duration = Duration.ofMinutes(30)
    const val WINDOW_DAYS = 14L
}

/** Интервал времени `[start, end)`, не привязанный к слоту или брони. */
data class TimeRange(
    val start: Instant,
    val end: Instant,
) {
    /** Единственное правило пересечения: интервалы, которые только соприкасаются концами, не пересекаются. */
    fun overlaps(other: TimeRange): Boolean = start < other.end && other.start < end
}

/** Свободное время, на которое гость может записаться. */
data class Slot(
    val range: TimeRange,
) {
    val start: Instant get() = range.start
    val end: Instant get() = range.end
}

object SlotGenerator {
    /** Все слоты окна записи (с завтра на [Schedule.WINDOW_DAYS] дней) по возрастанию `start`, без учёта занятости. */
    fun generate(
        duration: Duration,
        now: Instant,
    ): List<Slot> {
        val tomorrow = now.atZone(Schedule.ZONE).toLocalDate().plusDays(1)
        return (0 until Schedule.WINDOW_DAYS)
            .map { tomorrow.plusDays(it) }
            .filter { it.dayOfWeek in Schedule.WORKING_DAYS }
            .flatMap { daySlots(it, duration) }
    }

    private fun daySlots(
        day: LocalDate,
        duration: Duration,
    ): List<Slot> {
        val dayEnd = day.atTime(Schedule.DAY_END).atZone(Schedule.ZONE).toInstant()
        val slots = mutableListOf<Slot>()
        var start = day.atTime(Schedule.DAY_START).atZone(Schedule.ZONE).toInstant()
        while (!start.plus(duration).isAfter(dayEnd)) {
            slots.add(Slot(TimeRange(start, start.plus(duration))))
            start = start.plus(Schedule.STEP)
        }
        return slots
    }
}
