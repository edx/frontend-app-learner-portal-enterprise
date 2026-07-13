import type { SearchIndex } from 'algoliasearch/lite';

import type { LearningIntentResponse } from '../../../../../app/data/services';
import type {
  CareerMatch, LearnerProfile, OnboardingAnswers, PathwayCourse,
} from '../state';

/**
 * Integration spike (uncommitted): full-flow input/result shapes.
 *
 * Stage 1 (generateProfileWorkflow): intake -> Learning Intent -> taxonomy career
 * search -> LearnerProfile/CareerMatch[]. Stage 2 (generatePathwayWorkflow):
 * selected career -> catalog course search -> Recommendation Feedback -> enriched
 * PathwayCourse[]. Both workflows take an already-initialized Algolia SearchIndex
 * as an explicit param — they are pure functions and must not call React hooks
 * themselves; usePathwaysController owns obtaining the indexes via useAlgoliaSearch
 * and passing them in.
 */
export interface GenerateProfileWorkflowInput {
  answers: OnboardingAnswers;
  jobIndex: SearchIndex;
}

export interface GenerateProfileWorkflowResult {
  learningIntent: LearningIntentResponse;
  learnerProfile: LearnerProfile;
  careerMatches: CareerMatch[];
}

export interface GeneratePathwayWorkflowInput {
  selectedCareer: CareerMatch;
  learnerProfile: LearnerProfile;
  learningIntent: LearningIntentResponse | null;
  visibleSkills: string[];
  catalogIndex: SearchIndex;
}

export interface GeneratePathwayWorkflowResult {
  courses: PathwayCourse[];
}
