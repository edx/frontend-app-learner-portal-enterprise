import type { CareerMatch, LearnerIntent, PathwaysState } from './types';

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

export const MIN_VISIBLE_MATCH_PERCENTAGE = 25;

export const normalizeMatchPercentage = (value?: number): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const normalized = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

/**
 * The canonical "what the learner actually sees, in order" list — excludes careers with
 * no associated skills and those below the minimum visible match threshold, sorted by
 * match percentage descending. Used both to render the Career Matches list and to pick
 * the default/fallback selected career (here and in commitProfileSuccess), so the two
 * can never disagree about "the first one."
 */
export const orderDisplayableCareerMatches = (matches: CareerMatch[]): CareerMatch[] => matches
  .filter((match) => (match.skillsToDevelop?.length ?? 0) > 0)
  .filter((match) => {
    const percentage = normalizeMatchPercentage(match.matchPercentage);
    return percentage === null || percentage > MIN_VISIBLE_MATCH_PERCENTAGE;
  })
  .slice()
  .sort((a, b) => (
    (normalizeMatchPercentage(b.matchPercentage) ?? -1) - (normalizeMatchPercentage(a.matchPercentage) ?? -1)
  ));

/**
 * Whether the learner has actually completed Intake — all four fields present, the
 * same invariant react-hook-form enforces (via `requiredNonWhitespace`) before
 * `IntakeQuestionsContainer` ever calls its `onSubmit`/advances `section` past
 * `'onboarding'`. This is independent of whether a profile/pathway was ever
 * generated — reaching the Career Profile page does not itself generate either.
 */
const hasCompletedIntake = (learnerIntent: LearnerIntent): boolean => (
  learnerIntent.careerGoal.trim() !== ''
  && learnerIntent.targetIndustry.trim() !== ''
  && learnerIntent.background.trim() !== ''
  && learnerIntent.motivation.trim() !== ''
);

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
    ? normalizeSelectedCareerId(orderDisplayableCareerMatches(state.careerMatches), state.selectedCareerId)
    : state.selectedCareerId;

  const hasPathway = state.pathwayCourses.length > 0;
  // Any one of these is independently sufficient proof the Career Profile page is
  // legitimate: a real generated profile/matches (Goal Summary submitted), an
  // already-built pathway (can't exist without having gotten there), or — the case
  // this fixes — intake genuinely completed, even if nothing was generated/built yet
  // (reaching the Career Profile page doesn't itself generate a profile or a pathway).
  const hasUsableProfile = state.learnerProfile !== null
    || state.careerMatches.length > 0
    || hasPathway
    || hasCompletedIntake(state.learnerIntent);

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
