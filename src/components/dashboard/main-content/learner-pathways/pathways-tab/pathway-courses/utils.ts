import type { PathwayCourse, PathwayProgress } from '../state';
import { PATHWAY_COURSES_STUB } from './fixtures';

/**
 * Selects the courses to display in the pathway courses table.
 *
 * A successful build now always commits real courses into `pathwayCourses`
 * (see CareerSelectionContainer.tsx:buildPathway), so `storeCourses` is empty here
 * only in the defensive edge case of the Pathway section being reached without one
 * (e.g. a stale bookmark) — this never gets persisted itself, it's a render-time
 * fallback only.
 */
export const getDisplayedPathwayCourses = (storeCourses: PathwayCourse[]): PathwayCourse[] => (
  storeCourses.length > 0 ? storeCourses : PATHWAY_COURSES_STUB
);

/**
 * Derives pathway progress metrics from the courses actually displayed,
 * so the summary card always stays consistent with the table.
 */
export const derivePathwayProgress = (courses: PathwayCourse[]): PathwayProgress => ({
  completed: courses.filter((course) => course.status === 'completed').length,
  inProgress: courses.filter((course) => course.status === 'in_progress').length,
  upcoming: courses.filter((course) => course.status === 'not_started').length,
  totalCourses: courses.length,
});
