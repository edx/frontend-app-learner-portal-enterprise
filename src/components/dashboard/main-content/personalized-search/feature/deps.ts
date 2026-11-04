import type { FeedbackApiClient } from '../core/api/feedback';
import type { SessionsApi } from '../core/api/sessions';
import type { ChatTransport } from '../core/transports/ChatTransport';
import type { ItemLinks } from '../ui/cards/EditorialItemCard';

/** The enterprise the learner is in, as the host knows it. */
export interface EnterpriseContext {
  uuid?: string;
  slug?: string;
}

/**
 * Everything the Personalized Search feature needs from its host (KD-10). The learner portal's
 * implementation is `adapters/portal/portalDeps`; another host supplies its own.
 */
export interface PersonalizedSearchDeps {
  /** A React hook returning the learner's current enterprise. */
  useEnterpriseContext: () => EnterpriseContext;
  /** The transport for turns, chosen from host config. */
  createTransport: () => ChatTransport;
  logError: (error: unknown) => void;
  /** Course and program links for the learner's enterprise. */
  createItemLinks: (enterpriseSlug: string) => ItemLinks;
  sessionsApi: SessionsApi;
  feedbackApi: FeedbackApiClient;
}
