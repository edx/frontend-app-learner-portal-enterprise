import { parseSse } from '../stream/parseSse';
import type { Part } from '../stream/types';
import {
  getTurnsUrl, toTurnRequestBody, TransportError,
} from './ChatTransport';
import type { ChatTransport, SendTurnOptions } from './ChatTransport';
import type { ApiOptions, GetHttpClient } from '../http';

export type SseChatTransportOptions = ApiOptions;

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
  private readonly getHttpClient: GetHttpClient;

  private readonly getBaseUrl: () => string;

  constructor({ getHttpClient, getBaseUrl }: SseChatTransportOptions) {
    this.getHttpClient = getHttpClient;
    this.getBaseUrl = getBaseUrl;
  }

  async* send({ request, signal }: SendTurnOptions): AsyncGenerator<Part, void, undefined> {
    const baseUrl = this.getBaseUrl();
    let response: Response;
    try {
      const { data } = await this.getHttpClient().get(`${baseUrl}/csrf/api/v1/token`, { signal });
      response = await fetch(getTurnsUrl(baseUrl), {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          'USE-JWT-COOKIE': 'true',
          'X-CSRFToken': data?.csrfToken ?? '',
        },
        body: JSON.stringify(toTurnRequestBody(request)),
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
