export const NON_PRODUCTION_BANNER_DISMISSED_STORAGE_KEY = 'non-production-banner.dismissed-at';

// Per ENT-12015, a dismissed banner reappears after 24 hours.
export const NON_PRODUCTION_BANNER_DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Dismissals are scoped per enterprise customer so that dismissing the banner for one organization
 * does not hide it for another.
 */
export const getNonProductionBannerDismissalStorageKey = (enterpriseId?: string) => (
  `${NON_PRODUCTION_BANNER_DISMISSED_STORAGE_KEY}.${enterpriseId}`
);

/**
 * Returns true when the banner was dismissed less than 24 hours ago. Missing or unparseable
 * timestamps are treated as "not dismissed" so the banner errs on the side of being visible.
 */
export const isNonProductionBannerDismissalActive = (storageKey: string) => {
  const dismissedAt = Number(global.localStorage.getItem(storageKey));
  if (!dismissedAt) {
    return false;
  }
  return Date.now() - dismissedAt < NON_PRODUCTION_BANNER_DISMISSAL_DURATION_MS;
};
