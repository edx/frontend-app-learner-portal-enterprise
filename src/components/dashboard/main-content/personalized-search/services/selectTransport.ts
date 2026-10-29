import { BufferedChatTransport } from './BufferedChatTransport';
import type { ChatTransport } from './ChatTransport';
import { getPersonalizedSearchApiBaseUrl } from './debugConfig';
import { FixtureChatTransport } from './FixtureChatTransport';
import { SseChatTransport } from './SseChatTransport';
import type { DebugOverrides } from './SseChatTransport';
import { UnavailableChatTransport } from './UnavailableChatTransport';

/**
 * Picks the transport from `PERSONALIZED_SEARCH_TRANSPORT`: `fixture` replays goldens with no
 * backend, `buffered` is the KD-4 fallback, `unavailable` behaves like a switched-off backend,
 * and anything else (the default) streams SSE from enterprise-access.
 */
export const selectTransport = (
  setting: string | null | undefined,
  getDebugOverrides?: () => DebugOverrides | null,
): ChatTransport => {
  switch (setting) {
    case 'fixture':
      return new FixtureChatTransport();
    case 'buffered':
      return new BufferedChatTransport();
    case 'unavailable':
      return new UnavailableChatTransport();
    default:
      return new SseChatTransport({ getBaseUrl: getPersonalizedSearchApiBaseUrl, getDebugOverrides });
  }
};
