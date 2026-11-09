import { fetchLearningIntent } from '../../../../../app/data/services/xpert';
import { getCourseAlgoliaIndex, searchCoursesForSkillsPathway } from '../services';
import type { LearnerIntent, PathwayCourse } from '../state';
import type { CourseRetrievalCatalogScope } from '../types';

export interface GenerateSkillsPathwayWorkflowInput {
  learnerIntent: LearnerIntent;
  catalogScope: CourseRetrievalCatalogScope;
}

/**
 * Result the composition layer commits atomically via `commitSkillsPathwaySuccess`. Same
 * shape as `GeneratePathwayWorkflowResult` on purpose — the Pathway page consumes one
 * course model regardless of which flow produced it.
 */
export interface GenerateSkillsPathwayWorkflowResult {
  courses: PathwayCourse[];
}

/**
 * Default, skills-driven pathway generation: learner intent -> Learning Intent -> Algolia
 * skills-driven course retrieval -> `PathwayCourse[]`. No career selection and no
 * Recommendation Feedback — this is the default, no-query-param flow, distinct from the
 * opt-in career flow (`generateProfileWorkflow` + `generatePathwayWorkflow`), which this
 * function never calls.
 *
 * `catalogScope` reaching `searchCoursesForSkillsPathway` is the entire enterprise-scoping
 * mechanism for this flow — there is no separate Enterprise Catalog inclusion stage, and
 * no `enterpriseCustomerUuid` is needed here at all, since nothing in this sequence
 * requires it once that stage is gone.
 */
export const generateSkillsPathwayWorkflow = async (
  { learnerIntent, catalogScope }: GenerateSkillsPathwayWorkflowInput,
): Promise<GenerateSkillsPathwayWorkflowResult> => {
  const learningIntent = await fetchLearningIntent(learnerIntent);
  const index = getCourseAlgoliaIndex();
  const courses = await searchCoursesForSkillsPathway({ index, learningIntent, catalogScope });
  return { courses };
};
