import {
  PATHWAYS_BANNER_DISMISSAL_STORAGE_KEY,
  PATHWAYS_STATUS_RANK,
  clearPathwaysBannerDismissal,
  getDismissedRank,
  isDismissed,
  recordDismissal,
} from './bannerDismissal';

describe('bannerDismissal', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  it('returns null when nothing has been dismissed', () => {
    expect(getDismissedRank()).toBeNull();
    expect(isDismissed('profile_ready')).toBe(false);
  });

  it('hides the dismissed status and any lower-ranked status, but not higher-ranked ones', () => {
    recordDismissal('profile_ready');
    expect(isDismissed('not_started')).toBe(true);
    expect(isDismissed('onboarding_in_progress')).toBe(true);
    expect(isDismissed('profile_ready')).toBe(true);
    expect(isDismissed('pathway_ready')).toBe(false);
    expect(isDismissed('pathway_completed')).toBe(false);
  });

  it('does not regress the stored rank on an out-of-order (lower-ranked) dismissal', () => {
    recordDismissal('pathway_ready');
    recordDismissal('profile_ready');
    expect(getDismissedRank()).toBe(PATHWAYS_STATUS_RANK.pathway_ready);
  });

  it('advances the stored rank on a higher-ranked dismissal', () => {
    recordDismissal('pathway_ready');
    recordDismissal('pathway_completed');
    expect(getDismissedRank()).toBe(PATHWAYS_STATUS_RANK.pathway_completed);
  });

  it('clears the dismissal', () => {
    recordDismissal('pathway_completed');
    clearPathwaysBannerDismissal();
    expect(getDismissedRank()).toBeNull();
    expect(isDismissed('not_started')).toBe(false);
  });

  it('treats a malformed stored value as no dismissal rather than a false positive', () => {
    global.localStorage.setItem(PATHWAYS_BANNER_DISMISSAL_STORAGE_KEY, 'garbage');
    expect(getDismissedRank()).toBeNull();
    expect(isDismissed('not_started')).toBe(false);
  });
});
