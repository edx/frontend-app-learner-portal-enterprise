import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

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
}

export interface SessionDetail {
  uuid: string;
  title: string | null;
  created: string;
  turns: StoredTurn[];
}

const sessionsUrl = (baseUrl: string) => `${baseUrl}/api/v1/personalized-search/sessions/`;

/** The learner's sessions in this enterprise, newest first, 20 per page (REQ-010). */
export const listSessions = async (baseUrl: string, enterpriseCustomerUuid: string, page = 1): Promise<SessionPage> => {
  const { data } = await getAuthenticatedHttpClient().get(sessionsUrl(baseUrl), {
    params: { enterprise_customer_uuid: enterpriseCustomerUuid, page },
  });
  return data as SessionPage;
};

/** One session with its stored turns, for replay. */
export const getSession = async (
  baseUrl: string,
  enterpriseCustomerUuid: string,
  sessionUuid: string,
): Promise<SessionDetail> => {
  const { data } = await getAuthenticatedHttpClient().get(`${sessionsUrl(baseUrl)}${sessionUuid}/`, {
    params: { enterprise_customer_uuid: enterpriseCustomerUuid },
  });
  return data as SessionDetail;
};
