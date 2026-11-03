import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';

import type { Part } from '../stream/types';
import {
  getTurnsUrl, toTurnRequestBody, TransportError,
} from './ChatTransport';
import type { ChatTransport, SendTurnOptions } from './ChatTransport';

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
  // eslint-disable-next-line class-methods-use-this
  async* send({ request, signal }: SendTurnOptions): AsyncGenerator<Part, void, undefined> {
    let parts: Part[];
    try {
      const response = await getAuthenticatedHttpClient().post(
        `${getTurnsUrl(getConfig().ENTERPRISE_ACCESS_BASE_URL)}?mode=buffered`,
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
