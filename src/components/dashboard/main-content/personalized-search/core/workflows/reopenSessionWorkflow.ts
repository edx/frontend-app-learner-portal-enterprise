import { applyParts, beginTurn, getInitialChatStreamState } from '../stream/applyPart';
import type { BlockValidator } from '../stream/applyPart';
import type { ChatStreamState } from '../stream/types';
import type { SessionDetail, SessionsApi, SessionSummary } from '../api/sessions';

/** The local id a replayed turn gets. */
export const pastTurnId = (sessionUuid: string, sequence: number) => `past-${sessionUuid}-${sequence}`;

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
    state = beginTurn(state, { localId: pastTurnId(detail.uuid, turn.sequence), userMessage: turn.user_message });
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
): Promise<{ stream: ChatStreamState; created: string; ratings: Record<string, 1 | -1> }> => {
  const detail = await api.getSession(enterpriseCustomerUuid, sessionUuid);
  // The learner's thumbs, keyed by the replayed turns' local ids, so a reopened reply shows its rating.
  const ratings = Object.fromEntries(detail.turns
    .filter((turn) => turn.rating === 1 || turn.rating === -1)
    .map((turn) => [pastTurnId(detail.uuid, turn.sequence), turn.rating as 1 | -1]));
  return { stream: reopenSessionWorkflow(detail, isRenderableBlock), created: detail.created, ratings };
};

/** Sessions per page of enterprise-access's history list. */
export const HISTORY_PAGE_SIZE = 20;

/**
 * Loads one page of the learner's sessions and returns the history fields to set: page 1 replaces
 * the list, later pages append the sessions not already listed (after a delete, a page overlaps the list).
 */
export const loadHistoryPageWorkflow = async (
  api: Pick<SessionsApi, 'listSessions'>,
  enterpriseCustomerUuid: string,
  page: number,
  getLoadedItems: () => SessionSummary[],
): Promise<{ items: SessionSummary[]; page: number; hasMore: boolean }> => {
  const result = await api.listSessions(enterpriseCustomerUuid, page);
  return {
    items: page === 1 ? result.results : (() => {
      const listed = getLoadedItems();
      const seen = new Set(listed.map((item) => item.uuid));
      return [...listed, ...result.results.filter((item) => !seen.has(item.uuid))];
    })(),
    page,
    hasMore: !!result.next,
  };
};

/**
 * Permanently deletes one of the learner's sessions. A 404 means it's already gone (deleted in another tab,
 * or by the 30-day purge), which is what the learner asked for, so it counts as deleted.
 */
/** The HTTP status of a failed request from the host's client, if it has one. */
export const httpStatusOf = (e: unknown): number | undefined => (
  (e as { response?: { status?: number } })?.response?.status
);

export const deleteSessionWorkflow = async (
  api: Pick<SessionsApi, 'deleteSession'>,
  enterpriseCustomerUuid: string,
  sessionUuid: string,
): Promise<void> => {
  try {
    await api.deleteSession(enterpriseCustomerUuid, sessionUuid);
  } catch (e) {
    if (httpStatusOf(e) !== 404) { throw e; }
  }
};

/**
 * Whether a request failed because the session is gone: deleted, purged, or not this learner's. enterprise-access
 * answers 404 with `{"code": "session_not_found"}`; a plain 404 means the feature is off.
 */
export const isSessionGoneError = (e: unknown): boolean => {
  const response = (e as { response?: { status?: number; data?: { code?: unknown } } })?.response;
  return response?.status === 404 && response.data?.code === 'session_not_found';
};
