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
import { SEARCH_INDEX_IDS } from '../../constants';

const LATEST_OFFERINGS_ATTRIBUTE = 'is_new_content';
const RECENTLY_ADDED_FACET_VALUE = 'true';

const hasLatestOfferingFacetHits = (searchResults) => {
  if (!searchResults) {
    return false;
  }

  const rawFacetCount = Number(
    searchResults.facets?.[LATEST_OFFERINGS_ATTRIBUTE]?.[RECENTLY_ADDED_FACET_VALUE],
  );
  if (Number.isFinite(rawFacetCount)) {
    return rawFacetCount > 0;
  }

  if (typeof searchResults.getFacetValues === 'function') {
    const facetValues = searchResults.getFacetValues(LATEST_OFFERINGS_ATTRIBUTE);
    const values = Array.isArray(facetValues)
      ? facetValues
      : facetValues?.data || [];
    const recentlyAddedFacet = values.find(
      ({ name }) => String(name) === RECENTLY_ADDED_FACET_VALUE,
    );
    return Number(recentlyAddedFacet?.count) > 0;
  }

  return false;
};

// connectStateResults binds to the nearest <Index>, so this component must be
// rendered inside the course <Index> to read course-filtered facet counts only.
const LatestOfferingsFacetBanner = connectStateResults(
  ({ searchResults, onSeeWhatsNew }) => (
    hasLatestOfferingFacetHits(searchResults)
      ? <VideoBanner onSeeWhatsNew={onSeeWhatsNew} />
      : null
  ),
);

const scrollToCourseSection = () => {
  const courseHeading = document.getElementById(SEARCH_INDEX_IDS.COURSE);
  const courseSection = courseHeading?.closest('.search-results') || courseHeading;

  if (!courseSection) {
    return false;
  }

  courseSection.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });

  return true;
};

const useSearchPathwayModal = () => {
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
};

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
  const canViewCatalog = canOnlyViewHighlightSets === false;
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

  const enableVideos = (
    canViewCatalog
    && features.FEATURE_ENABLE_VIDEO_CATALOG
    && hasValidLicenseOrSubRequest
  );
  const [, setPendingCourseScroll] = useState(false);

  const handleCourseSectionUpdated = useCallback(() => {
    setPendingCourseScroll((wasPending) => {
      if (!wasPending) {
        return false;
      }
      window.requestAnimationFrame(() => {
        scrollToCourseSection();
      });
      return false;
    });
  }, []);

  const handleSeeWhatsNew = useCallback(() => {
    dispatch(setRefinementAction(LATEST_OFFERINGS_ATTRIBUTE, [RECENTLY_ADDED_FACET_VALUE]));
    setPendingCourseScroll(true);
  }, [dispatch]);

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
          {canViewCatalog
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
        {canViewCatalog && (
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
        {canViewCatalog && !contentType?.length && (
          <Index indexName={searchIndex.indexName} indexId={SEARCH_INDEX_IDS.COURSE}>
            <Container size="lg" className="mt-4">
              <LatestOfferingsFacetBanner onSeeWhatsNew={handleSeeWhatsNew} />
            </Container>
          </Index>
        )}

        {/* No content type refinement  */}
        {!contentType?.length
          ? (
            <Stack className="my-5" gap={5}>
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
                  indexName={searchIndex.indexName}
                />
              )}
            </Stack>
          )
        /* render a single contentType if the refinement
            exists and is either a course, program or learnerpathway */
          : <ContentTypeSearchResultsContainer contentType={contentType[0]} indexName={searchIndex.indexName} />}
      </InstantSearch>
      <IntegrationWarningModal isEnabled={enterpriseCustomer.showIntegrationWarning} />
    </>
  );
};

export default Search;
