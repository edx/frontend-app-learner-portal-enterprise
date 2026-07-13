import { useShallow } from 'zustand/react/shallow';

import { usePathwaysStore } from '../state';
import type { CareerMatch, LearnerProfile } from '../state';
import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from '../workflows';
import type { GenerateProfileWorkflowResult, GeneratePathwayWorkflowResult } from '../workflows';

/**
 * Controller-layer facade for Pathways tab actions.
 *
 * Layering contract:
 * - Zustand store owns shared client state + simple setters only.
 * - Controller exposes UI-triggered actions.
 * - Workflows coordinate multi-step business operations.
 * - Services (future) integrate with external systems.
 */
export const usePathwaysController = () => {
  const {
    setSection,
    setExperienceStatus,
    resetPathwaysState,
  } = usePathwaysStore(useShallow((state) => ({
    setSection: state.setSection,
    setExperienceStatus: state.setExperienceStatus,
    resetPathwaysState: state.resetPathwaysState,
  })));

  const startOnboarding = () => {
    // Minimal state transition only; workflow orchestration is intentionally deferred.
    setSection('onboarding');
    setExperienceStatus('onboarding_in_progress');
  };

  const generateProfile = (
    learnerProfile: LearnerProfile,
  ): Promise<GenerateProfileWorkflowResult> => generateProfileWorkflow({ learnerProfile });

  const generatePathway = (
    learnerProfile: LearnerProfile,
    selectedCareer: CareerMatch,
    skillsToDevelop: string[],
  ): Promise<GeneratePathwayWorkflowResult> => generatePathwayWorkflow({
    learnerProfile,
    selectedCareer,
    skillsToDevelop,
  });

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
