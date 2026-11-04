import { logError } from '@edx/frontend-platform/logging';

import type { PersonalizedSearchDeps } from '../../feature/deps';
import { getTransportSetting } from './config';
import { createPortalItemLinks } from './links';
import { selectTransport } from './selectTransport';
import { useEnterpriseContext } from './useEnterpriseContext';

/** The learner portal's implementation of the feature's host dependencies. */
export const portalDeps: PersonalizedSearchDeps = {
  useEnterpriseContext,
  createTransport: () => selectTransport(getTransportSetting()),
  logError,
  createItemLinks: createPortalItemLinks,
};
