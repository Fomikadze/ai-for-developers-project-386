import en from './en.json';
import ru from './ru.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

it('наборы ключей ru и en совпадают', () => {
  expect(keys(en).sort()).toEqual(keys(ru).sort());
});
