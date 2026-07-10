import { fetchLearningIntent } from '../../../../../app/data/services';
import { mapTaxonomyHitToCareerMatch, searchTaxonomyCareers } from '../services/taxonomyCareerSearch';
import { buildLearnerProfile, mapLearningIntentToTaxonomyInput } from './mappers';
import type { GenerateProfileWorkflowInput, GenerateProfileWorkflowResult } from './types';

/**
 * Integration seam: owns intake/profile-edit -> Learning Intent -> taxonomy career
 * search -> profile/career-match mapping.
 *
 * Flow:
 * 1. Map intake fields (goal, motivation, background, industry) to a
 *    LearningIntentRequest (selectedGoals, freeText, knownContext). This mapping
 *    belongs here, not in the form component or the transport service, and must
 *    follow the production serializer contract rather than copying the
 *    ai-pathways prototype's array-combining approach verbatim.
 * 2. Call fetchLearningIntent (src/components/app/data/services/xpert.ts).
 * 3. Use the returned condensedAlgoliaQuery/skillsRequired/skillsPreferred to
 *    perform taxonomy (jobs-index) career retrieval via searchTaxonomyCareers.
 * 4. Map the results into a LearnerProfile and CareerMatch[] and return them for
 *    the controller to commit to store state.
 *
 * Integration spike (uncommitted): selectedGoals/knownContext are plain strings
 * here (confirmed against enterprise-access's LearningIntentRequestSerializer,
 * which declares both as CharField, not ListField) — do not copy the ai-pathways
 * prototype's array-combining approach. The exact prose shape of knownContext
 * (JSON string vs. plain text) still needs confirmation against the production
 * prompt. Course search intentionally does NOT happen here — it depends on the
 * *selected* career and belongs in generatePathwayWorkflow, triggered by Build
 * Pathway, not intake submission.
 */
export const generateProfileWorkflow = async (
  { answers, jobIndex }: GenerateProfileWorkflowInput,
): Promise<GenerateProfileWorkflowResult> => {
  const learningIntent = await fetchLearningIntent({
    selectedGoals: answers.goal,
    freeText: answers.motivation,
    knownContext: JSON.stringify({
      background: answers.background,
      industry: answers.industry,
    }),
  });

  if (!learningIntent.condensedAlgoliaQuery?.trim()) {
    throw new Error('Learning Intent did not return an Algolia query.');
  }

  const taxonomyInput = mapLearningIntentToTaxonomyInput({ learningIntent, intakeAnswers: answers });
  const taxonomyHits = await searchTaxonomyCareers({ index: jobIndex, ...taxonomyInput });
  const careerMatches = taxonomyHits.map(mapTaxonomyHitToCareerMatch);
  const learnerProfile = buildLearnerProfile({ intakeAnswers: answers, learningIntent });

  return { learningIntent, learnerProfile, careerMatches };
};
