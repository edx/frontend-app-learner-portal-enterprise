import type { ApiOptions } from '../http';
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

export const getItemFeedbackUrl = (baseUrl: string) => `${baseUrl}/api/v1/personalized-search/item-feedback/`;

export const getTurnRatingUrl = (baseUrl: string, sessionUuid: string, sequence: number) => (
  `${baseUrl}/api/v1/personalized-search/sessions/${sessionUuid}/turns/${sequence}/feedback/`
);

export interface FeedbackApiClient {
  /** The learner's feedback of one kind in this enterprise, newest first (REQ-009). */
  listFeedback: (enterpriseCustomerUuid: string, kind: FeedbackKind) => Promise<FeedbackRow[]>;
  /** Record Save or Not interested; idempotent on the server. */
  addFeedback: (
    enterpriseCustomerUuid: string,
    kind: FeedbackKind,
    item: ItemCard,
    sessionUuid: string | null,
  ) => Promise<void>;
  /** Undo Save or Not interested. */
  removeFeedback: (enterpriseCustomerUuid: string, kind: FeedbackKind, itemId: string) => Promise<void>;
  /** Thumbs up (1), down (-1) or cleared (null) on one of the learner's replies. */
  rateTurn: (
    enterpriseCustomerUuid: string, sessionUuid: string, sequence: number, rating: 1 | -1 | null,
  ) => Promise<void>;
}

export const createFeedbackApi = ({ getHttpClient, getBaseUrl }: ApiOptions): FeedbackApiClient => ({
  listFeedback: async (enterpriseCustomerUuid, kind) => {
    const { data } = await getHttpClient().get(getItemFeedbackUrl(getBaseUrl()), {
      params: { enterprise_customer_uuid: enterpriseCustomerUuid, kind },
    });
    return (data?.results ?? []) as FeedbackRow[];
  },
  addFeedback: async (enterpriseCustomerUuid, kind, item, sessionUuid) => {
    await getHttpClient().post(getItemFeedbackUrl(getBaseUrl()), {
      enterprise_customer_uuid: enterpriseCustomerUuid,
      item_id: item.item_id,
      item_type: item.item_type,
      kind,
      session_uuid: sessionUuid,
      card_snapshot: item,
    });
  },
  removeFeedback: async (enterpriseCustomerUuid, kind, itemId) => {
    await getHttpClient().delete(getItemFeedbackUrl(getBaseUrl()), {
      params: { enterprise_customer_uuid: enterpriseCustomerUuid, item_id: itemId, kind },
    });
  },
  rateTurn: async (enterpriseCustomerUuid, sessionUuid, sequence, rating) => {
    await getHttpClient().post(getTurnRatingUrl(getBaseUrl(), sessionUuid, sequence), {
      enterprise_customer_uuid: enterpriseCustomerUuid, rating,
    });
  },
});
