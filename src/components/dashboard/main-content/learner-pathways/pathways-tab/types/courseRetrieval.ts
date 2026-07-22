import type { CareerMatch } from '../state';
import type { CareerSearchIntent } from './careerRetrieval';

/**
 * The subset of a selected `CareerMatch` course retrieval needs: the title (text-query
 * fallback) and the skills the learner is developing toward it (boost signal).
 */
export type CourseSearchSelectedCareer = Pick<CareerMatch, 'title' | 'skillsToDevelop'>;

/**
 * The subset of `CareerSearchIntent` course retrieval actually consumes: required/broad
 * skill signals, preferred/boost skill signals, and the optional learner-level rerank
 * signal. Deliberately narrower than the full `CareerSearchIntent` — that type's other
 * fields (`condensedAlgoliaQuery`, `roles`, `industries`, `jobSources`, `timeCommitment`,
 * `excludeTags`) are never read by `courseRetrievalService`/`catalogSkillTranslation`, and
 * `condensedAlgoliaQuery` is *required* on the full type, which would force any caller
 * without a genuine normalized Learning Intent (e.g. the pathway-generation workflow,
 * where it's already been discarded after profile generation) to fabricate a placeholder
 * value just to satisfy the type.
 */
export type CourseSearchIntentSignal = Pick<CareerSearchIntent, 'skillsRequired' | 'skillsPreferred' | 'learnerLevel'>;

export interface CourseSearchOptions {
  selectedCareer: CourseSearchSelectedCareer;
  intent: CourseSearchIntentSignal;
}

/**
 * Facet vocabulary snapshot from the course catalog index, used to ground taxonomy/intent
 * skill signals against catalog-valid terms before they become filters. Catalog scoping
 * itself is enforced server-side by the secured Algolia API key, not by this snapshot.
 * All three groups are always arrays (never undefined), even when Algolia returns no
 * values for a given facet.
 */
export interface CatalogFacetSnapshot {
  skill_names: string[];
  'skills.name': string[];
  subjects: string[];
}
