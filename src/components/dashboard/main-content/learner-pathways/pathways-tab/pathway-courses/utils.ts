import type { PathwayCourse } from '../state';
import type { PathwaysFlowVariant } from '../flowVariant';
import { PATHWAY_COURSES_STUB } from './fixtures';

/** Stable empty reference, so a direct-mode empty render doesn't invalidate a
 *  downstream memo (e.g. `resolvePathwayCourses`) on every render. */
const NO_COURSES: PathwayCourse[] = [];

/**
 * Selects the courses to display in the pathway courses table.
 *
 * A successful build always commits real courses, so `storeCourses` is empty here only
 * in the defensive edge case of the Pathway section being reached without one (e.g. a
 * stale bookmark) — this is a render-time fallback, never persisted.
 *
 * The career flow keeps its long-standing fixture fallback. The direct flow never shows
 * it: its Pathway page is only ever reached from a real committed direct result, so an
 * empty store there genuinely means "nothing to show", and rendering the career
 * fixture's hardcoded investment-banking courses would present fabricated
 * recommendations as if Xpert had produced them.
 */
export const getDisplayedPathwayCourses = (
  storeCourses: PathwayCourse[],
  flowVariant: PathwaysFlowVariant = 'career',
): PathwayCourse[] => {
  if (storeCourses.length > 0) {
    return storeCourses;
  }
  return flowVariant === 'direct' ? NO_COURSES : PATHWAY_COURSES_STUB;
};
