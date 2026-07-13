import { CAREER_SELECTION_STUB_MATCHES } from '../career-selection/fixtures';
import type { GenerateProfileWorkflowInput, GenerateProfileWorkflowResult } from './types';

/**
 * Integration seam: owns intake/profile-edit -> Learning Intent -> profile mapping.
 *
 * Future flow:
 * 1. Map intake fields (goal, motivation, background, industry) to a
 *    LearningIntentRequest (selectedGoals, freeText, knownContext). This mapping
 *    belongs here, not in the form component or the transport service, and must
 *    follow the production serializer contract rather than copying the
 *    ai-pathways prototype's array-combining approach verbatim.
 * 2. Call fetchLearningIntent (src/components/app/data/services/xpert.ts).
 * 3. Use the returned skillsRequired/skillsPreferred/condensedAlgoliaQuery to
 *    perform career/taxonomy retrieval.
 * 4. Map the results into a LearnerProfile and CareerMatch[] and return them for
 *    the controller to commit to store state.
 *
 * Until that lands, this returns the caller's own (already-merged/edited) profile
 * verbatim alongside the same static stub career matches used elsewhere in the
 * scaffold, so callers have a real, committable result instead of `void`.
 */
export const generateProfileWorkflow = async (
  input: GenerateProfileWorkflowInput,
): Promise<GenerateProfileWorkflowResult> => ({
  learnerProfile: input.learnerProfile,
  careerMatches: CAREER_SELECTION_STUB_MATCHES,
});
