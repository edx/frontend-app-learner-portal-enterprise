import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import {
  installStreamGlobals, readGoldenBytes, streamFromBytes,
} from '../stream/testUtils';
import type { Part } from '../stream/types';
import { TransportError } from './ChatTransport';
import { SseChatTransport } from './SseChatTransport';

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedHttpClient: jest.fn(),
}));

const REQUEST = { enterpriseCustomerUuid: 'ent-1', sessionUuid: null, message: 'Lead a team' };

const collect = async (iterable: AsyncIterable<Part>) => {
  const parts: Part[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const part of iterable) { parts.push(part); }
  return parts;
};

describe('SseChatTransport', () => {
  const httpGet = jest.fn();
  let fetchMock: jest.Mock;

  beforeAll(installStreamGlobals);

  beforeEach(() => {
    jest.clearAllMocks();
    httpGet.mockResolvedValue({ data: { csrfToken: 'csrf-123' } });
    (getAuthenticatedHttpClient as jest.Mock).mockReturnValue({ get: httpGet });
    fetchMock = jest.fn();
    (globalThis as { fetch?: unknown }).fetch = fetchMock;
  });

  it('POSTs with the JWT cookie header and enterprise-access CSRF token, then yields the streamed parts', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, body: streamFromBytes(readGoldenBytes('normal_turn.sse'), [7, 200]) });
    const transport = new SseChatTransport({
      getBaseUrl: () => 'http://ea.test',
      getDebugOverrides: () => ({ compose_model: 'gpt-4.1', compose_effort: null }),
    });
    const parts = await collect(transport.send({ request: REQUEST }));

    expect(httpGet).toHaveBeenCalledWith('http://ea.test/csrf/api/v1/token', expect.anything());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ea.test/api/v1/personalized-search/turns/');
    expect(init).toEqual(expect.objectContaining({ method: 'POST', credentials: 'include' }));
    expect(init.headers).toEqual(expect.objectContaining({ 'USE-JWT-COOKIE': 'true', 'X-CSRFToken': 'csrf-123' }));
    expect(JSON.parse(init.body)).toEqual({
      enterprise_customer_uuid: 'ent-1',
      session_uuid: null,
      message: 'Lead a team',
      debug: { compose_model: 'gpt-4.1', compose_effort: null },
    });
    expect(parts[0].type).toBe('start');
    expect(parts[parts.length - 1].type).toBe('finish');
  });

  it('sends no debug key without overrides', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, body: streamFromBytes(readGoldenBytes('off_topic_turn.sse')) });
    await collect(new SseChatTransport({ getBaseUrl: () => 'http://ea.test' }).send({ request: REQUEST }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('debug');
  });

  it.each([
    [409, { code: 'turn_in_progress' }, 'turn_in_progress'],
    [503, { code: 'backend_unsupported' }, 'backend_unsupported'],
    [403, null, null],
  ])('throws TransportError(%p) with the body code before streaming', async (status, body, code) => {
    fetchMock.mockResolvedValue({
      ok: false, status, body: null, json: body ? async () => body : async () => { throw new Error('no json'); },
    });
    const iterator = new SseChatTransport({ getBaseUrl: () => 'http://ea.test' }).send({ request: REQUEST })[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toEqual(new TransportError(status, code));
  });

  it('ends quietly when aborted before the response', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    const parts = await collect(new SseChatTransport({ getBaseUrl: () => 'http://ea.test' }).send({
      request: REQUEST, signal: controller.signal,
    }));
    expect(parts).toEqual([]);
  });

  it('rethrows network failures when not aborted', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const iterator = new SseChatTransport({ getBaseUrl: () => 'http://ea.test' }).send({ request: REQUEST })[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow('Failed to fetch');
  });
});
