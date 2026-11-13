import { getLoginRedirectUrl } from '@edx/frontend-platform/auth';
import { logError } from '@edx/frontend-platform/logging';
import { getProxyLoginUrl } from '@2uinc/frontend-enterprise-logistration';

import { getPathwaysSupportedLocale } from '../../../../../app/data';

import { createDebugApi } from '../../core/api/debug';
import { createFeedbackApi } from '../../core/api/feedback';
import { createSessionsApi } from '../../core/api/sessions';
import { SseChatTransport } from '../../core/transports/SseChatTransport';
import type { PersonalizedSearchDeps } from '../../feature/deps';
import { getPersonalizedSearchApiBaseUrl, getTransportSetting } from './config';
import { getPortalHttpClient } from './http';
import { createPortalItemLinks } from './links';
import { selectTransport } from './selectTransport';
import { useDebugRequested } from './useDebugRequested';
import { useEnterpriseContext } from './useEnterpriseContext';
import { getPortalEntryPoint, trackPersonalizedSearchEvent } from './analytics';
import { useSessionParam } from './useSessionParam';

const apiOptions = { getHttpClient: getPortalHttpClient, getBaseUrl: getPersonalizedSearchApiBaseUrl };
const debugApi = createDebugApi(apiOptions);

/** The learner portal's implementation of the feature's host dependencies. */
export const portalDeps: PersonalizedSearchDeps = {
  useEnterpriseContext,
  createTransport: (getDebugOverrides) => selectTransport(getTransportSetting(), getDebugOverrides),
  logError,
  createItemLinks: createPortalItemLinks,
  sessionsApi: createSessionsApi(apiOptions),
  feedbackApi: createFeedbackApi(apiOptions),
  debug: {
    useDebugRequested,
    createLiveTransport: (getDebugOverrides) => new SseChatTransport({ ...apiOptions, getDebugOverrides }),
    getApiBaseUrl: getPersonalizedSearchApiBaseUrl,
    fetchDebugConfig: debugApi.fetchDebugConfig,
  },
  trackEvent: trackPersonalizedSearchEvent,
  getEntryPoint: getPortalEntryPoint,
  useSessionParam,
  // The same locale Learner Pathways searches in: the learner's portal language when the MFE's
  // SUPPORTED_ALGOLIA_LANGUAGE_FILTERS lists it, otherwise English.
  getContentLocale: getPathwaysSupportedLocale,
  // The same login the route loaders send a signed-out learner to: the enterprise's proxy login (its SSO, when
  // it has one), returning to the current page.
  getSignInUrl: (enterpriseSlug) => (
    enterpriseSlug ? getProxyLoginUrl(enterpriseSlug) : getLoginRedirectUrl(global.location.href)
  ),
};
