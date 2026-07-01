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
