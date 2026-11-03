import { client } from '../api/generated/client.gen';

export type MockResponse = { status?: number; body?: unknown };
export type ApiHandler = (request: {
  url: URL;
  body: unknown;
}) => MockResponse | Promise<MockResponse>;
/** Ключ — `МЕТОД /путь`, например `GET /api/owner`. */
export type ApiHandlers = Record<string, ApiHandler | MockResponse>;

/** Подменяет `fetch`, который вызывает SDK. Незаданный маршрут отвечает 500 и пишет в консоль. */
export function mockApi(handlers: ApiHandlers) {
  const fetchMock = vi.fn(async (input: Request) => {
    const url = new URL(input.url);
    const handler = handlers[`${input.method} ${url.pathname}`];
    if (!handler) {
      console.error(`mockApi: нет обработчика для ${input.method} ${url.pathname}`);
      return Response.json({ code: 'UNHANDLED', message: 'no handler' }, { status: 500 });
    }
    const text = await input.text();
    const result =
      typeof handler === 'function'
        ? await handler({ url, body: text ? JSON.parse(text) : undefined })
        : handler;
    return Response.json(result.body ?? null, { status: result.status ?? 200 });
  });
  client.setConfig({ baseUrl: 'http://localhost', fetch: fetchMock as typeof fetch });
  return fetchMock;
}
