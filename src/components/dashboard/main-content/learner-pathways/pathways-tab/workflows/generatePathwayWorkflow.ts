import { fetchRecommendationFeedback } from '../../../../../app/data/services/xpert';
import { courseRetrievalService } from '../services';
import { normalizeSkillsList } from '../state';
import type { CareerMatch, PathwayCourse, PathwayGenerationRequest } from '../state';
import type { CourseSearchIntentSignal, CourseSearchSelectedCareer } from '../types';
import type { GeneratePathwayWorkflowInput, GeneratePathwayWorkflowResult } from './types';

/**
 * Course-retrieval career projection, driven by the learner-*approved* skill selection
 * (`request.selectedSkills`) rather than `selectedCareer.skillsToDevelop` (the full
 * recommended list) — a skill the learner has dismissed must not silently reappear as a
 * course-search signal.
 */
const buildCourseSearchCareer = (
  selectedCareer: CareerMatch,
  request: PathwayGenerationRequest,
): CourseSearchSelectedCareer => ({
  title: selectedCareer.title,
  skillsToDevelop: normalizeSkillsList(request.selectedSkills),
});

/**
 * Deliberate adapter, not a reconstructed `CareerSearchIntent`: the real normalized
 * Learning Intent (`condensedAlgoliaQuery`, etc.) doesn't survive past profile
 * generation, and `courseRetrievalService` only ever reads `skillsRequired`/
 * `skillsPreferred`/`learnerLevel` (see `CourseSearchIntentSignal`). Built entirely from
 * data that genuinely exists in the durable request: the learner-approved selected
 * skills are the strongest (required) signal; the generated profile's skills, minus
 * whatever's already selected, are the supporting (preferred) signal. `learnerLevel` is
 * omitted — no canonical source for it exists anywhere in durable state today, and it
 * must not be fabricated from `learningStyle`/`weeklyTimeCommitment`.
 */
const buildCourseSearchIntent = (request: PathwayGenerationRequest): CourseSearchIntentSignal => {
  const skillsRequired = normalizeSkillsList(request.selectedSkills);
  const requiredLookup = new Set(skillsRequired.map((skill) => skill.toLowerCase()));
  const skillsPreferred = normalizeSkillsList(request.learnerProfile.skills)
    .filter((skill) => !requiredLookup.has(skill.toLowerCase()));

  return { skillsRequired, skillsPreferred };
};

/**
 * Integration seam: selected career -> Catalog Retrieval -> Recommendation Feedback ->
 * enriched `PathwayCourse[]`. A linear `async` sequence with no defensive `catch` (mirrors
 * `generateProfileWorkflow`'s convention) — a Catalog Retrieval rejection propagates
 * before Recommendation Feedback is ever called, and a Recommendation Feedback rejection
 * propagates rather than falling back to unenriched courses.
 *
 * `index` — the secured, catalog-scoped Algolia course index — is supplied by the
 * composition layer (`usePathwaysController`, which resolves it via `useAlgoliaSearch`)
 * since this workflow must stay hook-free.
 */
export const generatePathwayWorkflow = async (
  { request, selectedCareer, index }: GeneratePathwayWorkflowInput,
): Promise<GeneratePathwayWorkflowResult> => {
  const courses = await courseRetrievalService.searchCourses(index, {
    selectedCareer: buildCourseSearchCareer(selectedCareer, request),
    intent: buildCourseSearchIntent(request),
  });

  if (courses.length === 0) {
    return { courses: [] };
  }

  const courseKeys = courses.map((course) => course.courseKey);
  const feedback = await fetchRecommendationFeedback({
    selectedCareer: selectedCareer.title,
    courseKeys,
    learnerProfile: { ...request.learnerProfile },
  });

  const enrichedCourses: PathwayCourse[] = courses.map((course) => {
    const reason = feedback.reasons[course.courseKey];
    return reason ? { ...course, whyThisFitsYou: reason } : course;
  });

  return { courses: enrichedCourses };
};
