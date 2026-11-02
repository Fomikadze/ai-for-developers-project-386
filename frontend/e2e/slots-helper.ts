import { expect, type APIRequestContext } from '@playwright/test';

const ZONE = 'Asia/Almaty';

const dayKey = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date(iso));
const timeKey = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));

export interface PickedSlot {
  /** Начало слота, ISO UTC. */
  start: string;
  /** Номер дня среди дней со свободными слотами: так его находит календарь в интерфейсе. */
  dayIndex: number;
  /** Время `HH:mm` по Asia/Almaty. */
  time: string;
}

/**
 * Берёт случайный день, где слот на `time` (`HH:mm` по Asia/Almaty) ещё свободен.
 * Бэкенд живёт между прогонами, поэтому «первый слот» занят после первого же запуска.
 * Каждый тест использует своё время суток, так параллельные тесты не борются за один слот.
 */
export async function pickFreeSlot(
  request: APIRequestContext,
  typeId: string,
  time: string,
): Promise<PickedSlot> {
  const response = await request.get(`/api/meeting-types/${typeId}/slots`);
  expect(response.ok()).toBeTruthy();
  const free = ((await response.json()) as { start: string }[]).map((slot) => slot.start);
  const days = [...new Set(free.map(dayKey))];
  const candidates = free.filter((start) => timeKey(start) === time);
  expect(candidates, `нет свободных слотов на ${time}`).not.toHaveLength(0);
  const start = candidates[Math.floor(Math.random() * candidates.length)];
  return { start, dayIndex: days.indexOf(dayKey(start)), time };
}
