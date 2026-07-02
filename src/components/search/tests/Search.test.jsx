import { screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { SearchContext } from '@2uinc/frontend-enterprise-catalog-search';
import { LEARNING_TYPE_EXECUTIVE_EDUCATION } from '@2uinc/frontend-enterprise-catalog-search/data/constants';
import { AppContext } from '@edx/frontend-platform/react';
import {
  resetMockReactInstantSearch,
  setFakeHits,
  getCapturedInstantSearchProps,
  resetCapturedInstantSearchProps,
} from '../../skills-quiz/__mocks__/react-instantsearch-dom';
import { generateTestPermutations, renderWithRouter } from '../../../utils/tests';
import '@testing-library/jest-dom';
import Search from '../Search';
import {
  useAlgoliaSearch,
  useCanOnlyViewHighlights,
  useDefaultSearchFilters,
  useEnterpriseCustomer,
  useHasValidLicenseOrSubscriptionRequestsEnabled,
} from '../../app/data';
import { enterpriseCustomerFactory } from '../../app/data/services/data/__factories__';
import { features } from '../../../config';
import { messages } from '../../search-unavailable-alert/SearchUnavailableAlert';

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useSubscriptions: jest.fn(() => ({
    data: {
      subscriptionLicense: {
        status: 'activated',
        subscriptionPlan: { isCurrent: true },
      },
    },
  })),
  useAlgoliaSearch: jest.fn(),
  useRedeemablePolicies: jest.fn(() => ({ data: { redeemablePolicies: [] } })),
  useCouponCodes: jest.fn(() => ({ data: { couponCodeAssignments: [] } })),
  useEnterpriseOffers: jest.fn(() => ({ data: { currentEnterpriseOffers: [] } })),
  useBrowseAndRequestConfiguration: jest.fn(() => ({ data: {} })),
  useContentHighlightsConfiguration: jest.fn(() => ({ data: {} })),
  useCanOnlyViewHighlights: jest.fn(() => ({ data: false })),
  useIsAssignmentsOnlyLearner: jest.fn().mockReturnValue(false),
  useDefaultSearchFilters: jest.fn(),
  useHasValidLicenseOrSubscriptionRequestsEnabled: jest.fn(),
}));

jest.mock('../../../utils/optimizely', () => ({
  ...jest.requireActual('../../../utils/optimizely'),
  pushEvent: jest.fn(),
}));
const searchContext4 = {
  refinements: { content_type: undefined },
  dispatch: () => null,
};
const initialAppState = {
  authenticatedUser: { userId: 'test-user-id' },
};

jest.mock('@2uinc/frontend-enterprise-catalog-search', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-catalog-search'),
  SearchHeader: jest.fn(() => <div data-testid="search-header" />),
}));

