import type { i18n as I18n } from 'i18next';

/** Текст ошибки API по `errors.<code>`; неизвестный код даёт `errors.UNKNOWN`. */
export function errorText(i18n: I18n, code: unknown): string {
  const key = typeof code === 'string' ? `errors.${code}` : '';
  return i18n.t(key && i18n.exists(key) ? key : 'errors.UNKNOWN');
}
