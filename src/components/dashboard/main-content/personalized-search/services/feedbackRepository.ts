import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import type { ItemCard, ItemType } from '../stream/types';

export type FeedbackKind = 'saved' | 'not_interested';

export interface FeedbackRow {
  item_id: string;
  item_type: ItemType;
  kind: FeedbackKind;
  /** The ItemCard as it was when saved, so the Saved view renders without a catalog lookup. */
  card_snapshot: ItemCard | null;
  created: string;
}

const feedbackUrl = (baseUrl: string) => `${baseUrl}/api/v1/personalized-search/item-feedback/`;

/** The learner's feedback of one kind in this enterprise, newest first (REQ-009). */
export const listFeedback = async (baseUrl: string, enterpriseCustomerUuid: string, kind: FeedbackKind) => {
  const { data } = await getAuthenticatedHttpClient().get(feedbackUrl(baseUrl), {
    params: { enterprise_customer_uuid: enterpriseCustomerUuid, kind },
  });
  return (data?.results ?? []) as FeedbackRow[];
};

/** Record Save or Not interested; idempotent on the server. */
export const addFeedback = async (
  baseUrl: string,
  enterpriseCustomerUuid: string,
  kind: FeedbackKind,
  item: ItemCard,
  sessionUuid: string | null,
) => {
  await getAuthenticatedHttpClient().post(feedbackUrl(baseUrl), {
    enterprise_customer_uuid: enterpriseCustomerUuid,
    item_id: item.item_id,
    item_type: item.item_type,
    kind,
    session_uuid: sessionUuid,
    card_snapshot: item,
  });
};

/** Undo Save or Not interested. */
export const removeFeedback = async (
  baseUrl: string,
  enterpriseCustomerUuid: string,
  kind: FeedbackKind,
  itemId: string,
) => {
  await getAuthenticatedHttpClient().delete(feedbackUrl(baseUrl), {
    params: { enterprise_customer_uuid: enterpriseCustomerUuid, item_id: itemId, kind },
  });
};
