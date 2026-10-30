import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('приводит номер к E.164', () => {
    expect(normalizePhone('+7 701 234 56 78')).toBe('+77012345678');
  });

  it('возвращает null для некорректного номера', () => {
    expect(normalizePhone('123')).toBeNull();
  });
});
