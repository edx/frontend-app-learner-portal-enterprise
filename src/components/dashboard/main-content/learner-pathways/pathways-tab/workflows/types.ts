import type { CareerMatch, LearnerProfile, PathwayCourse } from '../state';

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
 * Explicit pathway-generation input: the caller computes the current profile,
 * selected career, and effective skills; the workflow owns turning them into a
 * committable course result (currently a stub — see generatePathwayWorkflow.ts).
 */
export interface GeneratePathwayWorkflowInput {
  learnerProfile: LearnerProfile;
  selectedCareer: CareerMatch;
  skillsToDevelop: string[];
}

/** Result the controller/container commits atomically via commitPathwayBuild. */
export interface GeneratePathwayWorkflowResult {
  courses: PathwayCourse[];
}
