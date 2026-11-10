/**
 * Usage events (tech spec KD-12): the actions the feature reports and the shape of their properties.
 * Events carry raw facts and the server's join keys only; nothing here counts, sums or derives.
 */
export type TrackAction =
  | 'tab_viewed'
  | 'prompt_submitted'
  | 'results_rendered'
  | 'result_clicked'
  | 'item_save_toggled'
  | 'item_dismissed'
  | 'explanation_opened'
  | 'new_chat_started'
  | 'saved_tab_opened'
  | 'history_opened';

/** Flat values only, so the warehouse can store and join them. */
export type TrackValue = string | number | boolean | null | Array<string | number | boolean | null>;
export type TrackProperties = Record<string, TrackValue>;

/** The join keys the server sends with each turn (`data-analytics`). */
export interface AnalyticsContext {
  conversation_id: string;
  turn_id: string;
  turn_index: number;
  enterprise_customer_uuid?: string;
  cohort?: string | null;
  engine?: string | null;
  is_debug?: boolean;
}

/** The join keys as event properties, or none when the server hasn't sent them yet. */
export const joinKeysOf = (context: AnalyticsContext | null | undefined): TrackProperties => (
  context ? { ...context } as TrackProperties : {}
);
