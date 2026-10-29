import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { parseSse } from '../stream/parseSse';
import type { Part } from '../stream/types';
import {
  getTurnsUrl, toTurnRequestBody, TransportError,
} from './ChatTransport';
import type { ChatTransport, SendTurnOptions } from './ChatTransport';

/** Per-turn model overrides; enterprise-access honours them only when its debug setting is on. */
export interface DebugOverrides {
  intent_model?: string;
  intent_effort?: string | null;
  compose_model?: string;
  compose_effort?: string | null;
}

export interface SseChatTransportOptions {
  /** enterprise-access base URL, read per send so a config change applies without a reload. */
  getBaseUrl: () => string;
  /** Overrides to send with each turn (the debug panel), or null. */
  getDebugOverrides?: () => DebugOverrides | null;
}

const readErrorCode = async (response: Response): Promise<string | null> => {
  try {
    const body = await response.json();
    return typeof body?.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
};

/**
 * Default transport (KD-4, chunk 26): POSTs the turn with `fetch` and yields parts as the SSE
 * body streams in. Authenticates with the JWT cookie (`USE-JWT-COOKIE`) and enterprise-access's
 * own CSRF token. Fetching that token through the authenticated client also refreshes an
 * expired JWT cookie first.
 */
export class SseChatTransport implements ChatTransport {
  private readonly getBaseUrl: () => string;

  private readonly getDebugOverrides: () => DebugOverrides | null;

  constructor({ getBaseUrl, getDebugOverrides = () => null }: SseChatTransportOptions) {
    this.getBaseUrl = getBaseUrl;
    this.getDebugOverrides = getDebugOverrides;
  }

  async* send({ request, signal }: SendTurnOptions): AsyncGenerator<Part, void, undefined> {
    const baseUrl = this.getBaseUrl();
    const debug = this.getDebugOverrides();
    let response: Response;
    try {
      const { data } = await getAuthenticatedHttpClient().get(`${baseUrl}/csrf/api/v1/token`, { signal });
      response = await fetch(getTurnsUrl(baseUrl), {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          'USE-JWT-COOKIE': 'true',
          'X-CSRFToken': data?.csrfToken ?? '',
        },
        body: JSON.stringify({ ...toTurnRequestBody(request), ...(debug ? { debug } : {}) }),
        signal,
      });
    } catch (e) {
      if (signal?.aborted) { return; }
      throw e;
    }
    if (!response.ok) {
      throw new TransportError(response.status, await readErrorCode(response));
    }
    if (!response.body) {
      throw new Error('Personalized Search turn response has no body');
    }
    try {
      yield* parseSse(response.body);
    } catch (e) {
      if (signal?.aborted) { return; }
      throw e;
    }
  }
}
