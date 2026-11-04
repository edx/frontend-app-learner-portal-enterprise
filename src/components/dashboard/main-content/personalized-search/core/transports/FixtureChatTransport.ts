import { goldenFixtures } from '../stream/__fixtures__';
import { parseSseText } from '../stream/parseSse';
import type { Part } from '../stream/types';
import type { ChatTransport, SendTurnOptions } from './ChatTransport';

export type FixtureName = keyof typeof goldenFixtures;

export interface FixtureChatTransportOptions {
  /**
   * Which golden to replay for a message. Defaults to `normal_turn.sse`, except for messages
   * that look like the adversarial examples, so the off-topic path can be demoed too.
   */
  pickFixture?: (message: string) => FixtureName;
  /** Delay before each part, in ms. Text deltas use the same delay. */
  partDelayMs?: number;
}

const OFF_TOPIC_HINTS = /\b(weather|poem|world series|ignore all previous)\b/i;

export const defaultPickFixture = (message: string): FixtureName => (
  OFF_TOPIC_HINTS.test(message) ? 'off_topic_turn.sse' : 'normal_turn.sse'
);

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve) => {
  if (ms <= 0 || signal?.aborted) {
    resolve();
    return;
  }
  let timer: ReturnType<typeof setTimeout>;
  const onAbort = () => {
    clearTimeout(timer);
    resolve();
  };
  timer = setTimeout(() => {
    signal?.removeEventListener('abort', onAbort);
    resolve();
  }, ms);
  signal?.addEventListener('abort', onAbort, { once: true });
});

/**
 * Replays a golden `.sse` file part by part with a delay, so the UI can be built and demoed
 * with no backend (`PERSONALIZED_SEARCH_TRANSPORT=fixture`).
 */
export class FixtureChatTransport implements ChatTransport {
  private readonly pickFixture: (message: string) => FixtureName;

  private readonly partDelayMs: number;

  constructor({ pickFixture = defaultPickFixture, partDelayMs = 120 }: FixtureChatTransportOptions = {}) {
    this.pickFixture = pickFixture;
    this.partDelayMs = partDelayMs;
  }

  async* send({ request, signal }: SendTurnOptions): AsyncGenerator<Part, void, undefined> {
    const parts = parseSseText(goldenFixtures[this.pickFixture(request.message)]);
    // eslint-disable-next-line no-restricted-syntax
    for (const part of parts) {
      // eslint-disable-next-line no-await-in-loop
      await wait(this.partDelayMs, signal);
      if (signal?.aborted) { return; }
      yield part;
    }
  }
}
