import type { PathwayCourse, PathwayProgress } from '../state';
import { PATHWAY_COURSES_STUB } from './fixtures';

/**
 * Selects the courses to display in the pathway courses table.
 *
 * Fixture data stands in for a real pathway-courses workflow/service call
 * during the scaffold phase. Once that workflow populates `pathwayCourses`
 * in the store, this function starts returning that real data with no
 * caller changes required — `storeCourses.length > 0` will already be true.
 *
 * TODO: remove this fixture fallback once the pathway-courses workflow
 * populates `pathwayCourses` in the store for every learner.
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
