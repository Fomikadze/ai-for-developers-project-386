import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export type SlotTime = { start: string; label: string };

/** Слоты по дням (`YYYY-MM-DD`) с временем `HH:mm` в часовом поясе владельца. */
export function groupSlotsByDay(
  slots: readonly { start: string }[],
  tz: string,
): Record<string, SlotTime[]> {
  const days: Record<string, SlotTime[]> = {};
  for (const { start } of slots) {
    const local = dayjs(start).tz(tz);
    (days[local.format('YYYY-MM-DD')] ??= []).push({ start, label: local.format('HH:mm') });
  }
  return days;
}

/** Окно записи: с завтра по завтра + 13 по часовому поясу владельца (`docs/schedule.md`). */
export function bookingWindow(tz: string, now: Date = new Date()) {
  const today = dayjs(now).tz(tz).startOf('day');
  return {
    min: today.add(1, 'day').format('YYYY-MM-DD'),
    max: today.add(14, 'day').format('YYYY-MM-DD'),
  };
}
