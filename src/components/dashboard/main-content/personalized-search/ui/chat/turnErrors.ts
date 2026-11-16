import type { MessageDescriptor } from '@edx/frontend-platform/i18n';

import messages from '../messages';

export interface TurnErrorPresentation {
  message: MessageDescriptor;
  /** Alert (with optional Retry) vs. inline text. */
  asAlert: boolean;
  canRetry: boolean;
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
