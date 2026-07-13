import { useShallow } from 'zustand/react/shallow';

import { usePathwaysStore } from '../state';
import type { LearnerIntent, PathwayGenerationRequest } from '../state';
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
    resetPathwaysState,
  } = usePathwaysStore(useShallow((state) => ({
    setSection: state.setSection,
    resetPathwaysState: state.resetPathwaysState,
  })));

  const startOnboarding = () => {
    // Minimal state transition only; workflow orchestration is intentionally deferred.
    setSection('onboarding');
  };

  const generateProfile = (
    learnerIntent: LearnerIntent,
  ): Promise<GenerateProfileWorkflowResult> => generateProfileWorkflow(learnerIntent);

  const generatePathway = (
    request: PathwayGenerationRequest,
  ): Promise<GeneratePathwayWorkflowResult> => generatePathwayWorkflow(request);

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
