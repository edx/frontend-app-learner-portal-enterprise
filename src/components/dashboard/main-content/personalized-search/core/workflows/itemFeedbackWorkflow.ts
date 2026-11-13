import type { FeedbackApiClient } from '../api/feedback';
import type { ItemCard } from '../stream/types';

/** Learner feedback held in the store (REQ-009). */
export interface FeedbackState {
  /** Saved cards, newest first (from the server's snapshots, plus optimistic saves). */
  saved: ItemCard[];
  dismissedIds: string[];
  /** Dismissed ("Not for me") cards, newest first, for the Excluded tab (from the server's snapshots). */
  dismissed: ItemCard[];
  /** The last dismissed card, offered for Undo. */
  undo: ItemCard | null;
  error: boolean;
}

export interface FeedbackApi {
  add: (kind: 'saved' | 'not_interested', item: ItemCard) => Promise<void>;
  remove: (kind: 'saved' | 'not_interested', itemId: string) => Promise<void>;
}

export type FeedbackUpdate = (update: (state: FeedbackState) => FeedbackState) => void;

export type FeedbackAction =
  | { type: 'toggleSave'; item: ItemCard }
  | { type: 'dismiss'; item: ItemCard }
  | { type: 'undoDismiss' }
  /** Include a dismissed item in results again (the Excluded tab). */
  | { type: 'restore'; item: ItemCard };

const withoutItem = (items: ItemCard[], itemId: string) => items.filter((i) => i.item_id !== itemId);

/**
 * Applies a feedback action optimistically, calls the API, and reverts with ``error`` set if the call
 * fails (chunk 31: "failures revert with an Alert"). Hook-free: the controller supplies the API and
 * the store update.
 */
export const itemFeedbackWorkflow = async (
  action: FeedbackAction,
  { api, update, getState }: { api: FeedbackApi; update: FeedbackUpdate; getState: () => FeedbackState },
): Promise<boolean> => {
  const before = getState();
  let call: () => Promise<void>;
  if (action.type === 'toggleSave') {
    const { item } = action;
    const isSaved = before.saved.some((i) => i.item_id === item.item_id);
    update((s) => {
      const rest = withoutItem(s.saved, item.item_id);
      return { ...s, error: false, saved: isSaved ? rest : [item, ...rest] };
    });
    call = () => (isSaved ? api.remove('saved', item.item_id) : api.add('saved', item));
  } else if (action.type === 'dismiss') {
    const { item } = action;
    update((s) => ({
      ...s,
      error: false,
      undo: item,
      dismissedIds: [...s.dismissedIds.filter((id) => id !== item.item_id), item.item_id],
      dismissed: [item, ...withoutItem(s.dismissed, item.item_id)],
    }));
    call = () => api.add('not_interested', item);
  } else {
    const item = action.type === 'restore' ? action.item : before.undo;
    if (!item) { return true; }
    update((s) => ({
      ...s,
      error: false,
      undo: s.undo?.item_id === item.item_id ? null : s.undo,
      dismissedIds: s.dismissedIds.filter((id) => id !== item.item_id),
      dismissed: withoutItem(s.dismissed, item.item_id),
    }));
    call = () => api.remove('not_interested', item.item_id);
  }
  try {
    await call();
    return true;
  } catch {
    update(() => ({ ...before, error: true }));
    return false;
  }
};

/** Loads the learner's saved cards and dismissed items in this enterprise (REQ-009). */
export const loadFeedbackWorkflow = async (
  api: Pick<FeedbackApiClient, 'listFeedback'>,
  enterpriseCustomerUuid: string,
): Promise<Pick<FeedbackState, 'saved' | 'dismissedIds' | 'dismissed'>> => {
  const [saved, dismissed] = await Promise.all([
    api.listFeedback(enterpriseCustomerUuid, 'saved'),
    api.listFeedback(enterpriseCustomerUuid, 'not_interested'),
  ]);
  return {
    saved: saved.map((row) => row.card_snapshot).filter((card): card is ItemCard => !!card),
    dismissedIds: dismissed.map((row) => row.item_id),
    dismissed: dismissed.map((row) => row.card_snapshot).filter((card): card is ItemCard => !!card),
  };
};
