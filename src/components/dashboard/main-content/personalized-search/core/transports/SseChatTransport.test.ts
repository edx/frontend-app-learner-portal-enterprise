import { ReadableStream as NodeReadableStream } from 'stream/web';

import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import {
  installStreamGlobals, readGoldenBytes, streamFromBytes,
} from '../stream/testUtils';
import type { Part } from '../stream/types';
import { TransportError } from './ChatTransport';
import { SseChatTransport } from './SseChatTransport';
import type { HttpClient } from '../http';

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

const options = {
  getHttpClient: () => getAuthenticatedHttpClient() as unknown as HttpClient,
  getBaseUrl: () => 'http://ea.test',
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
      ...options,
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
    });
    expect(parts[0].type).toBe('start');
    expect(parts[parts.length - 1].type).toBe('finish');
  });

  it.each([
    [409, { code: 'turn_in_progress' }, 'turn_in_progress'],
    [503, { code: 'backend_unsupported' }, 'backend_unsupported'],
    [403, null, null],
  ])('throws TransportError(%p) with the body code before streaming', async (status, body, code) => {
    fetchMock.mockResolvedValue({
      ok: false, status, body: null, json: body ? async () => body : async () => { throw new Error('no json'); },
    });
    const iterator = new SseChatTransport(options).send({ request: REQUEST })[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toEqual(new TransportError(status, code));
  });

  it('ends quietly when aborted before the response', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    const parts = await collect(new SseChatTransport(options).send({
      request: REQUEST, signal: controller.signal,
    }));
    expect(parts).toEqual([]);
  });

  it('rethrows network failures when not aborted', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const iterator = new SseChatTransport(options).send({ request: REQUEST })[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow('Failed to fetch');
  });

  it.each([
    [409, { code: 'turn_in_progress' }, 'turn_in_progress'],
    [503, { code: 42 }, null],
    [500, null, null],
  ])('throws a TransportError for HTTP %s with the code when the body has one', async (status, body, code) => {
    fetchMock.mockResolvedValue({
      ok: false, status, json: body === null ? () => Promise.reject(new SyntaxError('not json')) : async () => body,
    });
    const iterator = new SseChatTransport(options).send({ request: REQUEST })[Symbol.asyncIterator]();
    const error = await iterator.next().catch((e) => e);
    expect(error).toBeInstanceOf(TransportError);
    expect(error).toEqual(expect.objectContaining({ status, code }));
  });

  it('sends an empty CSRF header when the token response has none', async () => {
    httpGet.mockResolvedValue({ data: undefined });
    fetchMock.mockResolvedValue({ ok: true, status: 200, body: streamFromBytes(readGoldenBytes('normal_turn.sse')) });
    await collect(new SseChatTransport(options).send({ request: REQUEST }));
    expect(fetchMock.mock.calls[0][1].headers['X-CSRFToken']).toBe('');
  });

  it('fails when the response has no body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, body: null });
    const iterator = new SseChatTransport(options).send({ request: REQUEST })[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toThrow('has no body');
  });

  describe('when the stream fails after it starts', () => {
    const failingBody = () => new NodeReadableStream<Uint8Array>({
      start(controller) { controller.error(new Error('connection reset')); },
    }) as unknown as ReadableStream<Uint8Array>;

    it('rethrows the error', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200, body: failingBody() });
      const iterator = new SseChatTransport(options).send({ request: REQUEST })[Symbol.asyncIterator]();
      await expect(iterator.next()).rejects.toThrow('connection reset');
    });

    it('ends quietly when the turn was stopped', async () => {
      const controller = new AbortController();
      controller.abort();
      fetchMock.mockResolvedValue({ ok: true, status: 200, body: failingBody() });
      const parts = await collect(new SseChatTransport(options).send({ request: REQUEST, signal: controller.signal }));
      expect(parts).toEqual([]);
    });
  });
});
