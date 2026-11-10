import type { DebugConfig } from '../core/api/debug';
import type { FeedbackApiClient } from '../core/api/feedback';
import type { SessionsApi } from '../core/api/sessions';
import type { ChatTransport } from '../core/transports/ChatTransport';
import type { DebugOverrides } from '../core/transports/SseChatTransport';
import type { ItemLinks } from '../ui/cards/EditorialItemCard';
import type { TrackAction, TrackProperties } from '../core/analytics';

/** The enterprise the learner is in, as the host knows it. */
export interface EnterpriseContext {
  uuid?: string;
  slug?: string;
}

/** What the `?debug=true` panel needs from the host. */
export interface DebugDeps {
  /** A React hook: whether the page asked for debug mode. */
  useDebugRequested: () => boolean;
  /** A live (SSE) transport that sends the panel's model overrides. */
  createLiveTransport: (getDebugOverrides: () => DebugOverrides | null) => ChatTransport;
  getApiBaseUrl: () => string;
  fetchDebugConfig: (enterpriseCustomerUuid: string) => Promise<DebugConfig | null>;
}

/**
 * Everything the Personalized Search feature needs from its host (KD-10). The learner portal's
 * implementation is `adapters/portal/portalDeps`; another host supplies its own.
 */
export interface PersonalizedSearchDeps {
  /** A React hook returning the learner's current enterprise. */
  useEnterpriseContext: () => EnterpriseContext;
  /** The transport for turns, chosen from host config. */
  createTransport: (getDebugOverrides?: () => DebugOverrides | null) => ChatTransport;
  logError: (error: unknown) => void;
  /** Course and program links for the learner's enterprise. */
  createItemLinks: (enterpriseSlug: string) => ItemLinks;
  sessionsApi: SessionsApi;
  feedbackApi: FeedbackApiClient;
  /** `?debug=true` tooling; only used when `useDebugRequested` returns true. */
  debug: DebugDeps;
  /**
   * Sends one usage event (KD-12). Properties are flat and already carry the join keys and the
   * enterprise; the host only names and sends the event. Must never throw.
   */
  trackEvent: (action: TrackAction, properties: TrackProperties) => void;
  /** How the learner reached the tab, for `tab_viewed`. */
  getEntryPoint: () => string;
  /**
   * A React hook: the conversation id in the page URL (`?session=<uuid>`) and a setter that replaces it
   * (null removes it), so Back and Forward return to the same conversation.
   */
  useSessionParam: () => [string | null, (sessionUuid: string | null) => void];
  /**
   * The learner's content language for results and AI text (e.g. "es"), resolved the way the host's other
   * catalog features resolve it. Optional: without it the server uses English.
   */
  getContentLocale?: () => string;
}
