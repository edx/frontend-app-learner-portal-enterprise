import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAlgoliaSearch, useSearchCatalogs } from '../../../../../app/data/hooks';
import { usePathwaysStore } from '../state';
import type { CareerMatch, LearnerIntent, PathwayGenerationRequest } from '../state';
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
 * (`useSearchCatalogs`, `useAlgoliaSearch`) are resolved for pathway generation — the
 * workflow itself stays hook-free, so any future second caller of `generatePathway`
 * gets the same catalog-scope resolution without duplicating these hook calls itself.
 */
export const usePathwaysController = () => {
  const {
    setSection,
    resetPathwaysState,
  } = usePathwaysStore(useShallow((state) => ({
    setSection: state.setSection,
    resetPathwaysState: state.resetPathwaysState,
  })));

  const searchCatalogs = useSearchCatalogs();
  const { catalogUuidsToCatalogQueryUuids } = useAlgoliaSearch();
  const catalogScope = useMemo(() => ({
    searchCatalogs,
    catalogUuidsToCatalogQueryUuids,
  }), [searchCatalogs, catalogUuidsToCatalogQueryUuids]);

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
  ): Promise<GeneratePathwayWorkflowResult> => generatePathwayWorkflow({ request, selectedCareer, catalogScope });

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
