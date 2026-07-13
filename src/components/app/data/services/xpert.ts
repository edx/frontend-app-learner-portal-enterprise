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

/**
 * The selected career target, candidate course keys, and learner-profile context used to
 * generate per-course recommendation reasons.
 *
 * `learnerProfile` carries arbitrary business data, not a fixed schema, so it is passed
 * through verbatim rather than case-converted — see fetchRecommendationFeedback.
 */
export interface RecommendationFeedbackRequest {
  /** The career the learner selected as their target. */
  selectedCareer: string;
  /** Candidate course keys to generate recommendation reasons for, in caller-supplied order. */
  courseKeys: string[];
  /** Arbitrary learner-profile context (goals, background, etc.); passed through unchanged. */
  learnerProfile: Record<string, unknown>;
}

/** Recommendation feedback returned by fetchRecommendationFeedback. */
export interface RecommendationFeedbackResponse {
  /** Reasons keyed by course identifier (dynamic keys, not a fixed schema); passed through verbatim. */
  reasons: Record<string, string>;
}

interface RecommendationFeedbackResponseRaw {
  reasons: Record<string, string>;
}

/**
 * Submits the selected career, candidate course keys, and learner-profile context to
 * Enterprise Access's Recommendation Feedback endpoint
 * (`POST /api/v1/learner-pathways/recommendation-feedback/`) so it can select and run the
 * Recommendation Feedback Xpert prompt server-side.
 *
 * Only the top-level field names (`selectedCareer`, `courseKeys`, `learnerProfile`) are mapped
 * to their snake_case wire names; `learnerProfile` and the returned `reasons` map carry
 * business data with dynamic keys (e.g. course keys), so their contents are passed through
 * verbatim rather than deep-converted. Unlike fetchLearningIntent, this function must not use
 * snakeCaseObject/camelCaseObject on the whole payload/response, since those perform a deep
 * conversion that would mangle those dynamic keys.
 *
 * @param request - The selected career, candidate course keys, and learner-profile context.
 * @returns Recommendation feedback keyed by course identifier.
 * @throws Rejects with the underlying HTTP client's error (e.g. a non-2xx response)
 *   unmodified; this function does not catch or transform errors.
 */
export async function fetchRecommendationFeedback(
  request: RecommendationFeedbackRequest,
): Promise<RecommendationFeedbackResponse> {
  const url = `${getConfig().ENTERPRISE_ACCESS_BASE_URL}${LEARNER_PATHWAYS_BASE_PATH}/recommendation-feedback/`;
  const payload = {
    selected_career: request.selectedCareer,
    course_keys: request.courseKeys,
    learner_profile: request.learnerProfile,
  };
  const response: AxiosResponse<RecommendationFeedbackResponseRaw> = await getAuthenticatedHttpClient()
    .post(url, payload);
  return { reasons: response.data.reasons };
}
