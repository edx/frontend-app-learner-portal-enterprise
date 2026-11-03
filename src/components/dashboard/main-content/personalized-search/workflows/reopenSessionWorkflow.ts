import { applyParts, beginTurn, getInitialChatStreamState } from '../stream/applyPart';
import type { ChatStreamState } from '../stream/types';
import type { SessionDetail } from '../services/sessionsRepository';

/**
 * Rebuilds chat state from a stored session by replaying each turn's parts through the same reducer
 * the live stream uses, so a reopened session renders exactly as it did live (REQ-010). Hook-free.
 *
 * Stored parts have no `finish` (it isn't kept), so each replayed turn is closed explicitly.
 */
export const reopenSessionWorkflow = (detail: SessionDetail): ChatStreamState => {
  let state = getInitialChatStreamState();
  [...detail.turns].sort((a, b) => a.sequence - b.sequence).forEach((turn) => {
    state = beginTurn(state, { localId: `past-${detail.uuid}-${turn.sequence}`, userMessage: turn.user_message });
    state = applyParts(state, turn.parts);
    if (state.activeTurnId) { state = applyParts(state, [{ type: 'finish' }]); }
  });
  return {
    ...state,
    session: {
      sessionUuid: detail.uuid,
      title: detail.title ?? state.session.title,
      turnSequence: detail.turns.length || state.session.turnSequence,
    },
  };
};
