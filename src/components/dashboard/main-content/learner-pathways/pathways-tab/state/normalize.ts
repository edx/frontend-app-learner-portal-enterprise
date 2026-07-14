import type { CareerMatch, PathwaysState } from './types';

/** Trims and dedupes a raw skills list — shared by every place a career's recommended
 * skills list becomes a canonical `selectedSkills` value. */
export const normalizeSkillsList = (skills: string[]): string[] => (
  Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)))
);

/** The normalized recommended-skills list for a given career match, or `null` if the
 * candidate id doesn't resolve to a current match. */
export const recommendedSkillsForCareer = (
  matches: CareerMatch[],
  careerId: string | null,
): string[] | null => {
  const match = matches.find((candidate) => candidate.id === careerId);
  return match ? normalizeSkillsList(match.skillsToDevelop ?? []) : null;
};

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
 * page after hydration (e.g. a refresh landing on the Pathway section with no
 * pathway, or a selected-skills list surviving an invalid selected career). Applied
 * on every hydration merge, not scattered across components.
 */
export const normalizePathwaysState = (state: PathwaysState): PathwaysState => {
  // Real careerMatches only ever exist once a genuine Goal Summary/profile-generation
  // result has been committed (commitProfileSuccess). Before that — e.g. a pathway
  // built from the pre-generation stub career list (State A) — there's nothing real to
  // validate the persisted selectedCareerId against, so trust it as-is rather than
  // treating "no real matches yet" as "stale selection."
  const selectedCareerId = state.careerMatches.length > 0
    ? normalizeSelectedCareerId(state.careerMatches, state.selectedCareerId)
    : state.selectedCareerId;

  const hasPathway = state.pathwayCourses.length > 0;
  const hasUsableProfile = state.learnerProfile !== null || state.careerMatches.length > 0 || hasPathway;

  let { section } = state;
  if (section === 'pathway' && !hasPathway) {
    section = 'profile';
  }
  if (section === 'profile' && !hasUsableProfile) {
    section = 'onboarding';
  }

  const pathwayInputFingerprint = hasPathway ? state.pathwayInputFingerprint : null;
  const selectedSkills = selectedCareerId === null ? null : state.selectedSkills;

  return {
    ...state,
    section,
    selectedCareerId,
    selectedSkills,
    pathwayInputFingerprint,
  };
};
