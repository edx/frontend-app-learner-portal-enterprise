import { fetchLearningIntent } from '../../../../../app/data/services/xpert';
import { careerRetrievalService, getCareerAlgoliaIndex } from '../services';
import { normalizeSkillsList } from '../state';
import type { CareerMatch, LearnerProfile } from '../state';
import type { CareerSearchIntent } from '../types';
import type { GenerateProfileWorkflowInput, GenerateProfileWorkflowResult } from './types';

/**
 * `LearningIntentResponse` (xpert.ts) only declares 3 required fields today
 * (`condensedAlgoliaQuery`, `skillsRequired`, `skillsPreferred`); the other 6
 * `CareerSearchIntent` fields are optional there by design (see
 * pathways-tab/types/careerRetrieval.ts), so this assignment needs no cast — it's a
 * genuine, type-checked structural match, not a suppressed mismatch.
 */
const toLearnerProfile = (intent: CareerSearchIntent, careerMatches: CareerMatch[]): LearnerProfile => ({
  summary: careerMatches.length
    ? `Found ${careerMatches.length} career match${careerMatches.length === 1 ? '' : 'es'} for your goals.`
    : 'No career matches were found for your current goal.',
  learningStyle: '',
  weeklyTimeCommitment: '',
  certificatePreference: '',
  skills: normalizeSkillsList([...intent.skillsRequired, ...intent.skillsPreferred]),
});

/**
 * Integration seam: learner intent -> Learning Intent -> career retrieval -> profile
 * mapping, as one linear sequence, each step run exactly once. Career retrieval only
 * runs after Learning Intent succeeds; a rejection at either step rejects this promise
 * unmodified rather than falling back to a partial or fixture result.
 */
export const generateProfileWorkflow = async (
  input: GenerateProfileWorkflowInput,
): Promise<GenerateProfileWorkflowResult> => {
  const searchIntent: CareerSearchIntent = await fetchLearningIntent(input);

  const index = getCareerAlgoliaIndex();
  const careerMatches = await careerRetrievalService.searchCareers(index, searchIntent);

  return {
    learnerProfile: toLearnerProfile(searchIntent, careerMatches),
    careerMatches,
  };
};
