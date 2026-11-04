import type { Part } from '../stream/types';
import {
  getTurnsUrl, toTurnRequestBody, TransportError,
} from './ChatTransport';
import type { ChatTransport, SendTurnOptions } from './ChatTransport';
import type { ApiOptions, GetHttpClient } from '../http';

interface AxiosLikeError {
  response?: { status: number; data?: { code?: unknown } };
  code?: string;
  name?: string;
}

const isCancel = (error: AxiosLikeError) => error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';

/**
 * KD-4 fallback: POSTs the turn with `?mode=buffered` and yields the returned `parts` in order,
 * so the reducer runs unchanged (`PERSONALIZED_SEARCH_TRANSPORT=buffered`).
 */
export class BufferedChatTransport implements ChatTransport {
  private readonly getHttpClient: GetHttpClient;

  private readonly getBaseUrl: () => string;

  constructor({ getHttpClient, getBaseUrl }: ApiOptions) {
    this.getHttpClient = getHttpClient;
    this.getBaseUrl = getBaseUrl;
  }

  async* send({ request, signal }: SendTurnOptions): AsyncGenerator<Part, void, undefined> {
    let parts: Part[];
    try {
      const response = await this.getHttpClient().post(
        `${getTurnsUrl(this.getBaseUrl())}?mode=buffered`,
        toTurnRequestBody(request),
        { signal },
      );
      parts = Array.isArray(response.data?.parts) ? response.data.parts : [];
    } catch (e) {
      const error = e as AxiosLikeError;
      if (isCancel(error) || signal?.aborted) { return; }
      if (error?.response) {
        const code = error.response.data?.code;
        throw new TransportError(error.response.status, typeof code === 'string' ? code : null);
      }
      throw e;
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const part of parts) {
      if (signal?.aborted) { return; }
      yield part;
    }
  }
}
