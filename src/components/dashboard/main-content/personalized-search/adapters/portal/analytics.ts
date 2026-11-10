import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';

import { PERSONALIZED_SEARCH_EVENTS } from '../../../../../../eventTracking';
import type { TrackAction, TrackProperties } from '../../core/analytics';

/**
 * Names and sends a Personalized Search usage event through the portal's Segment helper. The
 * properties already carry the enterprise and the join keys; nothing is computed here.
 */
export const trackPersonalizedSearchEvent = (action: TrackAction, properties: TrackProperties) => {
  const enterpriseUuid = properties.enterprise_customer_uuid;
  if (typeof enterpriseUuid !== 'string' || !enterpriseUuid) { return; }
  try {
    sendEnterpriseTrackEvent(enterpriseUuid, PERSONALIZED_SEARCH_EVENTS[action], properties);
  } catch {
    // Usage events never get in the learner's way.
  }
};

/** A deep link names the tab in the URL; otherwise the learner chose it in the dashboard tabs. */
export const getPortalEntryPoint = (): string => (
  new URLSearchParams(window.location.search).get('tab') === 'personalized-search' ? 'deep_link' : 'nav_tab'
);
