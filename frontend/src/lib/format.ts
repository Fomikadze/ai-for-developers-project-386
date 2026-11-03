/** Дата и время слота в часовом поясе владельца в формате выбранного языка. */
export function formatSlot(start: string, tz: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(new Date(start));
}
