import type { AxiosResponse } from 'axios';
import { getConfig } from '@edx/frontend-platform/config';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { camelCaseObject, snakeCaseObject } from '@edx/frontend-platform/utils';
import type { LearnerIntent } from '../../../dashboard/main-content/learner-pathways/pathways-tab/state';

const LEARNER_PATHWAYS_BASE_PATH = '/api/v1/learner-pathways';
const LEARNING_INTENT_API_PATH = `${LEARNER_PATHWAYS_BASE_PATH}/learning-intent/`;
const RECOMMENDATIONS_FEEDBACK_API_PATH = `${LEARNER_PATHWAYS_BASE_PATH}/recommendation-feedback/`;

/**
 * Public request shape for `fetchLearningIntent` is the same canonical `LearnerIntent`
 * used by RHF/Zustand/persistence — no separate, differently-named request type exists
 * at this layer. The backend's fixed wire contract (`selected_goals`/`free_text`/
 * `known_context`/`interested_industries`) is reached only inside
 * `toLearningIntentWireRequest` below, a single private adapter kept out of the public
 * API so no other module ever needs to know those wire names.
 */
export type LearningIntentRequest = LearnerIntent;

/**
 * The backend's LearningIntentRequestSerializer declares each field as CharField
 * (allow_blank=False), so an array here fails validation with "Not a valid string."
 */
interface LearningIntentWireRequest {
  /** The learner's desired outcome or target goal. */
  selectedGoals: string;
  /** The learner's motivation for learning. */
  freeText: string;
  /** The learner's current role, skills, and relevant experience. */
  knownContext: string;
  /** Industries or fields the learner wants to explore. */
  interestedIndustries: string;
}

/**
 * The one private adapter permitted between the canonical `LearnerIntent` contract and
 * the backend's fixed, differently-named wire contract. Not exported — no other module
 * may perform this mapping.
 */
const toLearningIntentWireRequest = (request: LearningIntentRequest): LearningIntentWireRequest => ({
  selectedGoals: request.careerGoal,
  freeText: request.motivation,
  knownContext: request.background,
  interestedIndustries: request.targetIndustry,
});

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
 * parsing; this function maps the canonical `LearnerIntent` to the backend's fixed wire field
 * names via `toLearningIntentWireRequest`, then converts the whole payload to snake_case (and
 * the response back to camelCase), consistent with the rest of the services layer (see
 * bffs.ts).
 *
 * @param request - The learner's canonical intent (career goal, target industry, background,
 *   motivation).
 * @returns The inferred required/preferred skills and a condensed Algolia search query.
 * @throws Rejects with the underlying HTTP client's error (e.g. a non-2xx response) unmodified;
 *   this function does not catch or transform errors.
 */
export async function fetchLearningIntent(
  request: LearningIntentRequest,
): Promise<LearningIntentResponse> {
  const url = `${getConfig().ENTERPRISE_ACCESS_BASE_URL}${LEARNING_INTENT_API_PATH}`;
  const payload = snakeCaseObject(toLearningIntentWireRequest(request));
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
  const url = `${getConfig().ENTERPRISE_ACCESS_BASE_URL}${RECOMMENDATIONS_FEEDBACK_API_PATH}`;
  const payload = {
    selected_career: request.selectedCareer,
    course_keys: request.courseKeys,
    learner_profile: request.learnerProfile,
  };
  const response: AxiosResponse<RecommendationFeedbackResponseRaw> = await getAuthenticatedHttpClient()
    .post(url, payload);
  return { reasons: response.data.reasons };
}
