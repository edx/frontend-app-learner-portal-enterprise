import { logError } from '@edx/frontend-platform/logging';

import { createSessionsApi } from '../../core/api/sessions';
import type { PersonalizedSearchDeps } from '../../feature/deps';
import { getPersonalizedSearchApiBaseUrl, getTransportSetting } from './config';
import { getPortalHttpClient } from './http';
import { createPortalItemLinks } from './links';
import { selectTransport } from './selectTransport';
import { useEnterpriseContext } from './useEnterpriseContext';

const apiOptions = { getHttpClient: getPortalHttpClient, getBaseUrl: getPersonalizedSearchApiBaseUrl };

/** The learner portal's implementation of the feature's host dependencies. */
export const portalDeps: PersonalizedSearchDeps = {
  useEnterpriseContext,
  createTransport: () => selectTransport(getTransportSetting()),
  logError,
  createItemLinks: createPortalItemLinks,
  sessionsApi: createSessionsApi(apiOptions),
};
