import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import type { HttpClient } from '../../core/http';

/** The learner's authenticated client (JWT cookie, refresh), typed as the core's HTTP port. */
export const getPortalHttpClient = (): HttpClient => getAuthenticatedHttpClient() as unknown as HttpClient;
