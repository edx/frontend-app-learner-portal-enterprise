import React, { useMemo } from 'react';
import { getConfig } from '@edx/frontend-platform';
import { usePathways } from '../hooks/usePathways';
import {
  PathwayList,
  LoadingState,
  ErrorState,
  IntakeForm,
  UserProfile,
  InstantSearchWrapper,
  TaxonomyResultList,
  FacetBootstrapDebug,
} from '../components';
import useAlgoliaSearch from '../../app/data/hooks/useAlgoliaSearch';
import useEnterpriseCustomer from '../../app/data/hooks/useEnterpriseCustomer';
import useSearchCatalogs from '../../app/data/hooks/useSearchCatalogs';
import { getSupportedLocale } from '../../app/data/utils';

/**
 * AiPathwaysPage is the top-level entry point for the AI Pathways feature.
 *
 * It manages the high-level state of the feature slice and coordinates
 * rendering of its sub-pages (Intake, Profile, and Learning Pathway)
 * using the usePathways hook to drive the interaction flow.
 */
export const AiPathwaysPage = () => {
  const {
    currentStep,
    learnerProfile,
    searchIntent,
    selectedCareer,
    pathway,
    taxonomyResults,
    taxonomyFilters,
    isLoading,
    error,
    generateProfile,
    selectCareer,
    generatePathway,
    setCurrentStep,
  } = usePathways();

  const { searchClient } = useAlgoliaSearch();
  const enterpriseCustomerResult = useEnterpriseCustomer();
  const enterpriseCustomer = (enterpriseCustomerResult.data || {}) as { uuid?: string };
  const searchCatalogs = useSearchCatalogs();

  const isDebug = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === 'true';
  }, []);

  const renderContent = useMemo(() => {
    switch (currentStep) {
      case 'intake':
        return (
          <IntakeForm
            onSubmit={async (args) => { await generateProfile(args); }}
            isSubmitting={isLoading}
          />
        );
      case 'profile':
        if (isLoading) return <LoadingState />;
        if (error) return <ErrorState message={error.message} />;
        if (!learnerProfile) return <ErrorState message="No profile found" />;
        return (
          <UserProfile
            profile={learnerProfile}
            selectedCareer={selectedCareer}
            onSelectCareer={selectCareer}
            onBuildPathway={generatePathway}
            isGenerating={isLoading}
          />
        );
      case 'pathway':
        if (isLoading) return <LoadingState />;
        if (error) return <ErrorState message={error.message} />;
        if (!searchIntent || !searchClient) return <ErrorState message="No results data available" />;
        return (
          <InstantSearchWrapper
            searchClient={searchClient}
            indexName={getConfig().ALGOLIA_INDEX_NAME_JOBS}
            initialIntent={searchIntent}
            context={{
              enterpriseCustomerUuid: enterpriseCustomer.uuid,
              catalogQueryUuids: searchCatalogs,
              locale: getSupportedLocale(),
            }}
          >
            <TaxonomyResultList
              results={taxonomyResults}
              filters={taxonomyFilters}
              onAdjustPathway={() => setCurrentStep('intake')}
            />
          </InstantSearchWrapper>
        );
      default:
        return <div>Not Found</div>;
    }
  }, [
    currentStep,
    learnerProfile,
    searchIntent,
    selectedCareer,
    pathway,
    taxonomyResults,
    taxonomyFilters,
    isLoading,
    error,
    generateProfile,
    selectCareer,
    generatePathway,
    setCurrentStep,
    searchClient,
    enterpriseCustomer.uuid,
    searchCatalogs,
  ]);

  return (
    <div className="ai-pathways-page pb-5">
      <div className="py-4">
        <header className="mb-4">
          <h2 className="h3 font-weight-bold">AI Learning Pathways</h2>
          <p className="text-muted">A personalized prototype for AI-generated learning roadmaps.</p>
        </header>
        <main>
          {isDebug && <FacetBootstrapDebug filters={taxonomyFilters} />}
          {renderContent}
        </main>
      </div>
    </div>
  );
};
