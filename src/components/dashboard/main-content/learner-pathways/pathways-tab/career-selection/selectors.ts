import { normalizeSelectedCareerId } from '../state';
import type { CareerMatch } from '../state';

/**
 * Single canonical "which career is selected" rule, reused by both
 * CareerSelectionContainer (against the unfiltered match list) and
 * CareerSelectionPage (against its filtered/sorted display list) — previously each
 * component derived this independently with the same fall-back-to-first-match logic.
 */
export const deriveSelectedCareer = (
  matches: CareerMatch[],
  selectedCareerId: string | null,
): CareerMatch | null => {
  const id = normalizeSelectedCareerId(matches, selectedCareerId);
  return matches.find((match) => match.id === id) ?? null;
};
