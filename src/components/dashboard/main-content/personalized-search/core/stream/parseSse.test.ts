import { parseSse, parseSseText } from './parseSse';
import {
  collect, installStreamGlobals, readGolden, readGoldenBytes, streamFromBytes,
} from './testUtils';

const encode = (text: string) => new TextEncoder().encode(text);

describe('parseSse', () => {
  beforeAll(() => {
    installStreamGlobals();
  });

  it('yields every part of normal_turn and stops at [DONE]', async () => {
    const parts = await collect(parseSse(streamFromBytes(readGoldenBytes('normal_turn.sse'))));
    expect(parts[0]).toEqual(expect.objectContaining({ type: 'start' }));
    expect(parts[parts.length - 1]).toEqual({ type: 'finish' });
    expect(parts).toEqual(parseSseText(readGolden('normal_turn.sse')));
  });

  it('yields the same parts when the stream is split at every byte offset', async () => {
    const bytes = readGoldenBytes('normal_turn.sse');
    const expected = await collect(parseSse(streamFromBytes(bytes)));
    for (let offset = 1; offset < bytes.length; offset += 1) {
      // eslint-disable-next-line no-await-in-loop
      const parts = await collect(parseSse(streamFromBytes(bytes, [offset])));
      expect(parts).toEqual(expected);
    }
  });

  it('keeps a CRLF split across two reads as one line break', async () => {
    // "data: a\r\ndata: b\r\n\r\n" is ONE event with two data lines; splitting between \r and \n must not end it early.
    const text = 'data: {"type":"text-delta","id":"r",\r\ndata: "delta":"x"}\r\n\r\ndata: [DONE]\r\n\r\n';
    const bytes = new TextEncoder().encode(text);
    const expected = await collect(parseSse(streamFromBytes(bytes)));
    for (let offset = 1; offset < bytes.length; offset += 1) {
      // eslint-disable-next-line no-await-in-loop
      expect(await collect(parseSse(streamFromBytes(bytes, [offset])))).toEqual(expected);
    }
    expect(expected).toEqual([{ type: 'text-delta', id: 'r', delta: 'x' }]);
  });

  it('decodes raw multi-byte characters split across reads', async () => {
    // enterprise-access escapes non-ASCII in JSON, but raw UTF-8 is valid on the wire too.
    const bytes = new TextEncoder().encode('data: {"type":"text-delta","id":"reply","delta":"Courses · 2 picks"}\n\ndata: [DONE]\n\n');
    const cut = bytes.indexOf(0xc2) + 1; // inside the two-byte "·"
    const parts = await collect(parseSse(streamFromBytes(bytes, [cut])));
    expect(parts).toEqual([{ type: 'text-delta', id: 'reply', delta: 'Courses · 2 picks' }]);
  });

  it('yields the same parts when every byte arrives separately', async () => {
    const bytes = readGoldenBytes('degraded_turn.sse');
    const everyByte = Array.from({ length: bytes.length }, (_, i) => i);
    const parts = await collect(parseSse(streamFromBytes(bytes, everyByte)));
    expect(parts).toEqual(parseSseText(readGolden('degraded_turn.sse')));
  });

  it('ignores anything after [DONE]', async () => {
    const body = 'data: {"type":"start","messageId":"m1"}\n\ndata: [DONE]\n\ndata: {"type":"finish"}\n\n';
    expect(await collect(parseSse(streamFromBytes(encode(body))))).toEqual([{ type: 'start', messageId: 'm1' }]);
  });

  it('handles CRLF line endings, comments and a final frame with no blank line', async () => {
    const body = ': comment\r\n\r\ndata: {"type":"start","messageId":"m1"}\r\n\r\ndata: {"type":"finish"}';
    expect(await collect(parseSse(streamFromBytes(encode(body))))).toEqual([
      { type: 'start', messageId: 'm1' },
      { type: 'finish' },
    ]);
  });

  it('drops a malformed frame and keeps going', async () => {
    const body = 'data: {not json\n\ndata: {"type":"finish"}\n\ndata: [DONE]\n\n';
    expect(await collect(parseSse(streamFromBytes(encode(body))))).toEqual([{ type: 'finish' }]);
  });

  it('drops a known part missing a field the reducer reads, and keeps unknown types for the reducer to ignore', () => {
    const frames = [
      { type: 'start' },
      { type: 'text-delta', id: 't', delta: 7 },
      { type: 'data-session', id: 's', data: { session_uuid: 's1' } },
      { type: 'data-status', data: null },
      { type: 'data-block', data: { v: 1, type: 'insight', props: {} } },
      { type: 'data-followups', id: 'f', data: { question: 'q' } },
      { type: 'data-analytics', id: 'a', data: { conversation_id: 'c', turn_id: 't' } },
      { type: 'error' },
      { type: 'toString' },
      { type: 'data-newer', id: 'n', data: {} },
      { type: 'text-delta', id: 't', delta: 'ok' },
      { type: 'finish' },
    ];
    expect(parseSseText(frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join(''))).toEqual([
      { type: 'toString' },
      { type: 'data-newer', id: 'n', data: {} },
      { type: 'text-delta', id: 't', delta: 'ok' },
      { type: 'finish' },
    ]);
  });

  it('cancels the reader when the caller stops early', async () => {
    // Callers stop a turn through the transport's AbortSignal. Note that in this repo's Babel
    // transform, `break` inside `for await` does not call the iterator's return(), so the
    // explicit return() below is what exercises the cleanup path.
    const cancel = jest.fn().mockResolvedValue(undefined);
    const reader = streamFromBytes(readGoldenBytes('normal_turn.sse')).getReader();
    const fakeBody = {
      getReader: () => ({ read: () => reader.read(), cancel }),
    } as unknown as ReadableStream<Uint8Array>;
    const parts = parseSse(fakeBody);
    expect((await parts.next()).value).toEqual(expect.objectContaining({ type: 'start' }));
    await parts.return(undefined);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
