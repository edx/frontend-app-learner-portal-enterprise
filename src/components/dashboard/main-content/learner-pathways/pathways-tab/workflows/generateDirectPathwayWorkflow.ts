import { fetchRecommendationFeedback } from '../../../../../app/data/services/xpert';
import {
  directCourseKeyRetrievalService,
  fetchCourseMetadataByKeys,
  filterCourseKeysByEnterpriseCatalog,
  getCourseAlgoliaIndex,
  searchCoursesBySkillFallback,
} from '../services';
import type { LearnerIntent, PathwayCourse } from '../state';
import type {
  GenerateDirectPathwayWorkflowInput,
  GenerateDirectPathwayWorkflowResult,
} from './types';

/**
 * How many courses a direct-mode Pathway actually shows the learner. Distinct from
 * `DIRECT_COURSE_CANDIDATE_LIMIT` (20, the upstream Xpert candidate pool) and unrelated
 * to the career flow's own private retrieval caps in `services/courseRetrieval.ts` —
 * applied *after* Enterprise Catalog inclusion, so the five courses shown are five
 * catalog-eligible ones rather than five candidates that might mostly be filtered out.
 */
export const DIRECT_PATHWAY_COURSE_LIMIT = 5;

/**
 * Requests Recommendation Feedback for a hydrated course list and joins each course's
 * reason back onto it. Shared by both the grounded-key and Algolia-skills-fallback
 * branches below so they end identically instead of duplicating this join.
 */
const enrichWithFeedback = async (
  courses: PathwayCourse[],
  learnerIntent: LearnerIntent,
): Promise<GenerateDirectPathwayWorkflowResult> => {
  const feedback = await fetchRecommendationFeedback({
    selectedCareer: learnerIntent.careerGoal,
    courseKeys: courses.map((course) => course.courseKey),
    // Field-by-field rather than a spread, so a future `LearnerIntent` field can never
    // silently start being sent to Recommendation Feedback.
    learnerProfile: {
      careerGoal: learnerIntent.careerGoal,
      targetIndustry: learnerIntent.targetIndustry,
      background: learnerIntent.background,
      motivation: learnerIntent.motivation,
    },
  });

  const enrichedCourses: PathwayCourse[] = courses.map((course) => {
    const reason = feedback.reasons[course.courseKey];
    return reason ? { ...course, whyThisFitsYou: reason } : course;
  });

  return { courses: enrichedCourses };
};

/**
 * Direct-mode integration seam: learner intent -> Xpert/Discovery course keys (or an
 * Algolia skills fallback) -> Enterprise Catalog inclusion / Algolia skills retrieval ->
 * Algolia metadata hydration -> Recommendation Feedback -> enriched `PathwayCourse[]`.
 * Career Profile generation is never involved: no `LearnerProfile`, no `CareerMatch`,
 * and none of `fetchLearningIntent`, `careerRetrievalService`, `courseRetrievalService`,
 * or `generatePathwayWorkflow` is reachable from here.
 *
 * A linear `async` sequence with no defensive `catch` (mirrors `generatePathwayWorkflow`):
 * a rejection at any step propagates untouched, before the next step is ever called. Each
 * early return is *not* an error — it is an ordinary "this request legitimately matched
 * nothing" outcome, and guarantees zero further calls.
 *
 * Ordering is preserved end to end for the grounded-key path: the catalog filter returns
 * the eligible subset in candidate order, the five-course cap slices that ordered subset,
 * and Algolia hydration preserves input key order. Recommendation Feedback only ever sees
 * keys that are both catalog-eligible *and* successfully hydrated (`courses`, not the
 * requested five) — never a candidate or unresolved key.
 */
export const generateDirectPathwayWorkflow = async (
  { learnerIntent, enterpriseCustomerUuid, catalogScope }: GenerateDirectPathwayWorkflowInput,
): Promise<GenerateDirectPathwayWorkflowResult> => {
  const result = await directCourseKeyRetrievalService.retrieveCourseKeys(learnerIntent);

  if (result.retrievalStrategy === 'algolia_skills_fallback') {
    // Resolved only inside this branch so the grounded-key path below touches no
    // Algolia configuration until it actually needs to.
    const index = getCourseAlgoliaIndex();
    const courses = await searchCoursesBySkillFallback({ index, fallback: result.fallback, catalogScope });
    if (courses.length === 0) {
      return { courses: [] };
    }
    return enrichWithFeedback(courses, learnerIntent);
  }

  const { courseKeys: candidateCourseKeys } = result;
  if (candidateCourseKeys.length === 0) {
    return { courses: [] };
  }

  // Every candidate is checked, uncapped: capping first would waste eligible courses
  // whenever the top five candidates happen to be outside the customer's catalogs.
  const eligibleCourseKeys = await filterCourseKeysByEnterpriseCatalog({
    enterpriseCustomerUuid,
    catalogUuids: catalogScope.searchCatalogs,
    candidateCourseKeys,
  });
  if (eligibleCourseKeys.length === 0) {
    return { courses: [] };
  }

  // Resolved here rather than at the top of the function so the short-circuits above
  // touch no Algolia configuration at all.
  const index = getCourseAlgoliaIndex();
  const courses = await fetchCourseMetadataByKeys({
    index,
    courseKeys: eligibleCourseKeys.slice(0, DIRECT_PATHWAY_COURSE_LIMIT),
    catalogScope,
  });
  if (courses.length === 0) {
    return { courses: [] };
  }

  return enrichWithFeedback(courses, learnerIntent);
};
