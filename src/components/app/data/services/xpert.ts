import type { AxiosResponse } from 'axios';
import { getConfig } from '@edx/frontend-platform/config';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { camelCaseObject, snakeCaseObject } from '@edx/frontend-platform/utils';

const LEARNER_PATHWAYS_BASE_PATH = '/api/v1/learner-pathways';

/**
 * Learner intake answers submitted to the Learning Intent endpoint so the backend can infer
 * required/preferred skills and a course search query.
 *
 * All fields are plain strings, not arrays: the backend's LearningIntentRequestSerializer
 * declares each as CharField (allow_blank=False), so an array here fails validation with
 * "Not a valid string."
 */
export interface LearningIntentRequest {
  /** The learner's desired outcome or target goal. */
  selectedGoals: string;
  /** The learner's motivation for learning. */
  freeText: string;
  /** The learner's current role, skills, and relevant experience. */
  knownContext: string;
  /** Industries or fields the learner wants to explore. */
  interestedIndustries: string;
}

export interface LearningIntentResponse {
  skillsRequired: string[];
  skillsPreferred: string[];
  condensedAlgoliaQuery: string;
}

interface LearningIntentResponseRaw {
  skills_required: string[];
  skills_preferred: string[];
  condensed_algolia_query: string;
}

/**
 * Submits the learner's intake answers to Enterprise Access's Learning Intent endpoint
 * (`POST /api/v1/learner-pathways/learning-intent/`) so it can select and run the Learning
 * Intent Xpert prompt server-side. The backend owns prompt selection, execution, and response
 * parsing; this function only converts the camelCase `LearningIntentRequest` into the
 * backend's snake_case request shape and converts the snake_case response back to camelCase,
 * consistent with the rest of the services layer (see bffs.ts).
 *
 * @param request - The learner's intake answers (goal, motivation, background, industries).
 * @returns The inferred required/preferred skills and a condensed Algolia search query.
 * @throws Rejects with the underlying HTTP client's error (e.g. a non-2xx response) unmodified;
 *   this function does not catch or transform errors.
 */
export async function fetchLearningIntent(
  request: LearningIntentRequest,
): Promise<LearningIntentResponse> {
  const url = `${getConfig().ENTERPRISE_ACCESS_BASE_URL}${LEARNER_PATHWAYS_BASE_PATH}/learning-intent/`;
  const payload = snakeCaseObject(request);
  const response: AxiosResponse<LearningIntentResponseRaw> = await getAuthenticatedHttpClient()
    .post(url, payload);
  return camelCaseObject(response.data);
}
