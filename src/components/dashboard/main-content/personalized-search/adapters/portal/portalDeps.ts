import { logError } from '@edx/frontend-platform/logging';

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
};
