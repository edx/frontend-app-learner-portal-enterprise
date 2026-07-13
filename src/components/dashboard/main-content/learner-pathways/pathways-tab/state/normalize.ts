import type { CareerMatch, PathwaysState } from './types';

/**
 * Falls back to the first available career match (then null) when the candidate id
 * doesn't reference a current match — the same rule the Career Profile page already
 * applies when deriving its own selected career, now available as one canonical helper.
 */
export const normalizeSelectedCareerId = (
  matches: CareerMatch[],
  candidateId: string | null,
): string | null => {
  if (candidateId && matches.some((match) => match.id === candidateId)) {
    return candidateId;
  }
  return matches[0]?.id ?? null;
};

/**
 * Corrects invalid persisted-state combinations that could otherwise render a broken
 * page after hydration (e.g. a refresh landing on the Pathway section with no pathway).
 * Applied on every hydration merge, not scattered across components.
 */
export const normalizePathwaysState = (state: PathwaysState): PathwaysState => {
  const selectedCareerId = normalizeSelectedCareerId(state.careerMatches, state.selectedCareerId);

  const hasUsableProfile = state.learnerProfile !== null || state.careerMatches.length > 0;
  const hasPathway = state.pathwayCourses.length > 0;

  let { section } = state;
  if (section === 'pathway' && !hasPathway) {
    section = 'profile';
  }
  if (section === 'profile' && !hasUsableProfile) {
    section = 'onboarding';
  }

  const pathwayBaseline = hasPathway ? state.pathwayBaseline : null;

  return {
    ...state,
    section,
    selectedCareerId,
    pathwayBaseline,
  };
};
