import type { CareerMatch, LearnerProfile } from '../state';

/**
 * Explicit profile-generation input: the caller (CareerSelectionContainer) computes
 * the merged/edited profile; the workflow owns turning it into a committable result
 * (currently a stub passthrough — see generateProfileWorkflow.ts).
 */
export interface GenerateProfileWorkflowInput {
  learnerProfile: LearnerProfile;
}

/** Result the controller/container commits atomically via commitProfileSuccess. */
export interface GenerateProfileWorkflowResult {
  learnerProfile: LearnerProfile;
  careerMatches: CareerMatch[];
}

/**
 * Workflow-layer placeholder input for pathway generation.
 * Payload contract will be finalized when service integration lands.
 */
export interface GeneratePathwayWorkflowInput {
  payload?: Record<string, unknown>;
}
