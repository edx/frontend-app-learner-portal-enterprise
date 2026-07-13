import { useShallow } from 'zustand/react/shallow';

import { usePathwaysStore } from '../state';
import type { LearnerProfile } from '../state';
import {
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from '../workflows';
import type { GenerateProfileWorkflowResult } from '../workflows';

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
    constructedPayloads,
  } = usePathwaysStore(useShallow((state) => ({
    setSection: state.setSection,
    setExperienceStatus: state.setExperienceStatus,
    resetPathwaysState: state.resetPathwaysState,
    constructedPayloads: state.constructedPayloads,
  })));

  const startOnboarding = () => {
    // Minimal state transition only; workflow orchestration is intentionally deferred.
    setSection('onboarding');
    setExperienceStatus('onboarding_in_progress');
  };

  const generateProfile = (
    learnerProfile: LearnerProfile,
  ): Promise<GenerateProfileWorkflowResult> => generateProfileWorkflow({ learnerProfile });

  // Integration seam: generatePathway should accept explicit selected-career/profile
  // input instead of reading constructedPayloads.pathwayRequest, which callers
  // currently stage into the store immediately before invoking this action.
  const generatePathway = async () => {
    // TODO: Trigger full pathway workflow orchestration in a follow-up ticket.
    await generatePathwayWorkflow({
      payload: constructedPayloads.pathwayRequest ?? undefined,
    });
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
