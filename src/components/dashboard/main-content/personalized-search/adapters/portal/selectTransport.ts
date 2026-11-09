import { BufferedChatTransport } from '../../core/transports/BufferedChatTransport';
import type { ChatTransport } from '../../core/transports/ChatTransport';
import { FixtureChatTransport } from '../../core/transports/FixtureChatTransport';
import { UnavailableChatTransport } from '../../core/transports/UnavailableChatTransport';
import { getPersonalizedSearchApiBaseUrl } from './config';
import { getPortalHttpClient } from './http';

const apiOptions = { getHttpClient: getPortalHttpClient, getBaseUrl: getPersonalizedSearchApiBaseUrl };

/**
 * Picks the transport from `PERSONALIZED_SEARCH_TRANSPORT`: `fixture` replays goldens with no
 * backend, `buffered` is the KD-4 fallback, and unset will be SSE (chunk 26; a placeholder until then).
 */
export const selectTransport = (setting: string | null | undefined): ChatTransport => {
  switch (setting) {
    case 'fixture':
      return new FixtureChatTransport();
    case 'buffered':
      return new BufferedChatTransport(apiOptions);
    default:
      return new UnavailableChatTransport();
  }
};
