import type { MessageDescriptor } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import { INTERRUPTED_TURN_ERROR } from '../../core/pendingTurn';

export interface TurnErrorPresentation {
  message: MessageDescriptor;
  /** Alert (with optional Retry) vs. inline text. */
  asAlert: boolean;
  canRetry: boolean;
  /** Offer a sign-in link instead of Retry (the learner's session expired). */
  signIn?: boolean;
  /** The Retry button's text, when not "Retry". */
  retryLabel?: MessageDescriptor;
  /** The Alert's variant, when not `danger`. */
  variant?: 'warning';
}

/**
 * Maps a failed turn's error code to the spec's client action (API Error Codes). HTTP failures
 * before the stream are `http_<status>`; anything else (in-stream codes, network) is generic.
 * 403/404 are handled at the tab level (not-available Alert), so they never reach a message.
 */
export const presentTurnError = (code: string | null): TurnErrorPresentation => {
  switch (code) {
    case 'http_400':
      return { message: messages.messageTooLong, asAlert: false, canRetry: false };
    case 'http_401':
      // Retrying can't work until the learner signs in again.
      return {
        message: messages.errorSessionExpired, asAlert: true, canRetry: false, signIn: true,
      };
    case INTERRUPTED_TURN_ERROR:
      // A message restored after a reload cut its reply off (N-10): not a failure, so a warning to resend.
      return {
        message: messages.turnInterrupted, asAlert: true, canRetry: true, retryLabel: messages.resend, variant: 'warning',
      };
    case 'http_409':
      return { message: messages.errorTurnInProgress, asAlert: true, canRetry: true };
    case 'http_429':
      return { message: messages.errorThrottled, asAlert: false, canRetry: false };
    case 'http_503':
      return { message: messages.errorCatalog, asAlert: true, canRetry: true };
    default:
      return { message: messages.errorGeneric, asAlert: true, canRetry: true };
  }
};