const SearchWrapper = ({
  appState = initialAppState,
  searchContext = searchContext4,
  children,
}) => (
  <IntlProvider locale="en">
    <AppContext.Provider value={appState}>
      <SearchContext.Provider value={searchContext}>
        {children}
      </SearchContext.Provider>
    </AppContext.Provider>
  </IntlProvider>
);
const mockEnterpriseCustomer = enterpriseCustomerFactory();
const mockFilter = `enterprise_customer_uuids: ${mockEnterpriseCustomer.uuid}`;
const mockSearchClient = { search: jest.fn(), appId: 'test-app-id' };
const mockSearchIndex = { indexName: 'mock-index-name' };
describe('<Search />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useDefaultSearchFilters.mockReturnValue(mockFilter);
    useHasValidLicenseOrSubscriptionRequestsEnabled.mockReturnValue(true);
    useAlgoliaSearch.mockReturnValue({
      searchClient: mockSearchClient,
      searchIndex: mockSearchIndex,
    });
  });
  afterEach(() => {
    resetMockReactInstantSearch();
    resetCapturedInstantSearchProps();
  });
  it('renders the video beta banner component', () => {
    features.FEATURE_ENABLE_VIDEO_CATALOG = true;
    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );
    expect(screen.getByText('Videos Now Available with Your Subscription')).toBeInTheDocument();
  });
  it('renders correctly when no search results are found', () => {
    setFakeHits([]);

    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );

    expect(screen.queryByText('Videos Now Available with Your Subscription')).toBeNull();
  });
  it('renders SearchPathway with the resolved index name when ENABLE_PATHWAYS is true', () => {
    const originalEnablePathways = features.ENABLE_PATHWAYS;
    features.ENABLE_PATHWAYS = true;
    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );
    expect(screen.getByText('Pathways (2 results)')).toBeInTheDocument();
    features.ENABLE_PATHWAYS = originalEnablePathways;
  });
  it('renders SearchProgram with the resolved index name when ENABLE_PROGRAMS is true', () => {
    const originalEnablePrograms = features.ENABLE_PROGRAMS;
    features.ENABLE_PROGRAMS = true;
    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );
    expect(screen.getByText('Programs (2 results)')).toBeInTheDocument();
    features.ENABLE_PROGRAMS = originalEnablePrograms;
  });
  it('renders the Executive Education section and hides other content sections when Executive Education is selected', () => {
    const originalEnablePrograms = features.ENABLE_PROGRAMS;
    const originalEnablePathways = features.ENABLE_PATHWAYS;
    const originalEnableVideoCatalog = features.FEATURE_ENABLE_VIDEO_CATALOG;
    features.ENABLE_PROGRAMS = true;
    features.ENABLE_PATHWAYS = true;
    features.FEATURE_ENABLE_VIDEO_CATALOG = true;
    useEnterpriseCustomer.mockReturnValue({
      data: enterpriseCustomerFactory({ enableAcademies: true }),
    });

    renderWithRouter(
      <SearchWrapper
        searchContext={{
          refinements: {
            content_type: undefined,
            learning_type: [LEARNING_TYPE_EXECUTIVE_EDUCATION],
          },
          dispatch: () => null,
        }}
      >
        <Search />
      </SearchWrapper>,
    );

    expect(screen.getByText('Executive Education (2 results)')).toBeInTheDocument();
    expect(screen.queryByText('Programs (2 results)')).not.toBeInTheDocument();
    expect(screen.queryByText('Courses (2 results)')).not.toBeInTheDocument();
    expect(screen.queryByText('Pathways (2 results)')).not.toBeInTheDocument();
    expect(screen.queryByText('Videos (2 results)')).not.toBeInTheDocument();
    expect(screen.queryByText('Academies (2 results)')).not.toBeInTheDocument();

    features.ENABLE_PROGRAMS = originalEnablePrograms;
    features.ENABLE_PATHWAYS = originalEnablePathways;
    features.FEATURE_ENABLE_VIDEO_CATALOG = originalEnableVideoCatalog;
  });
  it('passes the resolved index name from useAlgoliaSearch to InstantSearch', () => {
    useAlgoliaSearch.mockReturnValue({
      searchClient: mockSearchClient,
      searchIndex: { indexName: 'enterprise_catalog_v2' },
    });
    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );
    const [instantSearchProps] = getCapturedInstantSearchProps();
    expect(instantSearchProps.indexName).toBe('enterprise_catalog_v2');
  });
  it.each(
    generateTestPermutations({
      canOnlyViewHighlights: [true, false],
      searchClient: [null, mockSearchClient],
    }),
  )('renders the search client error page if no search client is found', ({
    canOnlyViewHighlights,
    searchClient,
  }) => {
    useAlgoliaSearch.mockReturnValue({
      searchClient,
      searchIndex: searchClient ? mockSearchIndex : null,
    });
    useCanOnlyViewHighlights.mockReturnValue({ data: canOnlyViewHighlights });
    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );

    if (!searchClient && !canOnlyViewHighlights) {
      expect(screen.getByText(messages.alertHeading.defaultMessage)).toBeInTheDocument();
      expect(screen.getByText(messages.alertText.defaultMessage)).toBeInTheDocument();
      expect(screen.getByText(messages.alertTextOptionsHeader.defaultMessage)).toBeInTheDocument();
      expect(screen.getByText(messages.alertTextOptionRefresh.defaultMessage)).toBeInTheDocument();
      expect(screen.getByText(messages.alertTextOptionNetwork.defaultMessage)).toBeInTheDocument();
      expect(screen.getByText(messages.alertTextOptionSupport.defaultMessage)).toBeInTheDocument();
    } else if (searchClient || canOnlyViewHighlights) {
      expect(screen.queryByText(messages.alertHeading.defaultMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(messages.alertText.defaultMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(messages.alertTextOptionsHeader.defaultMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(messages.alertTextOptionRefresh.defaultMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(messages.alertTextOptionNetwork.defaultMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(messages.alertTextOptionSupport.defaultMessage)).not.toBeInTheDocument();
    }
  });
});
