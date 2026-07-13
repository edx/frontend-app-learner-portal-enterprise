import { logError } from '@edx/frontend-platform/logging';

import { fetchRecommendationFeedback } from '../../../../../app/data/services';
import { mapAlgoliaHitToPathwayCourse, searchLearnerPathwaysCourses } from '../services/catalogCourseSearch';
import { buildCourseSearchQuery, buildRecommendationProfile } from './mappers';
import type { GeneratePathwayWorkflowInput, GeneratePathwayWorkflowResult } from './types';

const dedupe = (values: string[]): string[] => Array.from(new Set(values));

/**
 * Integration seam: owns selected-career -> catalog course search -> Recommendation
 * Feedback -> enriched PathwayCourse[] mapping.
 *
 * Flow:
 * 1. Split course-search skill signals into a strict list (Learning Intent's
 *    required skills — the learner's stated must-haves) and a boost list
 *    (visibleSkills, the learner's dismissal-filtered "skills to develop"
 *    list, plus Learning Intent's preferred skills) — NOT
 *    selectedCareer.skillsToDevelop directly, so that dismissing a skill in
 *    the UI actually affects the query. This mirrors ai-pathways' broad-anchor
 *    (hard facetFilters) vs narrow-signal (soft optionalFilters) split; a
 *    skill in both lists counts only as strict, since a hard filter already
 *    covers it.
 * 2. Derive a skill-anchored query via buildCourseSearchQuery (top strict
 *    skills, lowercased and joined, falling back to selectedCareer.title,
 *    with the career title carried as a query alternate when the two
 *    differ), then run it through the catalog service's multi-step retrieval
 *    ladder (hybrid skill+text search -> boosted text fallback -> career-text
 *    fallback across query alternates -> scope-only fallback), which
 *    reranks the first two steps' hits by strict/boost skill match count —
 *    a port of ai-pathways' proven course-retrieval approach.
 * 3. Zero hits is a valid, successful empty result — return immediately without
 *    calling Recommendation Feedback (the backend rejects an empty course_keys
 *    list).
 * 4. Map hits to PathwayCourse[], reading hit.key (not objectID) as the stable
 *    courseKey join field. Hits with a falsy key are dropped and logged (documents
 *    the malformed hit rather than silently substituting objectID); if literally
 *    every hit lacks a key, that's a data-quality problem worth surfacing, so throw.
 * 5. Call fetchRecommendationFeedback with a deliberate learner-profile projection
 *    (see mappers.ts), sending only the valid course keys.
 * 6. Merge reasons[courseKey] into each course's whyThisFitsYou (joined by key,
 *    not array position).
 *
 * This workflow owns ordering, projection, and joining; the application service
 * owns only HTTP transport.
 */
export const generatePathwayWorkflow = async (
  {
    selectedCareer, learnerProfile, learningIntent, visibleSkills, catalogIndex,
  }: GeneratePathwayWorkflowInput,
): Promise<GeneratePathwayWorkflowResult> => {
  const strictSkills = dedupe(learningIntent?.skillsRequired ?? []);
  const boostSkills = dedupe([
    ...visibleSkills,
    ...(learningIntent?.skillsPreferred ?? []),
  ]).filter((skill) => !strictSkills.includes(skill));

  const { query, queryAlternates } = buildCourseSearchQuery({
    strictSkills,
    careerTitle: selectedCareer.title,
  });

  const courseHits = await searchLearnerPathwaysCourses({
    index: catalogIndex,
    query,
    queryAlternates,
    strictSkills,
    boostSkills,
  });

  if (courseHits.length === 0) {
    return { courses: [] };
  }

  const mappedCourses = courseHits.map(mapAlgoliaHitToPathwayCourse);
  const validCourses = mappedCourses.filter((course) => Boolean(course.courseKey));
  const droppedCourses = mappedCourses.filter((course) => !course.courseKey);
  droppedCourses.forEach((course) => {
    logError(`Dropping course missing a stable catalog key from Recommendation Feedback: id="${course.id}" title="${course.title}"`);
  });

  if (validCourses.length === 0) {
    throw new Error('All course results are missing a stable catalog key; cannot request Recommendation Feedback.');
  }

  const feedback = await fetchRecommendationFeedback({
    selectedCareer: selectedCareer.title,
    courseKeys: validCourses.map((course) => course.courseKey as string),
    learnerProfile: buildRecommendationProfile({ learnerProfile, learningIntent, selectedCareer }),
  });

  const enrichedCourses = validCourses.map((course) => ({
    ...course,
    whyThisFitsYou: feedback.reasons[course.courseKey as string],
  }));

  return { courses: enrichedCourses };
};
