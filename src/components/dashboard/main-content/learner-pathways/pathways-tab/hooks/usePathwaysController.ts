import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAlgoliaSearch, useSearchCatalogs } from '../../../../../app/data/hooks';
import { usePathwaysStore } from '../state';
import type { CareerMatch, LearnerIntent, PathwayGenerationRequest } from '../state';
import {
  generateSkillsPathwayWorkflow,
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from '../workflows';
import type {
  GenerateSkillsPathwayWorkflowResult,
  GeneratePathwayWorkflowResult,
  GenerateProfileWorkflowResult,
} from '../workflows';

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

  /**
   * Default, skills-driven flow: resolves the catalog scope the hook-free workflow can't
   * reach itself, then delegates. No enterprise-customer UUID is needed here — the only
   * enterprise-scoping mechanism this flow uses is `catalogScope` reaching Algolia's own
   * filters, not a separate catalog-inclusion lookup.
   */
  const generateSkillsPathway = (
    learnerIntent: LearnerIntent,
  ): Promise<GenerateSkillsPathwayWorkflowResult> => generateSkillsPathwayWorkflow({ learnerIntent, catalogScope });

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
    generateSkillsPathway,
    generatePathway,
    resetPathway,
  };
};
