import { CAREER_SELECTION_STUB_MATCHES, CAREER_SELECTION_STUB_PROFILE } from '../career-selection/fixtures';
import type { GenerateProfileWorkflowInput, GenerateProfileWorkflowResult } from './types';

/**
 * Integration seam: owns learner intent -> Learning Intent -> profile mapping.
 *
 * Future flow:
 * 1. Call fetchLearningIntent (src/components/app/data/services/xpert.ts) with the
 *    canonical LearnerIntent input directly — no field renaming happens here; the
 *    wire-shape translation is a single private adapter inside xpert.ts.
 * 2. Use the returned skillsRequired/skillsPreferred/condensedAlgoliaQuery to
 *    perform career/taxonomy retrieval.
 * 3. Map the results into a LearnerProfile and CareerMatch[] and return them for
 *    the controller to commit to store state.
 *
 * Until that lands, this returns a static stub-generated profile (no field of the
 * input intent is copied into it — LearnerProfile no longer carries intent fields at
 * all) alongside the same static stub career matches used elsewhere in the scaffold,
 * so callers have a real, committable result instead of `void`. `input` is accepted
 * for the future contract but not yet used.
 */
export const generateProfileWorkflow = async (
  input: GenerateProfileWorkflowInput,
): Promise<GenerateProfileWorkflowResult> => {
  if (input) {
    // Placeholder read to keep the explicit input contract enforced until the
    // real Learning Intent orchestration lands.
  }
  return {
    learnerProfile: CAREER_SELECTION_STUB_PROFILE,
    careerMatches: CAREER_SELECTION_STUB_MATCHES,
  };
};
