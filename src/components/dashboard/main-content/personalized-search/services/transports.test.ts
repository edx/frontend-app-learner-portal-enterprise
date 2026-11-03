import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { parseSseText } from '../stream/parseSse';
import type { Part } from '../stream/types';
import { collect, readGolden } from '../stream/testUtils';
import { BufferedChatTransport } from './BufferedChatTransport';
import { TransportError } from './ChatTransport';
import { defaultPickFixture, FixtureChatTransport } from './FixtureChatTransport';

jest.mock('@edx/frontend-platform/config', () => ({
  ...jest.requireActual('@edx/frontend-platform/config'),
  getConfig: jest.fn(() => ({ ENTERPRISE_ACCESS_BASE_URL: 'http://localhost:18270' })),
}));
jest.mock('@edx/frontend-platform/auth', () => ({
  ...jest.requireActual('@edx/frontend-platform/auth'),
  getAuthenticatedHttpClient: jest.fn(),
}));

const TURNS_URL = 'http://localhost:18270/api/v1/personalized-search/turns/?mode=buffered';
const request = { enterpriseCustomerUuid: 'ent-uuid', sessionUuid: null, message: 'Leading teams' };

describe('FixtureChatTransport', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('replays the chosen golden in order with a delay before each part', async () => {
    jest.useFakeTimers();
    const transport = new FixtureChatTransport({ partDelayMs: 50, pickFixture: () => 'normal_turn.sse' });
    const expected = parseSseText(readGolden('normal_turn.sse'));
    const iterator = transport.send({ request })[Symbol.asyncIterator]();

    const firstPart = iterator.next();
    let settled = false;
    firstPart.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(50);
    expect((await firstPart).value).toEqual(expected[0]);

    const rest: Array<Part | void> = [];
    for (let i = 1; i < expected.length; i += 1) {
      const next = iterator.next();
      // eslint-disable-next-line no-await-in-loop
      await jest.advanceTimersByTimeAsync(50);
      // eslint-disable-next-line no-await-in-loop
      rest.push((await next).value);
    }
    expect([expected[0], ...rest]).toEqual(expected);
    const end = iterator.next();
    await jest.advanceTimersByTimeAsync(50);
    expect((await end).done).toBe(true);
  });

  it('stops without yielding further parts or throwing when aborted', async () => {
    const controller = new AbortController();
    const transport = new FixtureChatTransport({ partDelayMs: 0 });
    const received: Part[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const part of transport.send({ request, signal: controller.signal })) {
      received.push(part);
      if (received.length === 3) { controller.abort(); }
    }
    expect(received).toHaveLength(3);
  });

  it('picks the off-topic golden for adversarial-looking messages', () => {
    expect(defaultPickFixture("What's the weather in Boston tomorrow?")).toBe('off_topic_turn.sse');
    expect(defaultPickFixture('I want to lead a team')).toBe('normal_turn.sse');
  });
});

describe('BufferedChatTransport', () => {
  let axiosMock: MockAdapter;

  beforeEach(() => {
    axiosMock = new MockAdapter(axios);
    (getAuthenticatedHttpClient as jest.Mock).mockReturnValue(axios);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  it('POSTs the snake_case body and yields the returned parts in order', async () => {
    const parts = parseSseText(readGolden('normal_turn.sse'));
    axiosMock.onPost(TURNS_URL).reply(200, { parts });
    expect(await collect(new BufferedChatTransport().send({ request }))).toEqual(parts);
    expect(JSON.parse(axiosMock.history.post[0].data)).toEqual({
      enterprise_customer_uuid: 'ent-uuid', session_uuid: null, message: 'Leading teams',
    });
  });

  it('yields an in-body error part rather than throwing', async () => {
    const parts = parseSseText(readGolden('error_turn.sse'));
    axiosMock.onPost(TURNS_URL).reply(200, { parts });
    const received = await collect(new BufferedChatTransport().send({ request }));
    expect(received[received.length - 1]).toEqual({ type: 'error', errorText: 'model_failed' });
  });

  it.each([
    [400, { message: ['too long'] }, null],
    [403, {}, null],
    [404, { detail: 'Not found.' }, null],
    [409, { code: 'turn_in_progress' }, 'turn_in_progress'],
    [429, {}, null],
    [503, { code: 'backend_unsupported' }, 'backend_unsupported'],
  ])('throws TransportError for HTTP %s', async (status, body, code) => {
    axiosMock.onPost(TURNS_URL).reply(status, body);
    const error = await collect(new BufferedChatTransport().send({ request })).catch((e) => e);
    expect(error).toBeInstanceOf(TransportError);
    expect(error).toEqual(expect.objectContaining({ status, code }));
  });
});
