/**
 * Wire types for the Personalized Search turn stream: Vercel AI SDK "UI Message Stream" v1
 * parts (tech spec KD-4, "Stream contract") and Block catalog v1 (KD-5).
 *
 * Only `stream/` knows the protocol. Everything above it consumes `ChatStreamState`.
 */

import type { AnalyticsContext } from '../analytics';

export type ItemType = 'course' | 'executive_education' | 'program';

export type StatusStep = 'understanding' | 'searching' | 'writing';

export type ErrorCode =
  | 'intent_invalid'
  | 'retrieval_failed'
  | 'model_failed'
  | 'deadline_exceeded'
  | 'internal';

export type FollowUpAttribute = 'level' | 'time' | 'pacing' | 'type' | 'open';

// ---- ItemCard (server-hydrated from the Algolia hit; spec "ItemCard" table) ----

export interface CourseLink {
  kind: 'course';
  course_key: string;
  course_type: string | null;
}

export interface ProgramLink {
  kind: 'program';
  program_uuid: string;
}

/**
 * Card facts. Key names mirror the Algolia source fields named in the spec; all are optional
 * so the card renders whatever the server sends (reconcile with the chunk 6 goldens).
 */
export interface ItemFacts {
  level_type?: string | null;
  weeks_to_complete?: number | null;
  pacing_type?: string | null;
  program_type?: string | null;
  course_count?: number | null;
  /** Hours per week from the advertised run's effort range (optional, additive in v1). */
  hours_per_week_min?: number | null;
  hours_per_week_max?: number | null;
}

export interface ItemCard {
  item_id: string;
  item_type: ItemType;
  title: string;
  image_url: string | null;
  partner_name: string | null;
  partner_logo_url: string | null;
  link: CourseLink | ProgramLink;
  facts: ItemFacts;
  why: string | null;
  fit: string[];
  /** Optional, additive in v1: new to the conversation since the previous turn. */
  status?: 'new';
  /** Optional, additive in v1: where the server placed the card (usage events echo these). */
  section?: string;
  position?: number;
}

// ---- Block catalog v1 ----

export interface PageHeaderProps {
  title: string;
  dek: string;
  label: string;
}

export interface ItemSectionProps {
  item_type: ItemType;
  label: string;
  dek: string;
  fallback: boolean;
  items: ItemCard[];
  /** Optional, additive in v1: the catalog's matches for this type ("See all (n)"). */
  total?: number;
  /** Optional, additive in v1: next-best cards that fill a card the learner removes. */
  reserve?: ItemCard[];
}

export interface InsightProps {
  title: string;
  body: string;
}

export interface PlanStep {
  item_id: string;
  note: string;
}

export interface PlanProps {
  steps: PlanStep[];
  /** One sentence on why the steps are in this order (additive in v1). */
  why?: string;
}

/** A warning that the results can't meet a goal the learner stated (additive in v1, KD-11). */
export interface CaveatProps {
  title: string;
  body: string;
}

/** What the AI knows about the learner, for "Why these?" (additive in v1, KD-11). */
export interface ProfileProps {
  summary: string;
  chips: string[];
}

/** The one item to start with (additive in v1, KD-11). */
export interface TopPickProps {
  item: ItemCard;
  reason: string;
  checks: string[];
}

export interface CompareOption {
  best_for: string;
  item: ItemCard;
}

/** 2-3 options with what each is best for (additive in v1, KD-11). */
export interface CompareProps {
  options: CompareOption[];
}

export type Block =
  | { v: 1; type: 'page_header'; props: PageHeaderProps }
  | { v: 1; type: 'item_section'; props: ItemSectionProps }
  | { v: 1; type: 'insight'; props: InsightProps }
  | { v: 1; type: 'plan'; props: PlanProps }
  | { v: 1; type: 'top_pick'; props: TopPickProps }
  | { v: 1; type: 'compare'; props: CompareProps }
  | { v: 1; type: 'profile'; props: ProfileProps }
  | { v: 1; type: 'caveat'; props: CaveatProps };

