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
  | 'excluded_tab_opened'
  | 'history_opened';

/**
 * How a message was sent: typed, a starter chip, a fixed follow-up chip, a model-suggested chip, or a
 * result's More like this.
 */
export type PromptSource = 'typed' | 'starter_chip' | 'followup_chip' | 'suggested_chip' | 'more_like_this';

/**
 * How the learner reached the tab (`tab_viewed`). The redirect values are reserved for the Pathways and
 * skills-quiz redirects to the tab, which don't exist yet.
 */
export type EntryPoint = 'nav_tab' | 'deep_link' | 'pathways_redirect' | 'skills_quiz_redirect';

/** Which explanation the learner opened: a card's, the result set's, or the suggested order's. */
export type ExplainScope = 'tile' | 'set' | 'order';

/**
 * The results tab an item event happened on, when it isn't For you. It replaces the card's section and
 * position: a saved or excluded card keeps the ones it had when it was saved or excluded.
 */
export type ItemSurface = 'saved_tab' | 'excluded_tab';

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
  /**
   * Why the server redirected the message instead of searching, when it did: `off_topic`, `unsafe`, `injection`,
   * `distress`, `external_provider`, or a newer reason. Optional and open-ended; passed through as is.
   */
  redirect_reason?: string | null;
}

/** The join keys as event properties, or none when the server hasn't sent them yet. */
export const joinKeysOf = (context: AnalyticsContext | null | undefined): TrackProperties => (
  context ? { ...context } as TrackProperties : {}
);
