import type { GeneratePathwayWorkflowInput } from './types';

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
 */
export const generatePathwayWorkflow = async (
  input?: GeneratePathwayWorkflowInput,
): Promise<void> => {
  if (input?.payload) {
    // Placeholder read to keep scaffold contracts explicit until workflow implementation.
  }
  // TODO: Implement workflow orchestration in a dedicated follow-up ticket.
};
