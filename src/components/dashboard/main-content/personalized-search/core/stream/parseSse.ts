import type { Part } from './types';

const DONE_SENTINEL = '[DONE]';

/**
 * Extracts the `data:` payload of one SSE event. Comment lines (`:`) and other fields are
 * ignored; multiple `data:` lines are joined with a newline, per the SSE spec.
 */
const eventData = (rawEvent: string): string | null => {
  const dataLines = rawEvent
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => {
      const value = line.slice('data:'.length);
      return value.startsWith(' ') ? value.slice(1) : value;
    });
  return dataLines.length ? dataLines.join('\n') : null;
};

const toPart = (data: string): Part | null => {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      return parsed as Part;
    }
  } catch (e) {
    // A malformed frame is dropped rather than ending the turn; the reducer ignores what it
    // doesn't know, so one bad frame can't take the rest of the stream down with it.
  }
  return null;
};

/**
 * Parses an AI SDK UI Message Stream v1 body into parts (tech spec KD-4).
 *
 * Handles frames split at any byte offset, including mid-UTF-8 character, and stops at
 * `data: [DONE]`. Breaking out of the iteration cancels the underlying reader.
 */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<Part, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finished = false;

  function* drain(flush: boolean): Generator<Part | typeof DONE_SENTINEL> {
    // A chunk can end between the \r and \n of one line break; hold a trailing \r back until the next chunk, or it
    // would be normalized to \n and the \n that follows would read as a second line break (a false event boundary).
    const heldCr = !flush && buffer.endsWith('\r') ? '\r' : '';
    buffer = buffer.slice(0, buffer.length - heldCr.length).replace(/\r\n?/g, '\n');
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = eventData(rawEvent);
      if (data === DONE_SENTINEL) {
        yield DONE_SENTINEL;
        return;
      }
      if (data !== null) {
        const part = toPart(data);
        if (part) { yield part; }
      }
      boundary = buffer.indexOf('\n\n');
    }
    buffer += heldCr;
    if (flush && buffer.trim()) {
      const data = eventData(buffer);
      buffer = '';
      if (data === DONE_SENTINEL) {
        yield DONE_SENTINEL;
        return;
      }
      if (data !== null) {
        const part = toPart(data);
        if (part) { yield part; }
      }
    }
  }

  try {
    while (!finished) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      // eslint-disable-next-line no-restricted-syntax
      for (const item of drain(done)) {
        if (item === DONE_SENTINEL) {
          finished = true;
          break;
        }
        yield item;
      }
      if (done) { finished = true; }
    }
  } finally {
    // Release the connection whether we hit [DONE], the body ended, or the caller stopped early.
    reader.cancel().catch(() => {});
  }
}

/** Convenience for fixtures and tests: parses a whole SSE body held in memory. */
export const parseSseText = (text: string): Part[] => {
  const parts: Part[] = [];
  const events = text.replace(/\r\n?/g, '\n').split('\n\n');
  // eslint-disable-next-line no-restricted-syntax
  for (const rawEvent of events) {
    const data = eventData(rawEvent);
    if (data === DONE_SENTINEL) { break; }
    if (data !== null) {
      const part = toPart(data);
      if (part) { parts.push(part); }
    }
  }
  return parts;
};
