import { useShallow } from 'zustand/react/shallow';

import { useAlgoliaSearch } from '../../../../../app/data/hooks';
import { usePathwaysStore } from '../state';
import type { CareerMatch, LearnerIntent, PathwayGenerationRequest } from '../state';
import { getDebugCourseAlgoliaIndexOverride } from '../services';
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
 *
 * This is the one place infrastructure dependencies that require React hooks
 * (`useAlgoliaSearch`) are resolved for pathway generation — the workflow itself stays
 * hook-free, so any future second caller of `generatePathway` gets the same index
 * resolution without duplicating this hook call itself. Catalog scoping is enforced
 * server-side by the secured Algolia API key `useAlgoliaSearch` resolves, so there's no
 * separate catalog-scope value to resolve or pass through here anymore — except for the
 * explicit `?debug=true` stage-override escape hatch (`getDebugCourseAlgoliaIndexOverride`),
 * which `generatePathway` checks fresh on every call and prefers over the hook-resolved
 * index whenever it's active.
 */
export const usePathwaysController = () => {
  const {
    setSection,
    resetPathwaysState,
  } = usePathwaysStore(useShallow((state) => ({
    setSection: state.setSection,
    resetPathwaysState: state.resetPathwaysState,
  })));

  const { searchIndex } = useAlgoliaSearch();

  const startOnboarding = () => {
    // Minimal state transition only; workflow orchestration is intentionally deferred.
    setSection('onboarding');
  };

  const generateProfile = (
    learnerIntent: LearnerIntent,
  ): Promise<GenerateProfileWorkflowResult> => generateProfileWorkflow(learnerIntent);

  const generatePathway = (
    request: PathwayGenerationRequest,
    selectedCareer: CareerMatch,
  ): Promise<GeneratePathwayWorkflowResult> => {
    const index = getDebugCourseAlgoliaIndexOverride() ?? searchIndex;
    if (!index) {
      throw new Error('Course Algolia search index is unavailable; cannot generate a pathway.');
    }
    return generatePathwayWorkflow({ request, selectedCareer, index });
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
