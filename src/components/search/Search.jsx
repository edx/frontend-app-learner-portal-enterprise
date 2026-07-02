import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Configure, InstantSearch } from 'react-instantsearch-dom';
import { SearchContext, SearchHeader } from '@2uinc/frontend-enterprise-catalog-search';
import { LEARNING_TYPE_EXECUTIVE_EDUCATION } from '@2uinc/frontend-enterprise-catalog-search/data/constants';
import { Container, Stack, useToggle } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import { NUM_RESULTS_PER_PAGE } from './constants';
import SearchProgram from './SearchProgram';
import SearchCourse from './SearchCourse';
import { ContentHighlights } from './content-highlights';
import CustomSearchFilters from './CustomSearchFilters';
import { features } from '../../config';

import { IntegrationWarningModal } from '../integration-warning-modal';
import { EnterpriseOffersBalanceAlert } from '../enterprise-user-subsidy';
import SearchPathway from './SearchPathway';
import PathwayModal from '../pathway/PathwayModal';
import SearchAcademy from './SearchAcademy';
import AssignmentsOnlyEmptyState from './AssignmentsOnlyEmptyState';
import {
  useAlgoliaSearch,
  useCanOnlyViewHighlights,
  useContentTypeFilter,
  useDefaultSearchFilters,
  useEnterpriseCustomer,
  useEnterpriseOffers,
  useHasValidLicenseOrSubscriptionRequestsEnabled,
  useIsAssignmentsOnlyLearner,
} from '../app/data';
import ContentTypeSearchResultsContainer from './ContentTypeSearchResultsContainer';
import SearchVideo from './SearchVideo';
import VideoBanner from '../microlearning/VideoBanner';
import CustomSubscriptionExpirationModal from '../custom-expired-subscription-modal';
import { SearchUnavailableAlert } from '../search-unavailable-alert';

function useSearchPathwayModal() {
  const [isLearnerPathwayModalOpen, openLearnerPathwayModal, close] = useToggle(false);
  const { pathwayUUID } = useParams();
  // If a pathwayUUID exists, open the pathway modal.
  useEffect(() => {
    if (pathwayUUID) {
      openLearnerPathwayModal();
    }
  }, [openLearnerPathwayModal, pathwayUUID]);

  return {
    pathwayUUID,
    isLearnerPathwayModalOpen,
    closePathwayModal: close,
  };
}

