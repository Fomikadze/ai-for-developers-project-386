import * as z from 'zod';
import { zCreateBookingRequest } from '../api/generated/zod.gen';
import { normalizePhone } from './phone';

const shape = zCreateBookingRequest.shape;

/**
 * Схема формы гостя из полей сгенерированной схемы контракта. Ввод нормализуется так же,
 * как перед отправкой: имя без пробелов по краям, телефон в E.164.
 */
export const bookingFormSchema = z.object({
  guestName: z
    .string()
    .transform((value) => value.trim())
    .pipe(shape.guestName),
  guestEmail: shape.guestEmail,
  guestPhone: z
    .string()
    .transform((value) => normalizePhone(value) ?? value)
    .pipe(shape.guestPhone),
  notes: shape.notes,
});

/** Код ошибки API (`errors.<code>`), который соответствует полю формы. */
export const fieldErrorCode = {
  guestName: 'INVALID_NAME',
  guestEmail: 'INVALID_EMAIL',
  guestPhone: 'INVALID_PHONE',
  notes: 'VALIDATION_ERROR',
} as const;
