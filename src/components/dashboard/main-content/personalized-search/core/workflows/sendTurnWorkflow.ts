import { applyPart, beginTurn, endActiveTurn } from '../stream/applyPart';
import type { AssistantTurn, ChatStreamState } from '../stream/types';
import type { SendTurnWorkflowInput, SendTurnWorkflowResult } from './types';

export const countPicks = (turn: AssistantTurn | undefined): number => (turn?.blocks ?? []).reduce(
  (count, { block }) => (block.type === 'item_section' ? count + block.props.items.length : count),
  0,
);

const findTurn = (stream: ChatStreamState, localId: string) => stream.turns.find((t) => t.localId === localId);

/**
 * Sends one learner message and folds the transport's parts into the store (KD-6). Hook-free:
 * the controller supplies the transport, the abort signal and the store dispatch.
 */
export const sendTurnWorkflow = async ({
  transport, request, localId, signal, dispatch, isRenderableBlock,
}: SendTurnWorkflowInput): Promise<SendTurnWorkflowResult> => {
  dispatch((stream) => beginTurn(stream, { localId, userMessage: request.message }));
  let latest: ChatStreamState | null = null;
  const track = (update: (stream: ChatStreamState) => ChatStreamState) => dispatch((stream) => {
    latest = update(stream);
    return latest;
  });

  try {
    // eslint-disable-next-line no-restricted-syntax
    for await (const part of transport.send({ request, signal })) {
      if (signal.aborted) { break; }
      track((stream) => applyPart(stream, part, isRenderableBlock));
    }
  } catch (e) {
    if (!signal.aborted) {
      track((stream) => endActiveTurn(stream, { status: 'error', error: 'internal' }));
      return { outcome: 'error', status: null, code: 'internal' };
    }
  }

  if (signal.aborted) {
    track((stream) => endActiveTurn(stream, { status: 'stopped' }));
    return { outcome: 'stopped' };
  }

  const turn = latest ? findTurn(latest, localId) : undefined;
  if (turn?.status === 'done') {
    return { outcome: 'done', itemCount: countPicks(turn) };
  }
  if (turn?.status === 'error') {
    return { outcome: 'error', status: null, code: turn.error };
  }
  // The stream ended without finish or error (e.g. the connection dropped).
  track((stream) => endActiveTurn(stream, { status: 'error', error: 'internal' }));
  return { outcome: 'error', status: null, code: 'internal' };
};
