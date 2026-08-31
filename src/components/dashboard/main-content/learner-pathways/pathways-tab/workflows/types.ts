import type {
  CareerMatch, LearnerIntent, LearnerProfile, PathwayCourse, PathwayGenerationRequest,
} from '../state';
import type { CourseRetrievalCatalogScope } from '../types';

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
  /**
   * Counts only (never the raw skill names) from the Learning Intent response, exposed
   * purely so analytics can report them without re-deriving or persisting the intent
   * itself — `learnerProfile.skills` is already the deduplicated union of both lists.
   */
  skillsRequiredCount: number;
  skillsPreferredCount: number;
}

/**
 * Explicit pathway-generation input. `request` is the complete, canonical, fingerprinted
 * request (unchanged — `computePathwayInputFingerprint` still hashes only this).
 * `selectedCareer` and `catalogScope` are workflow-only execution inputs, never persisted
 * and never added to the fingerprint: `selectedCareer` is the full domain object Catalog
 * Retrieval and Recommendation Feedback need (the durable request only keeps
 * `selectedCareerId`); `catalogScope` is resolved from React hooks
 * (`useSearchCatalogs`/`useAlgoliaSearch`) by the composition layer, since the workflow
 * itself must stay hook-free.
 */
export interface GeneratePathwayWorkflowInput {
  request: PathwayGenerationRequest;
  selectedCareer: CareerMatch;
  catalogScope: CourseRetrievalCatalogScope;
}

/** Result the controller/container commits atomically via commitPathwayBuild. */
export interface GeneratePathwayWorkflowResult {
  courses: PathwayCourse[];
}

/**
 * Direct-mode generation input. Deliberately carries no `request`/`selectedCareer`:
 * direct mode never produces a `LearnerProfile` or a `CareerMatch`, and there is no
 * `PathwayGenerationRequest` to fingerprint. `enterpriseCustomerUuid` and `catalogScope`
 * are both resolved from React hooks by the composition layer (`usePathwaysController`),
 * since this workflow — like `generatePathwayWorkflow` — must stay hook-free.
 * `catalogScope.searchCatalogs` doubles as the Enterprise Catalog inclusion check's
 * `catalogUuids` (see `enterpriseCatalogInclusion.ts`'s input doc: it must be the
 * `searchCatalogs` UUID space, not the catalog-query-UUID space).
 */
export interface GenerateDirectPathwayWorkflowInput {
  learnerIntent: LearnerIntent;
  enterpriseCustomerUuid: string;
  catalogScope: CourseRetrievalCatalogScope;
}

/**
 * Result the composition layer commits atomically via `commitDirectPathwaySuccess`. Same
 * shape as `GeneratePathwayWorkflowResult` on purpose — the Pathway page consumes one
 * course model regardless of which flow produced it.
 */
export interface GenerateDirectPathwayWorkflowResult {
  courses: PathwayCourse[];
}
