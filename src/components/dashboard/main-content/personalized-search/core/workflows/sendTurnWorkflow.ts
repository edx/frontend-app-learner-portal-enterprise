import { TransportError } from '../transports/ChatTransport';
import { applyPart, beginTurn, endActiveTurn } from '../stream/applyPart';
import type { AssistantTurn, ChatStreamState } from '../stream/types';
import { countShownItems } from '../selectors';
import type { SendTurnWorkflowInput, SendTurnWorkflowResult } from './types';

/** Wait before the single resend after `409 turn_in_progress` (spec API Error Codes). */
export const TURN_IN_PROGRESS_RETRY_MS = 2000;

/** Turn error code for an HTTP failure before the stream started, e.g. `http_503`. */
export const httpErrorCode = (status: number) => `http_${status}`;

/** The distinct items a turn's results show (before any are removed); see `countShownItems`. */
export const countPicks = (turn: AssistantTurn | undefined): number => countShownItems(turn);

const findTurn = (stream: ChatStreamState, localId: string) => stream.turns.find((t) => t.localId === localId);

const abortableWait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) {
    resolve();
    return;
  }
  let timer: ReturnType<typeof setTimeout>;
  const onAbort = () => {
    clearTimeout(timer);
    resolve();
  };
  timer = setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve();
  }, ms);
  signal.addEventListener('abort', onAbort, { once: true });
});

/**
 * Sends one learner message and folds the transport's parts into the store (KD-6). Hook-free:
 * the controller supplies the transport, the abort signal and the store dispatch.
 *
 * Outcomes: `done`; `stopped` (the signal fired; partial blocks discarded); or `error` with the
 * HTTP status for failures before the stream (`409` is resent once after 2 s) or `null` for
 * in-stream and network failures.
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

  const fail = (status: number | null, code: string | null, turnError: string): SendTurnWorkflowResult => {
    track((stream) => endActiveTurn(stream, { status: 'error', error: turnError }));
    return { outcome: 'error', status, code };
  };

  for (let attempt = 0; ; attempt += 1) {
    try {
      // eslint-disable-next-line no-restricted-syntax, no-await-in-loop
      for await (const part of transport.send({ request, signal })) {
        if (signal.aborted) { break; }
        track((stream) => applyPart(stream, part, isRenderableBlock));
      }
      break;
    } catch (e) {
      if (signal.aborted) { break; }
      if (e instanceof TransportError) {
        if (e.status === 409 && attempt === 0) {
          // eslint-disable-next-line no-await-in-loop
          await abortableWait(TURN_IN_PROGRESS_RETRY_MS, signal);
          if (signal.aborted) { break; }
          // eslint-disable-next-line no-continue
          continue;
        }
        return fail(e.status, e.code, httpErrorCode(e.status));
      }
      return fail(null, 'internal', 'internal');
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
  return fail(null, 'internal', 'internal');
};
