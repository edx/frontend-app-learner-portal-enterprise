/**
 * The learner's message while its turn is in flight, kept per session so a reload mid-turn doesn't lose it
 * (N-10). The server stores a session when its first turn starts but a turn only when it ends, so a session
 * reopened after a reload is missing the message that was being answered. Hook-free: the host passes the
 * storage (the browser tab's `sessionStorage` in the portal).
 */
import { beginTurn, endActiveTurn } from './stream/applyPart';
import type { ChatStreamState } from './stream/types';

export type PendingTurnStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface PendingTurn {
  message: string;
  /** The turn's sequence in its session, so a reopened session can tell whether the server stored it. */
  sequence: number;
}

/** Error code of a restored turn whose reply never finished. */
export const INTERRUPTED_TURN_ERROR = 'interrupted';

const keyOf = (sessionUuid: string) => `personalized-search:pending-turn:${sessionUuid}`;

// Storage can be missing, full or blocked (private windows, site data settings): every call fails quietly.

export const savePendingTurn = (storage: PendingTurnStorage | null, sessionUuid: string, turn: PendingTurn) => {
  try {
    storage?.setItem(keyOf(sessionUuid), JSON.stringify(turn));
  } catch {
    // Nothing to restore after a reload; the turn itself is unaffected.
  }
};

export const clearPendingTurn = (storage: PendingTurnStorage | null, sessionUuid: string) => {
  try {
    storage?.removeItem(keyOf(sessionUuid));
  } catch {
    // As above.
  }
};

export const loadPendingTurn = (storage: PendingTurnStorage | null, sessionUuid: string): PendingTurn | null => {
  try {
    const raw = storage?.getItem(keyOf(sessionUuid));
    const turn = raw ? JSON.parse(raw) : null;
    return turn && typeof turn.message === 'string' && turn.message && typeof turn.sequence === 'number'
      ? { message: turn.message, sequence: turn.sequence }
      : null;
  } catch {
    return null;
  }
};

/** Whether a reopened session's stored turns include the pending one (it finished after the reload). */
export const isPendingTurnStored = (stream: ChatStreamState, pending: PendingTurn) => (
  (stream.session.turnSequence ?? 0) >= pending.sequence
);

/**
 * A reopened session with its unfinished message added as the last turn, ended with `INTERRUPTED_TURN_ERROR`
 * so the chat shows it with a way to resend it. Unchanged when there is none or the server stored it.
 */
export const withInterruptedTurn = (stream: ChatStreamState, pending: PendingTurn | null): ChatStreamState => {
  const { sessionUuid } = stream.session;
  if (!pending || !sessionUuid || isPendingTurnStored(stream, pending)) { return stream; }
  const started = beginTurn(stream, { localId: `pending-${sessionUuid}-${pending.sequence}`, userMessage: pending.message });
  return endActiveTurn(started, { status: 'error', error: INTERRUPTED_TURN_ERROR });
};
