import { PATHWAY_COURSES_STUB } from '../pathway-courses/fixtures';
import type { GeneratePathwayWorkflowInput, GeneratePathwayWorkflowResult } from './types';

/**
 * Integration seam: owns selected-career -> course retrieval -> Recommendation
 * Feedback -> enriched PathwayCourse[] mapping.
 *
 * Future flow:
 * 1. Build an Algolia course query from the selected career, learner profile,
 *    and skill signals.
 * 2. Retrieve candidate course hits and normalize to PathwayCourse[], reading
 *    hit.key (not objectID) as the stable courseKey join field.
 * 3. Call fetchRecommendationFeedback({ selectedCareer, courseKeys, learnerProfile })
 *    (src/components/app/data/services/xpert.ts), sending a deliberate
 *    learner-profile projection rather than the entire Zustand store.
 * 4. Merge reasons[courseKey] into each course's whyThisFitsYou.
 * 5. Return the enriched courses and progress for the controller to commit.
 *
 * This workflow owns ordering, projection, and joining; the application
 * service owns only HTTP transport.
 *
 * Until that lands, this returns the same static stub course set used elsewhere in
 * the scaffold (input is accepted for the future contract but not yet used), each
 * course already carrying a `courseKey` and stand-in `whyThisFitsYou` content.
 */
export const generatePathwayWorkflow = async (
  input: GeneratePathwayWorkflowInput,
): Promise<GeneratePathwayWorkflowResult> => {
  if (input.selectedCareer) {
    // Placeholder read to keep the explicit input contract enforced until the
    // real Algolia/Recommendation Feedback orchestration lands.
  }
  return { courses: PATHWAY_COURSES_STUB };
};
