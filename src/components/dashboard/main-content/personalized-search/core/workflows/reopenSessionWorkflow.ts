import { applyParts, beginTurn, getInitialChatStreamState } from '../stream/applyPart';
import type { BlockValidator } from '../stream/applyPart';
import type { ChatStreamState } from '../stream/types';
import type { SessionDetail, SessionsApi, SessionSummary } from '../api/sessions';

/**
 * Rebuilds chat state from a stored session by replaying each turn's parts through the same reducer
 * the live stream uses, so a reopened session renders exactly as it did live (REQ-010). Hook-free.
 *
 * Stored parts have no `finish` (it isn't kept), so each replayed turn is closed explicitly.
 */
export const reopenSessionWorkflow = (
  detail: SessionDetail,
  isRenderableBlock?: BlockValidator,
): ChatStreamState => {
  let state = getInitialChatStreamState();
  [...detail.turns].sort((a, b) => a.sequence - b.sequence).forEach((turn) => {
    state = beginTurn(state, { localId: `past-${detail.uuid}-${turn.sequence}`, userMessage: turn.user_message });
    state = applyParts(state, turn.parts, isRenderableBlock);
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

/** Fetches a stored session and rebuilds its chat state for the "Past search" view (REQ-010). */
export const openSessionWorkflow = async (
  api: Pick<SessionsApi, 'getSession'>,
  enterpriseCustomerUuid: string,
  sessionUuid: string,
  isRenderableBlock?: BlockValidator,
): Promise<{ stream: ChatStreamState; created: string }> => {
  const detail = await api.getSession(enterpriseCustomerUuid, sessionUuid);
  return { stream: reopenSessionWorkflow(detail, isRenderableBlock), created: detail.created };
};

/**
 * Loads one page of the learner's sessions and returns the history fields to set: page 1 replaces
 * the list, later pages append to it.
 */
export const loadHistoryPageWorkflow = async (
  api: Pick<SessionsApi, 'listSessions'>,
  enterpriseCustomerUuid: string,
  page: number,
  getLoadedItems: () => SessionSummary[],
): Promise<{ items: SessionSummary[]; page: number; hasMore: boolean }> => {
  const result = await api.listSessions(enterpriseCustomerUuid, page);
  return {
    items: page === 1 ? result.results : [...getLoadedItems(), ...result.results],
    page,
    hasMore: !!result.next,
  };
};
