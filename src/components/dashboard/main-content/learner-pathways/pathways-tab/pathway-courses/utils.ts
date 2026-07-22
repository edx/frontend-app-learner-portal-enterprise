import type { PathwayCourse } from '../state';
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
