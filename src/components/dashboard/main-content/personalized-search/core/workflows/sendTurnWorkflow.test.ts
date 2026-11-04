import { getInitialChatStreamState } from '../stream/applyPart';
import type { ChatStreamState, Part } from '../stream/types';
import type { ChatTransport } from '../transports/ChatTransport';
import { FixtureChatTransport } from '../transports/FixtureChatTransport';
import { sendTurnWorkflow } from './sendTurnWorkflow';

const request = { enterpriseCustomerUuid: 'ent-uuid', sessionUuid: null, message: 'Leading teams' };

const runWith = async (transport: ChatTransport, signal = new AbortController().signal) => {
  let state: ChatStreamState = getInitialChatStreamState();
  const result = await sendTurnWorkflow({
    transport,
    request,
    localId: 'local-1',
    signal,
    dispatch: (update) => { state = update(state); },
  });
  return { result, state };
};

const partsTransport = (parts: Part[]): ChatTransport => ({
  // eslint-disable-next-line object-shorthand, func-names
  send: async function* () { yield* parts; },
});

describe('sendTurnWorkflow', () => {
  it('folds a normal turn into state and reports the pick count', async () => {
    const { result, state } = await runWith(new FixtureChatTransport({ partDelayMs: 0, pickFixture: () => 'normal_turn.sse' }));
    expect(result).toEqual({ outcome: 'done', itemCount: 4 });
    expect(state.turns[0]).toEqual(expect.objectContaining({
      localId: 'local-1', userMessage: 'Leading teams', status: 'done',
    }));
    expect(state.activeTurnId).toBeNull();
  });

  it('reports an in-stream error with its code', async () => {
    const { result, state } = await runWith(new FixtureChatTransport({ partDelayMs: 0, pickFixture: () => 'error_turn.sse' }));
    expect(result).toEqual({ outcome: 'error', status: null, code: 'model_failed' });
    expect(state.turns[0].blocks).toEqual([]);
  });

  it('treats a stream that ends without finish or error as an internal error', async () => {
    const { result, state } = await runWith(partsTransport([
      { type: 'start', messageId: 'turn_1' },
      { type: 'text-delta', id: 'reply', delta: 'Partial' },
    ]));
    expect(result).toEqual({ outcome: 'error', status: null, code: 'internal' });
    expect(state.turns[0].status).toBe('error');
    expect(state.activeTurnId).toBeNull();
  });
});