export type BlockType = Block['type'];

export const BLOCK_CATALOG_VERSION = 1;

export const KNOWN_BLOCK_TYPES: ReadonlyArray<BlockType> = [
  'page_header', 'item_section', 'insight', 'plan', 'top_pick', 'compare', 'profile', 'caveat',
];

// ---- Parts ----

export interface SessionData {
  session_uuid: string;
  turn_sequence: number;
  title: string | null;
}

export interface FollowupsData {
  question: string;
  attribute: FollowUpAttribute;
  /** The fixed chips that narrow the follow-up attribute (empty for "open" when there are ideas). */
  suggestions: string[];
  /** Up to three model-written chips for this conversation (additive in v1). */
  ideas?: string[];
}

/** Token and timing detail for one model call; sent only when enterprise-access debug is on. */
export interface ModelCallDebug {
  model: string;
  effort: string | null;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
  elapsed_ms: number | null;
  first_token_ms: number | null;
  cost_usd: number | null;
}

/** Dev-only extras on `data-timing` (enterprise-access `PERSONALIZED_SEARCH_DEBUG_OVERRIDES_ENABLED`). */
export interface TimingDebug {
  candidates: number;
  followup_attribute: string | null;
  catalog: string | null;
  dropped?: string[];
  intent?: ModelCallDebug | null;
  compose?: ModelCallDebug | null;
  cost_usd: number | null;
}

export interface TimingData {
  backend: string;
  model_intent: string | null;
  model_compose: string | null;
  intent_ms: number | null;
  retrieval_ms: number | null;
  first_text_ms: number | null;
  first_section_ms: number | null;
  complete_ms: number | null;
  dropped_lines: number;
  debug?: TimingDebug;
}

export type Part =
  | { type: 'start'; messageId: string }
  | { type: 'finish' }
  | { type: 'error'; errorText: string }
  | { type: 'text-start'; id: string }
  | { type: 'text-delta'; id: string; delta: string }
  | { type: 'text-end'; id: string }
  | { type: 'data-session'; id: string; data: SessionData }
  | { type: 'data-status'; data: { step: StatusStep }; transient?: boolean }
  | { type: 'data-block'; id: string; data: Block }
  | { type: 'data-followups'; id: string; data: FollowupsData }
  | { type: 'data-timing'; id: string; data: TimingData; transient?: boolean }
  | { type: 'data-analytics'; id: string; data: AnalyticsContext };

export type PartType = Part['type'];

// ---- Reduced state ----

export type TurnStatus = 'streaming' | 'done' | 'error' | 'stopped';

export interface PageBlock {
  id: string;
  block: Block;
}

export interface AssistantTurn {
  /** Client-side id; stable for the life of the turn (the server messageId arrives later). */
  localId: string;
  /** `turn_<ChatTurn.uuid>` from the `start` part; null until it arrives. */
  messageId: string | null;
  /** The turn's sequence in its session, from `data-session`; null until it arrives. */
  sequence: number | null;
  /** The server's join keys for this turn's usage events (`data-analytics`); null until they arrive. */
  analytics: AnalyticsContext | null;
  userMessage: string | null;
  status: TurnStatus;
  step: StatusStep | null;
  text: string;
  /** Page blocks in first-arrival order, upserted by part id. */
  blocks: PageBlock[];
  followups: FollowupsData | null;
  /** In-stream error code, or a transport error code set by the workflow. */
  error: string | null;
  timing: TimingData | null;
}

export interface ChatSessionInfo {
  sessionUuid: string | null;
  title: string | null;
  turnSequence: number | null;
}

export interface ChatStreamState {
  session: ChatSessionInfo;
  turns: AssistantTurn[];
  /** localId of the turn currently receiving parts, if any. */
  activeTurnId: string | null;
}
