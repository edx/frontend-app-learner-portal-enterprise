import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export const SESSION_PARAM = 'session';

/**
 * The conversation in the URL (`?session=<uuid>`, the same id as the usage events' `conversation_id`).
 * Updates replace the current history entry, so leaving for a course page and pressing Back returns to
 * this conversation without adding an entry per message.
 */
export const useSessionParam = (): [string | null, (sessionUuid: string | null) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const setSessionParam = useCallback((sessionUuid: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (sessionUuid) { next.set(SESSION_PARAM, sessionUuid); } else { next.delete(SESSION_PARAM); }
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  return [searchParams.get(SESSION_PARAM), setSessionParam];
};
