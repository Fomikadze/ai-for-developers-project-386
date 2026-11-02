import i18n from '../app/i18n';
import { errorText } from './errors';

const codes = [
  'VALIDATION_ERROR',
  'INVALID_NAME',
  'INVALID_EMAIL',
  'INVALID_PHONE',
  'SLOT_OUT_OF_RANGE',
  'MEETING_TYPE_NOT_FOUND',
  'SLOT_TAKEN',
];

it.each(['ru', 'en'])('переводит каждый код из docs/api.md (%s)', async (lng) => {
  await i18n.changeLanguage(lng);
  const unknown = errorText(i18n, 'NOPE');
  for (const code of codes) {
    expect(errorText(i18n, code)).not.toBe(unknown);
    expect(errorText(i18n, code)).not.toContain('errors.');
  }
});

it('неизвестный код и не-строка показывают errors.UNKNOWN', async () => {
  await i18n.changeLanguage('ru');
  const unknown = i18n.t('errors.UNKNOWN');
  expect(unknown).not.toBe('errors.UNKNOWN');
  expect(errorText(i18n, 'SOMETHING_NEW')).toBe(unknown);
  expect(errorText(i18n, undefined)).toBe(unknown);
});

it('язык меняет текст', async () => {
  await i18n.changeLanguage('ru');
  const ru = errorText(i18n, 'SLOT_TAKEN');
  await i18n.changeLanguage('en');
  expect(errorText(i18n, 'SLOT_TAKEN')).not.toBe(ru);
});
