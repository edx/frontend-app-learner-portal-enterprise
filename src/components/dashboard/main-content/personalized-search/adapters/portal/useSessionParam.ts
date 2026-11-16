import { useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export const SESSION_PARAM = 'session';

/** UUID shape only (not `uuid`'s `validate`, which rejects ids outside RFC versions and variants). */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The conversation in the URL (`?session=<uuid>`, the same id as the usage events' `conversation_id`).
 * Updates replace the current history entry, so leaving for a course page and pressing Back returns to
 * this conversation without adding an entry per message. Anything that isn't a UUID is ignored: the
 * value becomes part of an authenticated request path. The replace keeps the entry's navigation state, which
 * holds how the learner arrived (`getPortalEntryPoint`), so Back to the tab still reports that.
 */
export const useSessionParam = (): [string | null, (sessionUuid: string | null) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useLocation();
  const setSessionParam = useCallback((sessionUuid: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (sessionUuid) { next.set(SESSION_PARAM, sessionUuid); } else { next.delete(SESSION_PARAM); }
      return next;
    }, { replace: true, state });
  }, [setSearchParams, state]);
  const raw = searchParams.get(SESSION_PARAM);
  return [raw && UUID_SHAPE.test(raw) ? raw : null, setSessionParam];
};
