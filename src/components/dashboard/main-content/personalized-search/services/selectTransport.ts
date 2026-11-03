import { BufferedChatTransport } from './BufferedChatTransport';
import type { ChatTransport } from './ChatTransport';
import { FixtureChatTransport } from './FixtureChatTransport';
import { UnavailableChatTransport } from './UnavailableChatTransport';

/**
 * Picks the transport from `PERSONALIZED_SEARCH_TRANSPORT`: `fixture` replays goldens with no
 * backend, `buffered` is the KD-4 fallback, and unset will be SSE (chunk 26; a placeholder until then).
 */
export const selectTransport = (setting: string | null | undefined): ChatTransport => {
  switch (setting) {
    case 'fixture':
      return new FixtureChatTransport();
    case 'buffered':
      return new BufferedChatTransport();
    default:
      return new UnavailableChatTransport();
  }
};
