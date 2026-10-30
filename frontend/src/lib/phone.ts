import { parsePhoneNumberFromString } from 'libphonenumber-js';

/** Приводит ввод к E.164; возвращает null, если номер некорректен (см. docs/api.md). */
export function normalizePhone(input: string, defaultCountry: 'KZ' = 'KZ'): string | null {
  const phone = parsePhoneNumberFromString(input, defaultCountry);
  return phone?.isValid() ? phone.number : null;
}
