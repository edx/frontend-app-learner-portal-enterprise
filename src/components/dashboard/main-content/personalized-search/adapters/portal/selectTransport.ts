import { BufferedChatTransport } from '../../core/transports/BufferedChatTransport';
import type { ChatTransport } from '../../core/transports/ChatTransport';
import { FixtureChatTransport } from '../../core/transports/FixtureChatTransport';
import { SseChatTransport } from '../../core/transports/SseChatTransport';
import { UnavailableChatTransport } from '../../core/transports/UnavailableChatTransport';
import { getPersonalizedSearchApiBaseUrl } from './config';
import { getPortalHttpClient } from './http';

const apiOptions = { getHttpClient: getPortalHttpClient, getBaseUrl: getPersonalizedSearchApiBaseUrl };

/**
 * Picks the transport from `PERSONALIZED_SEARCH_TRANSPORT`: `fixture` replays goldens with no
 * backend, `buffered` is the KD-4 fallback, `unavailable` behaves like a switched-off backend,
 * and anything else (the default) streams SSE from enterprise-access.
 */
export const selectTransport = (setting: string | null | undefined): ChatTransport => {
  switch (setting) {
    case 'fixture':
      return new FixtureChatTransport();
    case 'buffered':
      return new BufferedChatTransport(apiOptions);
    case 'unavailable':
      return new UnavailableChatTransport();
    default:
      return new SseChatTransport(apiOptions);
  }
};
