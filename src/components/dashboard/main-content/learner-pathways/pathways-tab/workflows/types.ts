import type {
  CareerMatch, LearnerIntent, LearnerProfile, PathwayCourse, PathwayGenerationRequest,
} from '../state';

/**
 * Explicit profile-generation input: the canonical learner intent, unmapped and
 * unrenamed. The workflow owns turning it into a committable result (currently a stub
 * — see generateProfileWorkflow.ts).
 */
export type GenerateProfileWorkflowInput = LearnerIntent;

/** Result the controller/container commits atomically via commitProfileSuccess. */
export interface GenerateProfileWorkflowResult {
  learnerProfile: LearnerProfile;
  careerMatches: CareerMatch[];
}

/**
 * Explicit pathway-generation input: the complete, canonical request the pathway is
 * built from — the same shape whose fingerprint gets stored via commitPathwayBuild.
 */
export type GeneratePathwayWorkflowInput = PathwayGenerationRequest;

/** Result the controller/container commits atomically via commitPathwayBuild. */
export interface GeneratePathwayWorkflowResult {
  courses: PathwayCourse[];
}
