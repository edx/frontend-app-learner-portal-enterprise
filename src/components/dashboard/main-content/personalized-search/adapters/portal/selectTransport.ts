import { BufferedChatTransport } from '../../core/transports/BufferedChatTransport';
import type { ChatTransport } from '../../core/transports/ChatTransport';
import { FixtureChatTransport } from '../../core/transports/FixtureChatTransport';
import { SseChatTransport } from '../../core/transports/SseChatTransport';
import type { DebugOverrides } from '../../core/transports/SseChatTransport';
import { UnavailableChatTransport } from '../../core/transports/UnavailableChatTransport';
import { getPersonalizedSearchApiBaseUrl } from './config';
import { getPortalHttpClient } from './http';

const apiOptions = { getHttpClient: getPortalHttpClient, getBaseUrl: getPersonalizedSearchApiBaseUrl };

/**
 * Picks the transport from `PERSONALIZED_SEARCH_TRANSPORT`: unset (the default) or `sse` streams SSE
 * from enterprise-access, `fixture` replays goldens with no backend, `buffered` is the KD-4 fallback,
 * and `unavailable` behaves like a switched-off backend. Any other value (a typo) is `unavailable` too,
 * so a misconfigured deploy shows the tab as off instead of quietly using a transport nobody chose.
 */
export const selectTransport = (
  setting: string | null | undefined,
  getDebugOverrides?: () => DebugOverrides | null,
): ChatTransport => {
  switch (setting?.trim() || 'sse') {
    case 'sse':
      return new SseChatTransport({ ...apiOptions, getDebugOverrides });
    case 'fixture':
      return new FixtureChatTransport();
    case 'buffered':
      return new BufferedChatTransport(apiOptions);
    default:
      return new UnavailableChatTransport();
  }
};
