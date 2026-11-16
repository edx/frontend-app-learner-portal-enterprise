/* eslint-disable import/no-extraneous-dependencies */
/**
 * Test-only helpers for the stream layer. jsdom doesn't expose `TextDecoder` or
 * `ReadableStream`, so tests install Node's implementations locally instead of changing the
 * global Jest setup for every portal test.
 */
import fs from 'fs';
import path from 'path';
import { ReadableStream as NodeReadableStream } from 'stream/web';
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util';

export const GOLDEN_FILES = [
  'normal_turn.sse',
  'off_topic_turn.sse',
  'no_match_turn.sse',
  'degraded_turn.sse',
  'error_turn.sse',
] as const;

export type GoldenFile = typeof GOLDEN_FILES[number];

export const installStreamGlobals = () => {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.TextDecoder === 'undefined') { g.TextDecoder = NodeTextDecoder; }
  if (typeof g.TextEncoder === 'undefined') { g.TextEncoder = NodeTextEncoder; }
  if (typeof g.ReadableStream === 'undefined') { g.ReadableStream = NodeReadableStream; }
};

export const fixturesDir = path.join(__dirname, '__fixtures__');

export const readGolden = (file: GoldenFile): string => fs.readFileSync(path.join(fixturesDir, file), 'utf8');

export const readGoldenBytes = (file: GoldenFile): Uint8Array => new Uint8Array(
  fs.readFileSync(path.join(fixturesDir, file)),
);

/** A ReadableStream that delivers `bytes` in the given chunks (split offsets are byte offsets). */
export const streamFromBytes = (bytes: Uint8Array, splitAt: number[] = []): ReadableStream<Uint8Array> => {
  const offsets = [0, ...splitAt.filter((o) => o > 0 && o < bytes.length), bytes.length];
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < offsets.length - 1; i += 1) {
    chunks.push(bytes.slice(offsets[i], offsets[i + 1]));
  }
  return new NodeReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  }) as unknown as ReadableStream<Uint8Array>;
};

export const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const items: T[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
};

export const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};
