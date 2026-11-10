import type { ApiOptions } from '../http';
import type { Part } from '../stream/types';

export interface SessionSummary {
  uuid: string;
  title: string | null;
  first_prompt: string;
  item_count: number;
  last_message_at: string;
  created: string;
}

export interface SessionPage {
  count: number;
  next: string | null;
  results: SessionSummary[];
}

export interface StoredTurn {
  sequence: number;
  user_message: string;
  /** The turn's stream as stored: transient parts removed, reply text coalesced. */
  parts: Part[];
  created: string;
  /** The learner's thumbs on this reply (1 up, -1 down), if any. */
  rating?: 1 | -1 | null;
}

export interface SessionDetail {
  uuid: string;
  title: string | null;
  created: string;
  turns: StoredTurn[];
}

export const getSessionsUrl = (baseUrl: string) => `${baseUrl}/api/v1/personalized-search/sessions/`;

export interface SessionsApi {
  /** The learner's sessions in this enterprise, newest first, 20 per page (REQ-010). */
  listSessions: (enterpriseCustomerUuid: string, page?: number) => Promise<SessionPage>;
  /** One session with its stored turns, for replay. */
  getSession: (enterpriseCustomerUuid: string, sessionUuid: string) => Promise<SessionDetail>;
}

export const createSessionsApi = ({ getHttpClient, getBaseUrl }: ApiOptions): SessionsApi => ({
  listSessions: async (enterpriseCustomerUuid, page = 1) => {
    const { data } = await getHttpClient().get(getSessionsUrl(getBaseUrl()), {
      params: { enterprise_customer_uuid: enterpriseCustomerUuid, page },
    });
    return data as SessionPage;
  },
  getSession: async (enterpriseCustomerUuid, sessionUuid) => {
    const { data } = await getHttpClient().get(`${getSessionsUrl(getBaseUrl())}${encodeURIComponent(sessionUuid)}/`, {
      params: { enterprise_customer_uuid: enterpriseCustomerUuid },
    });
    return data as SessionDetail;
  },
});
