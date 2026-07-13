import type { SearchIndex } from 'algoliasearch/lite';
import { useShallow } from 'zustand/react/shallow';

import type { LearningIntentResponse } from '../../../../../app/data/services';
import { usePathwaysStore } from '../state';
import type { CareerMatch, LearnerProfile, OnboardingAnswers } from '../state';
import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from '../workflows';

export interface UsePathwaysControllerOptions {
  jobIndex: SearchIndex | null;
  catalogIndex: SearchIndex | null;
}

export interface GeneratePathwayInput {
  selectedCareer: CareerMatch;
  learnerProfile: LearnerProfile;
  learningIntent: LearningIntentResponse | null;
  visibleSkills: string[];
}

/**
 * Controller-layer facade for Pathways tab actions.
 *
 * Layering contract:
 * - Zustand store owns shared client state + simple setters only.
 * - Controller exposes UI-triggered actions, owning loading, errors, state
 *   commits, and navigation.
 * - Workflows coordinate multi-step business operations as pure functions —
 *   they receive already-initialized dependencies (Algolia SearchIndex
 *   instances) rather than calling React hooks themselves.
 * - Services integrate with external systems (HTTP transport, Algolia search).
 *
 * jobIndex/catalogIndex are obtained by the caller (LearnerPathwaysTab, the
 * single top-level owner) via useAlgoliaSearch and passed in here, rather than
 * this hook calling useAlgoliaSearch itself — avoids redundant Algolia-hook
 * mounts in every component that instantiates this controller.
 */
export const usePathwaysController = ({ jobIndex, catalogIndex }: UsePathwaysControllerOptions) => {
  const {
    setSection,
    setExperienceStatus,
    resetPathwaysState,
    setLoading,
    setError,
    setLearningIntent,
    setLearnerProfile,
    setCareerMatches,
    setSelectedCareerId,
    setPathwayCourses,
  } = usePathwaysStore(useShallow((state) => ({
    setSection: state.setSection,
    setExperienceStatus: state.setExperienceStatus,
    resetPathwaysState: state.resetPathwaysState,
    setLoading: state.setLoading,
    setError: state.setError,
    setLearningIntent: state.setLearningIntent,
    setLearnerProfile: state.setLearnerProfile,
    setCareerMatches: state.setCareerMatches,
    setSelectedCareerId: state.setSelectedCareerId,
    setPathwayCourses: state.setPathwayCourses,
  })));

  const startOnboarding = () => {
    // Minimal state transition only; workflow orchestration is intentionally deferred.
    setSection('onboarding');
    setExperienceStatus('onboarding_in_progress');
  };

  const generateProfile = async (answers: OnboardingAnswers) => {
    if (!jobIndex) {
      const message = 'Taxonomy career search is not configured.';
      setError('learnerProfile', message);
      throw new Error(message);
    }

    setError('learnerProfile', null);
    setLoading('learnerProfile', true);
    setLoading('careerMatches', true);
    try {
      const result = await generateProfileWorkflow({ answers, jobIndex });
      setLearningIntent(result.learningIntent);
      setLearnerProfile(result.learnerProfile);
      setCareerMatches(result.careerMatches);
      if (result.careerMatches.length > 0) {
        setSelectedCareerId(result.careerMatches[0].id);
      }
      setExperienceStatus('profile_ready');
      setSection('profile');
      return result;
    } catch (error) {
      setError(
        'learnerProfile',
        error instanceof Error ? error.message : 'Unable to generate learner profile.',
      );
      throw error;
    } finally {
      setLoading('learnerProfile', false);
      setLoading('careerMatches', false);
    }
  };

  const generatePathway = async (input: GeneratePathwayInput) => {
    if (!catalogIndex) {
      const message = 'Course catalog search is not configured.';
      setError('pathwayCourses', message);
      throw new Error(message);
    }

    setError('pathwayCourses', null);
    setLoading('pathwayCourses', true);
    try {
      const result = await generatePathwayWorkflow({ ...input, catalogIndex });
      setPathwayCourses(result.courses);
      setExperienceStatus('pathway_ready');
      setSection('pathway');
      return result;
    } catch (error) {
      setError(
        'pathwayCourses',
        error instanceof Error ? error.message : 'Unable to build the learning pathway.',
      );
      throw error;
    } finally {
      setLoading('pathwayCourses', false);
    }
  };

  const resetPathway = () => {
    resetPathwaysState();
  };

  return {
    startOnboarding,
    generateProfile,
    generatePathway,
    resetPathway,
  };
};
