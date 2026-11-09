import type { Part } from '../stream/types';

/** One learner message, as the turn endpoint takes it (tech spec API Contracts, POST turns/). */
export interface TurnRequest {
  enterpriseCustomerUuid: string;
  /** null starts a new session. */
  sessionUuid: string | null;
  message: string;
}

export interface SendTurnOptions {
  request: TurnRequest;
  /** Aborting ends iteration without yielding further parts; this is how Stop works. */
  signal?: AbortSignal;
}

/**
 * Port for sending a turn and receiving its parts (KD-6). Adapters: SSE (default),
 * buffered (`?mode=buffered`, the KD-4 fallback) and fixture replay (no backend).
 *
 * In-stream failures arrive as an `error` part. HTTP failures before the stream starts throw
 * `TransportError`.
 */
export interface ChatTransport {
  send(options: SendTurnOptions): AsyncIterable<Part>;
}

/** An HTTP failure before any part was received. `code` is the body's `code`, if any. */
export class TransportError extends Error {
  readonly status: number;

  readonly code: string | null;

  constructor(status: number, code: string | null = null) {
    super(`Personalized Search turn request failed with status ${status}${code ? ` (${code})` : ''}`);
    this.name = 'TransportError';
    this.status = status;
    this.code = code;
  }
}

export const getTurnsUrl = (enterpriseAccessBaseUrl: string) => (
  `${enterpriseAccessBaseUrl}/api/v1/personalized-search/turns/`
);

export const toTurnRequestBody = ({ enterpriseCustomerUuid, sessionUuid, message }: TurnRequest) => ({
  enterprise_customer_uuid: enterpriseCustomerUuid,
  session_uuid: sessionUuid,
  message,
});
