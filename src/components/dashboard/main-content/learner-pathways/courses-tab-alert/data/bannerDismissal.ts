import type { PathwaysExperienceStatus } from '../../pathways-tab/state/types';

/**
 * Un-scoped, single-key convention deliberately mirrors this feature's existing precedent:
 * `useGroupAssociationsAlert` (course-enrollments/data/hooks.js) and the pathways store's own
 * `persist` key are both un-scoped by learner/enterprise, so this doesn't invent new scoping.
 */
export const PATHWAYS_BANNER_DISMISSAL_STORAGE_KEY = 'edx.learner-pathways.banner-dismissed-rank';

/**
 * Ordinal rank mirroring the banner precedence order exactly (see deriveExperienceStatus.ts).
 * Dismissing a status hides the banner for that status and any status at or below its rank;
 * advancing to a higher-ranked status shows the banner again until dismissed at that rank too.
 */
export const PATHWAYS_STATUS_RANK: Record<PathwaysExperienceStatus, number> = {
  not_started: 0,
  onboarding_in_progress: 1,
  profile_ready: 2,
  pathway_ready: 3,
  course_registered: 4,
  pathway_in_progress: 5,
  pathway_completed: 6,
};

const readStoredRank = (): number | null => {
  const raw = global.localStorage.getItem(PATHWAYS_BANNER_DISMISSAL_STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getDismissedRank = (): number | null => readStoredRank();

export const isDismissed = (status: PathwaysExperienceStatus): boolean => {
  const storedRank = readStoredRank();
  return storedRank !== null && PATHWAYS_STATUS_RANK[status] <= storedRank;
};

/**
 * Records a dismissal at `status`'s rank. Monotonic: never regresses the stored high-water-mark
 * on an out-of-order write (e.g. dismissing an earlier state again after a later one).
 */
export const recordDismissal = (status: PathwaysExperienceStatus): void => {
  const nextRank = PATHWAYS_STATUS_RANK[status];
  const storedRank = readStoredRank();
  if (storedRank === null || nextRank > storedRank) {
    global.localStorage.setItem(PATHWAYS_BANNER_DISMISSAL_STORAGE_KEY, String(nextRank));
  }
};

/** Called alongside the existing pathway reset flow so the banner starts fresh after a retake. */
export const clearPathwaysBannerDismissal = (): void => {
  global.localStorage.removeItem(PATHWAYS_BANNER_DISMISSAL_STORAGE_KEY);
};
