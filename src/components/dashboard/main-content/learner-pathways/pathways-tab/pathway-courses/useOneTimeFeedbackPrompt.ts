import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import { PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY } from './constants';

export interface UseOneTimeFeedbackPromptOptions {
  /** Whether the store holds at least one real (non-fixture) generated course. */
  hasGeneratedCourses: boolean;
  delayMs?: number;
}

export interface UseOneTimeFeedbackPromptResult {
  isOpen: boolean;
  /** Opens immediately (e.g. footer click), clearing any pending automatic-open timer. */
  openManually: () => void;
  close: () => void;
}

const DEFAULT_DELAY_MS = 15000;

/**
 * Schedules the pathways feedback modal to open once, `delayMs` after a real
 * (non-fixture) pathway becomes active — never re-firing once shown. Narrowly
 * scoped to this one prompt rather than a generic useTimeout/useOneTimePrompt,
 * since nothing else in the repo needs either yet.
 */
const useOneTimeFeedbackPrompt = ({
  hasGeneratedCourses,
  delayMs = DEFAULT_DELAY_MS,
}: UseOneTimeFeedbackPromptOptions): UseOneTimeFeedbackPromptResult => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // No stable identity to scope storage by — fail safe by never auto-prompting.
  const hasBeenShown = useCallback(() => {
    const username = getAuthenticatedUser()?.username;
    if (!username) {
      return true;
    }
    return global.localStorage.getItem(PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY(username)) === 'true';
  }, []);

  const markShown = useCallback(() => {
    const username = getAuthenticatedUser()?.username;
    if (username) {
      global.localStorage.setItem(PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY(username), 'true');
    }
  }, []);

  useEffect(() => {
    clearPendingTimeout();
    if (!hasGeneratedCourses || hasBeenShown()) {
      return clearPendingTimeout;
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setIsOpen(true);
      markShown();
    }, delayMs);
    return clearPendingTimeout;
  }, [hasGeneratedCourses, hasBeenShown, markShown, clearPendingTimeout, delayMs]);

  const openManually = useCallback(() => {
    clearPendingTimeout();
    setIsOpen(true);
    markShown();
  }, [clearPendingTimeout, markShown]);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, openManually, close };
};

export default useOneTimeFeedbackPrompt;
