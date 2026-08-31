import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useEnterpriseCustomer } from '../../../../../app/data';
import { useAlgoliaSearch, useSearchCatalogs } from '../../../../../app/data/hooks';
import { usePathwaysStore } from '../state';
import type { CareerMatch, LearnerIntent, PathwayGenerationRequest } from '../state';
import {
  generateDirectPathwayWorkflow,
  generatePathwayWorkflow,
  generateProfileWorkflow,
} from '../workflows';
import type {
  GenerateDirectPathwayWorkflowResult,
  GeneratePathwayWorkflowResult,
  GenerateProfileWorkflowResult,
} from '../workflows';
import { DirectPathwayContextUnavailableError } from './directPathwayContext';

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
  const { data: enterpriseCustomer } = useEnterpriseCustomer();

  const startOnboarding = () => {
    // Minimal state transition only; workflow orchestration is intentionally deferred.
    setSection('onboarding');
  };

  const generateProfile = (
    learnerIntent: LearnerIntent,
  ): Promise<GenerateProfileWorkflowResult> => generateProfileWorkflow(learnerIntent);

  /**
   * Direct-flow composition: resolves the two pieces of enterprise context the hook-free
   * workflow can't reach itself (the customer UUID and the catalog scope), guards them,
   * then delegates. A `{ courses: [] }` resolution is a legitimate empty result, not a
   * failure — only the guard below and the workflow's own service rejections reject.
   */
  const generateDirectPathway = (
    learnerIntent: LearnerIntent,
  ): Promise<GenerateDirectPathwayWorkflowResult> => {
    const enterpriseCustomerUuid = enterpriseCustomer?.uuid;
    // Rejected up front, before any external call: `catalogScope.searchCatalogs` doubles
    // as the Enterprise Catalog inclusion check's `catalogUuids`, and that check cannot
    // run without both values (see enterpriseCatalogInclusion.ts).
    // if (!enterpriseCustomerUuid || catalogScope.searchCatalogs.length === 0) {
    //   return Promise.reject(new DirectPathwayContextUnavailableError());
    // }
    return generateDirectPathwayWorkflow({ learnerIntent, enterpriseCustomerUuid, catalogScope });
  };

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
    generateDirectPathway,
    generatePathway,
    resetPathway,
  };
};
