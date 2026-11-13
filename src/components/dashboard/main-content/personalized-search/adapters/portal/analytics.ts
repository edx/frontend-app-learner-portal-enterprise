import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import { PERSONALIZED_SEARCH_EVENTS } from '../../../../../../eventTracking';
import type { EntryPoint, TrackAction, TrackProperties } from '../../core/analytics';

/**
 * Names and sends a Personalized Search usage event through the portal's Segment helper. The
 * properties already carry the enterprise and the join keys; nothing is computed here.
 */
export const trackPersonalizedSearchEvent = (action: TrackAction, properties: TrackProperties) => {
  // The controller sends only with an enterprise and always sets it, and logs a send that throws.
  const enterpriseUuid = properties.enterprise_customer_uuid as string;
  sendEnterpriseTrackEvent(enterpriseUuid, PERSONALIZED_SEARCH_EVENTS[action], properties);
};

/**
 * The dashboard marks a tab chosen in its tab list with navigation state (React Router keeps it in
 * `history.state.usr`). The URL always names the tab, so without that mark the learner arrived by a link.
 */
export const getPortalEntryPoint = (): EntryPoint => (
  window.history.state?.usr?.dashboardTabSource === 'nav_tab' ? 'nav_tab' : 'deep_link'
);
