import type { LearningIntentResponse } from '../../../../../app/data/services';
import type { CareerMatch, LearnerProfile, OnboardingAnswers } from '../state';

const dedupe = (values: string[]): string[] => Array.from(new Set(values));

// Distinct from catalogCourseSearch.ts's MAX_STRICT_SKILLS (=4, the facetFilters
// cap) — this caps how many skill terms feed the search query text itself,
// matching ai-pathways' catalogTranslationService.ts query-building formula.
const MAX_QUERY_SKILL_TERMS = 3;

export interface CourseSearchQuery {
  query: string;
  queryAlternates: string[];
}

/**
 * Simplified port of ai-pathways' processTranslation query/queryAlternates
 * formula: the query is anchored on the learner's top required skills
 * (lowercased, space-joined), falling back to the career title when there
 * are none; the career title is carried as a fallback queryAlternate when it
 * differs from the skill-derived query. ai-pathways adds an extra
 * hasMappedFacets gate that forces query = careerTitle / queryAlternates = []
 * when strict AND boost skill *facets* are both empty — that gate is
 * redundant here: with no strictSkills, broadTerms is '' (falsy), so query
 * already falls back to careerTitle, and query === careerTitle already
 * forces queryAlternates to [] via the ternary below. The gate only mattered
 * there because strictSkillFilters is a catalog-vocabulary-matched subset
 * that can diverge from raw required skills — a step this codebase doesn't
 * have (skill names go straight to Algolia, no catalog-matching step).
 */
export function buildCourseSearchQuery(
  { strictSkills, careerTitle }: { strictSkills: string[]; careerTitle: string },
): CourseSearchQuery {
  const broadTerms = strictSkills
    .slice(0, MAX_QUERY_SKILL_TERMS)
    .map((skill) => skill.toLowerCase())
    .join(' ');
  const query = broadTerms || careerTitle;
  const queryAlternates = query !== careerTitle ? [careerTitle] : [];
  return { query, queryAlternates };
}

export interface TaxonomySearchInput {
  query: string;
  skillsRequired: string[];
  skillsPreferred: string[];
}

/**
 * Maps the Learning Intent response to the taxonomy search input. The intake
 * answers aren't currently used here (condensedAlgoliaQuery already reflects
 * them, via the backend prompt) but are accepted for symmetry with the ticket's
 * conceptual signature and in case a future taxonomy adapter needs raw intake
 * signals (e.g. intake industry) alongside the Learning Intent output.
 */
export function mapLearningIntentToTaxonomyInput(
  { learningIntent }: { learningIntent: LearningIntentResponse; intakeAnswers?: OnboardingAnswers },
): TaxonomySearchInput {
  return {
    query: learningIntent.condensedAlgoliaQuery,
    skillsRequired: learningIntent.skillsRequired,
    skillsPreferred: learningIntent.skillsPreferred,
  };
}

/**
 * Deterministic learner-profile mapping — no AI-generated prose is fabricated.
 * summary/learningStyle/weeklyTimeCommitment/certificatePreference default to ''
 * because intake doesn't collect them and Learning Intent doesn't return them;
 * none of these four fields are currently rendered anywhere in the UI, so this
 * is a safe, honest gap rather than invented content. See the productionization
 * doc for expanding intake to collect them for real.
 */
export function buildLearnerProfile(
  { intakeAnswers, learningIntent }: { intakeAnswers: OnboardingAnswers; learningIntent: LearningIntentResponse },
): LearnerProfile {
  return {
    summary: '',
    careerGoal: intakeAnswers.goal,
    targetIndustry: intakeAnswers.industry,
    background: intakeAnswers.background,
    motivation: intakeAnswers.motivation,
    learningStyle: '',
    weeklyTimeCommitment: '',
    certificatePreference: '',
    skills: dedupe([...learningIntent.skillsRequired, ...learningIntent.skillsPreferred]),
  };
}

/**
 * Deliberate, minimal learner-profile projection sent to Recommendation Feedback —
 * not the entire Zustand store. Excludes loading/errors/navigation/constructedPayloads/
 * raw Algolia clients per the ticket's explicit data-minimization instruction.
 */
export function buildRecommendationProfile(
  { learnerProfile, learningIntent, selectedCareer }: {
    learnerProfile: LearnerProfile;
    learningIntent: LearningIntentResponse | null;
    selectedCareer: CareerMatch;
  },
): Record<string, unknown> {
  return {
    careerGoal: learnerProfile.careerGoal,
    targetIndustry: learnerProfile.targetIndustry,
    background: learnerProfile.background,
    motivation: learnerProfile.motivation,
    skillsRequired: learningIntent?.skillsRequired ?? [],
    skillsPreferred: learningIntent?.skillsPreferred ?? [],
    selectedCareerTitle: selectedCareer.title,
    selectedCareerSkills: selectedCareer.skillsToDevelop ?? [],
  };
}
