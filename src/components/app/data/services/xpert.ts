import type { AxiosResponse } from 'axios';
import { getConfig } from '@edx/frontend-platform/config';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

const LEARNER_PATHWAYS_BASE_PATH = '/api/v1/learner-pathways';

// selectedGoals/knownContext are plain strings, not arrays: the backend's
// LearningIntentRequestSerializer declares both as CharField (allow_blank=False),
// so an array here fails validation with "Not a valid string."
export interface LearningIntentRequest {
  selectedGoals: string;
  freeText: string;
  knownContext: string;
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
 * Submits onboarding/profile-edit signals to Enterprise Access so it can select and run the
 * Learning Intent Xpert prompt server-side. The backend owns prompt selection, execution, and
 * response parsing; this function only performs transport and explicit top-level field mapping.
 */
export async function fetchLearningIntent(
  request: LearningIntentRequest,
): Promise<LearningIntentResponse> {
  // Trailing slash required: enterprise-access registers this action on a DRF
  // DefaultRouter with the default trailing_slash=True, so the real route is
  // `learner-pathways/learning-intent/`. Omitting the slash triggers Django's
  // APPEND_SLASH redirect, which downgrades the POST to a GET and the view
  // rejects with a 405.
  const url = `${getConfig().ENTERPRISE_ACCESS_BASE_URL}${LEARNER_PATHWAYS_BASE_PATH}/learning-intent/`;
  const payload = {
    selected_goals: request.selectedGoals,
    free_text: request.freeText,
    known_context: request.knownContext,
  };
  const response: AxiosResponse<LearningIntentResponseRaw> = await getAuthenticatedHttpClient()
    .post(url, payload);
  return {
    skillsRequired: response.data.skills_required,
    skillsPreferred: response.data.skills_preferred,
    condensedAlgoliaQuery: response.data.condensed_algolia_query,
  };
}

export interface RecommendationFeedbackRequest {
  selectedCareer: string;
  courseKeys: string[];
  learnerProfile: Record<string, unknown>;
}

export interface RecommendationFeedbackResponse {
  reasons: Record<string, string>;
}

interface RecommendationFeedbackResponseRaw {
  reasons: Record<string, string>;
}

/**
 * Submits the selected career, candidate course keys, and learner-profile context to
 * Enterprise Access so it can run the Recommendation Feedback Xpert prompt server-side.
 * `learnerProfile` and the returned `reasons` map carry business data with dynamic keys
 * (course keys), so they are passed through as-is rather than deep-transformed.
 */
export async function fetchRecommendationFeedback(
  request: RecommendationFeedbackRequest,
): Promise<RecommendationFeedbackResponse> {
  const url = `${getConfig().ENTERPRISE_ACCESS_BASE_URL}${LEARNER_PATHWAYS_BASE_PATH}/recommendation-feedback`;
  const payload = {
    selected_career: request.selectedCareer,
    course_keys: request.courseKeys,
    learner_profile: request.learnerProfile,
  };
  const response: AxiosResponse<RecommendationFeedbackResponseRaw> = await getAuthenticatedHttpClient()
    .post(url, payload);
  return { reasons: response.data.reasons };
}
