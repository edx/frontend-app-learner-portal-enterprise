import type { LearnerIntent, LearnerProfile } from './types';

/**
 * The complete, explicit set of inputs a pathway build/rebuild is generated from.
 * Composed from canonical state — no field is renamed or re-derived from a separate
 * baseline object.
 */
export interface PathwayGenerationRequest {
  learnerIntent: LearnerIntent;
  learnerProfile: LearnerProfile;
  selectedCareerId: string;
  selectedSkills: string[];
}

/**
 * Normalizes a request into a deterministic shape: explicit property order, and
 * `selectedSkills` sorted since skill order isn't semantically meaningful (dismissing
 * and restoring skills in a different order must still fingerprint identically).
 */
const buildNormalizedRequest = (request: PathwayGenerationRequest): PathwayGenerationRequest => ({
  learnerIntent: {
    careerGoal: request.learnerIntent.careerGoal,
    targetIndustry: request.learnerIntent.targetIndustry,
    background: request.learnerIntent.background,
    motivation: request.learnerIntent.motivation,
  },
  learnerProfile: {
    summary: request.learnerProfile.summary,
    learningStyle: request.learnerProfile.learningStyle,
    weeklyTimeCommitment: request.learnerProfile.weeklyTimeCommitment,
    certificatePreference: request.learnerProfile.certificatePreference,
    skills: [...request.learnerProfile.skills].sort(),
  },
  selectedCareerId: request.selectedCareerId,
  selectedSkills: [...request.selectedSkills].sort(),
});

/**
 * Deterministic fingerprint of a `PathwayGenerationRequest`. Two requests that differ
 * only in skill/skills-array order fingerprint identically; any real difference
 * (including a skill selection change) fingerprints differently.
 */
export const computePathwayInputFingerprint = (request: PathwayGenerationRequest): string => (
  JSON.stringify(buildNormalizedRequest(request))
);
