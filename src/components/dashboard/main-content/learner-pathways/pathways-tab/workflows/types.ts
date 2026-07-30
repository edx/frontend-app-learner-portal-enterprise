import type { SearchIndex } from 'algoliasearch/lite';
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
 * Explicit pathway-generation input. `request` is the complete, canonical, fingerprinted
 * request (unchanged — `computePathwayInputFingerprint` still hashes only this).
 * `selectedCareer` and `index` are workflow-only execution inputs, never persisted and
 * never added to the fingerprint: `selectedCareer` is the full domain object Catalog
 * Retrieval and Recommendation Feedback need (the durable request only keeps
 * `selectedCareerId`); `index` is the secured, catalog-scoped Algolia course index
 * resolved from React hooks (`useAlgoliaSearch`) by the composition layer, since the
 * workflow itself must stay hook-free. Catalog scoping is enforced server-side by the
 * secured API key baked into this index, so the workflow never builds its own
 * catalog-scope filter.
 */
export interface GeneratePathwayWorkflowInput {
  request: PathwayGenerationRequest;
  selectedCareer: CareerMatch;
  index: SearchIndex;
}

/** Result the controller/container commits atomically via commitPathwayBuild. */
export interface GeneratePathwayWorkflowResult {
  courses: PathwayCourse[];
}
