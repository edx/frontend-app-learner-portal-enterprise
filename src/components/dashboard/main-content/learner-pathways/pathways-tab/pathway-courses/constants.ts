import type { MessageDescriptor } from '@edx/frontend-platform/i18n';

import type { PathwayCourseStatus } from '../state';
import messages from './messages';

/**
 * Centralized status -> UI mapping. Keyed by the full `PathwayCourseStatus`
 * union so the compiler forces an update here if that union ever grows.
 * Message *formatting* (`intl.formatMessage`) stays in the components that
 * consume these — this module only holds the lookup data.
 */
export const STATUS_BADGE_VARIANT: Record<PathwayCourseStatus, string> = {
  completed: 'success',
  in_progress: 'warning',
  not_started: 'light',
};

export const STATUS_MESSAGE: Record<PathwayCourseStatus, MessageDescriptor> = {
  completed: messages.statusCompleted,
  in_progress: messages.statusInProgress,
  not_started: messages.statusNotStarted,
};

export const ACTION_MESSAGE: Record<PathwayCourseStatus, MessageDescriptor> = {
  completed: messages.actionViewCertificate,
  in_progress: messages.actionContinue,
  not_started: messages.actionRegister,
};

/**
 * Per-learner marker for the one-time automatic feedback-modal prompt. Scoped by
 * username (mirrors VIDEO_FEEDBACK_SUBMITTED_LOCALSTORAGE_KEY's scoping-function
 * shape in src/components/microlearning/constants.js) so one learner's dismissal
 * never suppresses another learner's prompt on a shared browser.
 */
export const PATHWAY_FEEDBACK_PROMPT_SEEN_LOCALSTORAGE_KEY = (
  username: string,
) => `pathways-feedback-prompt-seen-${username}`;