const Search = () => {
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const hasValidLicenseOrSubRequest = useHasValidLicenseOrSubscriptionRequestsEnabled();
  const intl = useIntl();
  const navigate = useNavigate();

  const { refinements } = useContext(SearchContext);
  const {
    content_type: contentType,
    learning_type: learningType,
  } = refinements;
  const isExecutiveEducationSelected = learningType?.includes(LEARNING_TYPE_EXECUTIVE_EDUCATION);

  const executiveEducationSectionTitle = intl.formatMessage({
    id: 'enterprise.search.page.executive.education.section.translated.title',
    defaultMessage: 'Executive Education',
    description: 'Translated title for the enterprise search page executive education section.',
  });

  const filters = useDefaultSearchFilters();
  const {
    courseFilter,
    programFilter,
    pathwayFilter,
    videoFilter,
    contentTypeFilter,
  } = useContentTypeFilter({ filter: filters, contentType: contentType?.[0] });

  const {
    searchIndex,
    searchClient,
  } = useAlgoliaSearch();

  // Flag to toggle highlights visibility
  const { data: canOnlyViewHighlightSets } = useCanOnlyViewHighlights();
  const isAssignmentOnlyLearner = useIsAssignmentsOnlyLearner();
  const {
    data: {
      hasLowEnterpriseOffersBalance,
      hasNoEnterpriseOffersBalance,
      canEnrollWithEnterpriseOffers,
    },
  } = useEnterpriseOffers();
  const shouldDisplayBalanceAlert = hasNoEnterpriseOffersBalance || hasLowEnterpriseOffersBalance;

  const {
    pathwayUUID,
    isLearnerPathwayModalOpen,
    closePathwayModal,
  } = useSearchPathwayModal();

  const [shouldShowVideosBanner, setShouldShowVideosBanner] = useState(false);

  const enableVideos = (
    canOnlyViewHighlightSets === false
    && features.FEATURE_ENABLE_VIDEO_CATALOG
    && hasValidLicenseOrSubRequest
  );

  const showVideosBanner = useCallback(() => {
    setShouldShowVideosBanner(true);
  }, []);

  const hideVideosBanner = useCallback(() => {
    setShouldShowVideosBanner(false);
  }, []);

  const PAGE_TITLE = intl.formatMessage({
    id: 'enterprise.search.page.title',
    defaultMessage: 'Search Courses and Programs - {enterpriseName}',
    description: 'Title for the enterprise search page.',
  }, {
    enterpriseName: enterpriseCustomer.name,
  });
  const HEADER_TITLE = intl.formatMessage({
    id: 'enterprise.search.page.header.title',
    defaultMessage: 'Search Courses and Programs',
    description: 'Title for the enterprise search page header.',
  });

  // If the learner only has content assignments available, show the assignments-only empty state.
  if (isAssignmentOnlyLearner) {
    return (
      <>
        <Helmet title={PAGE_TITLE} />
        <AssignmentsOnlyEmptyState />
      </>
    );
  }

  const hasRefinements = Object.keys(refinements).filter(refinement => refinement !== 'showAll').length > 0 && (contentType !== undefined ? contentType.length > 0 : true);

  if (!searchClient) {
    return (
      <>
        <CustomSubscriptionExpirationModal />
        <Helmet title={PAGE_TITLE} />
        <Stack className="my-5" gap={5}>
          {canEnrollWithEnterpriseOffers && shouldDisplayBalanceAlert && (
            <EnterpriseOffersBalanceAlert hasNoEnterpriseOffersBalance={hasNoEnterpriseOffersBalance} />
          )}
          {!hasRefinements && <ContentHighlights />}
          {canOnlyViewHighlightSets === false
            && (
              <Container data-testid="search-unavailable-alert-container" size="lg">
                <SearchUnavailableAlert />
              </Container>
            )}
        </Stack>
      </>
    );
  }

  return (
    <>
      <CustomSubscriptionExpirationModal />
      <Helmet title={PAGE_TITLE} />
      <InstantSearch
        indexName={searchIndex.indexName}
        searchClient={searchClient}
      >
        <Configure facetingAfterDistinct filters={filters} />
        {contentType?.length > 0 && (
          <Configure
            hitsPerPage={NUM_RESULTS_PER_PAGE}
            filters={contentTypeFilter}
            clickAnalytics
          />
        )}
        {canOnlyViewHighlightSets === false && (
          <div className="search-header-wrapper">
            <SearchHeader
              containerSize="lg"
              headerTitle={features.ENABLE_PROGRAMS ? HEADER_TITLE : ''}
              index={searchIndex}
              filters={filters}
              enterpriseConfig={enterpriseCustomer}
              filterComponents={(
                <div className="d-flex flex-wrap w-100">
                  <CustomSearchFilters />
                </div>
              )}
            />
          </div>
        )}
        <PathwayModal
          learnerPathwayUuid={pathwayUUID}
          isOpen={isLearnerPathwayModalOpen}
          onClose={() => {
            navigate(`/${enterpriseCustomer.slug}/search`);
            closePathwayModal();
          }}
        />
        {canEnrollWithEnterpriseOffers && shouldDisplayBalanceAlert && (
          <EnterpriseOffersBalanceAlert hasNoEnterpriseOffersBalance={hasNoEnterpriseOffersBalance} />
        )}

        {/* No content type refinement  */}
        {!contentType?.length
          ? (
            <Stack className="my-5" gap={5}>
              {shouldShowVideosBanner && <VideoBanner />}
              {!hasRefinements && <ContentHighlights />}
              {canOnlyViewHighlightSets === false
              && enterpriseCustomer.enableAcademies
              && !isExecutiveEducationSelected
              && <SearchAcademy />}
              {features.ENABLE_PATHWAYS
              && (canOnlyViewHighlightSets === false)
              && !isExecutiveEducationSelected
              && <SearchPathway filter={pathwayFilter} indexName={searchIndex.indexName} />}
              {features.ENABLE_PROGRAMS && (canOnlyViewHighlightSets === false) && !isExecutiveEducationSelected
              && <SearchProgram filter={programFilter} indexName={searchIndex.indexName} />}
              {canOnlyViewHighlightSets === false
              && (
                <SearchCourse
                  filter={courseFilter}
                  indexName={searchIndex.indexName}
                  sectionTitle={isExecutiveEducationSelected ? executiveEducationSectionTitle : undefined}
                />
              )}
              {enableVideos && !isExecutiveEducationSelected && (
                <SearchVideo
                  filter={videoFilter}
                  showVideosBanner={showVideosBanner}
                  hideVideosBanner={hideVideosBanner}
                  indexName={searchIndex.indexName}
                />
              )}
            </Stack>
          )
        /* render a single contentType if the refinement
            exists and is either a course, program or learnerpathway */
          : (
            <ContentTypeSearchResultsContainer
              contentType={contentType[0]}
              indexName={searchIndex.indexName}
              sectionTitle={isExecutiveEducationSelected && contentType[0] === 'course' ? executiveEducationSectionTitle : undefined}
            />
          )}
      </InstantSearch>
      <IntegrationWarningModal isEnabled={enterpriseCustomer.showIntegrationWarning} />
    </>
  );
};

export default Search;
