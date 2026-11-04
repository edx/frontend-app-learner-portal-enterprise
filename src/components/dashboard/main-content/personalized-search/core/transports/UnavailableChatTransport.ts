import type { Part } from '../stream/types';
import { TransportError } from './ChatTransport';
import type { ChatTransport } from './ChatTransport';

/**
 * Placeholder until the SSE transport lands. Behaves like the backend
 * switch being off, so a Pathways-enabled environment shows "not available" rather than a tab
 * that silently does nothing.
 */
export class UnavailableChatTransport implements ChatTransport {
  // eslint-disable-next-line class-methods-use-this, require-yield
  async* send(): AsyncGenerator<Part, void, undefined> {
    throw new TransportError(404, null);
  }
}
