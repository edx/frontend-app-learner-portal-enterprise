import { logError } from '@edx/frontend-platform/logging';

import { fetchRecommendationFeedback } from '../../../../../app/data/services';
import { mapAlgoliaHitToPathwayCourse, searchLearnerPathwaysCourses } from '../services/catalogCourseSearch';
import { buildRecommendationProfile } from './mappers';
import type { GeneratePathwayWorkflowInput, GeneratePathwayWorkflowResult } from './types';

const dedupe = (values: string[]): string[] => Array.from(new Set(values));

/**
 * Integration seam: owns selected-career -> catalog course search -> Recommendation
 * Feedback -> enriched PathwayCourse[] mapping.
 *
 * Flow:
 * 1. Build course-search optional skill signals from visibleSkills (the learner's
 *    dismissal-filtered skill list) plus Learning Intent's required/preferred
 *    skills — NOT selectedCareer.skillsToDevelop directly, so that dismissing a
 *    skill in the UI actually affects the query.
 * 2. Search the catalog index with selectedCareer.title as the query.
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
  const optionalSkills = dedupe([
    ...visibleSkills,
    ...(learningIntent?.skillsRequired ?? []),
    ...(learningIntent?.skillsPreferred ?? []),
  ]);

  const courseHits = await searchLearnerPathwaysCourses({
    index: catalogIndex,
    query: selectedCareer.title,
    optionalSkills,
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
