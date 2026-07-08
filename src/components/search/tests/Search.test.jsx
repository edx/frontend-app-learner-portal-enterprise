import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { SearchContext } from '@2uinc/frontend-enterprise-catalog-search';
import { AppContext } from '@edx/frontend-platform/react';
import {
  resetMockReactInstantSearch,
  setFakeHits,
  setFakeSearchResultsOverride,
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

const mockSetRefinementAction = jest.fn((...args) => ({ type: 'SET_REFINEMENT', args }));

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
  dispatch: jest.fn(),
};
const initialAppState = {
  authenticatedUser: { userId: 'test-user-id' },
};

jest.mock('@2uinc/frontend-enterprise-catalog-search', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-catalog-search'),
  SearchHeader: jest.fn(() => <div data-testid="search-header" />),
  setRefinementAction: (...args) => mockSetRefinementAction(...args),
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
    mockSetRefinementAction.mockClear();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useDefaultSearchFilters.mockReturnValue(mockFilter);
    useHasValidLicenseOrSubscriptionRequestsEnabled.mockReturnValue(true);
    useCanOnlyViewHighlights.mockReturnValue({ data: false });
    useAlgoliaSearch.mockReturnValue({
      searchClient: mockSearchClient,
      searchIndex: mockSearchIndex,
    });
  });
  afterEach(() => {
    resetMockReactInstantSearch();
    resetCapturedInstantSearchProps();
  });
  it('renders the latest offerings banner component', () => {
    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );
    expect(screen.getByTestId('latest-offerings-banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "See what's new" })).toBeInTheDocument();
  });
  it('renders correctly when no search results are found', () => {
    setFakeHits([]);

    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );

    expect(screen.queryByTestId('latest-offerings-banner')).toBeNull();
  });

  it('does not render banner when facet count for recently added is numeric zero', () => {
    setFakeSearchResultsOverride({
      facets: {
        is_new_content: {
          true: 0,
        },
      },
    });

    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );

    expect(screen.queryByTestId('latest-offerings-banner')).toBeNull();
  });

  it('does not render banner when learner can only view highlight sets', () => {
    useCanOnlyViewHighlights.mockReturnValue({ data: true });

    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );

    expect(screen.queryByTestId('latest-offerings-banner')).toBeNull();
  });

  it('renders banner when getFacetValues fallback reports recently added content', () => {
    setFakeSearchResultsOverride({
      facets: {
        is_new_content: {
          true: 'not-a-number',
        },
      },
      getFacetValues: () => [{ name: 'true', count: 2 }],
    });

    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );

    expect(screen.getByTestId('latest-offerings-banner')).toBeInTheDocument();
  });

  it('does not render banner when getFacetValues fallback has no recently added facet', () => {
    setFakeSearchResultsOverride({
      facets: {
        is_new_content: {
          true: 'not-a-number',
        },
      },
      getFacetValues: () => [],
    });

    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );

    expect(screen.queryByTestId('latest-offerings-banner')).toBeNull();
  });

  it('does not render banner when latest offerings facet count is not numeric and no fallback is available', () => {
    setFakeSearchResultsOverride({
      facets: {
        is_new_content: {
          true: 'not-a-number',
        },
      },
      getFacetValues: undefined,
    });

    renderWithRouter(
      <SearchWrapper>
        <Search />
      </SearchWrapper>,
    );

    expect(screen.queryByTestId('latest-offerings-banner')).toBeNull();
  });

  it('dispatches the recently added refinement and scrolls to the course section when the banner CTA is clicked', async () => {
    const user = userEvent.setup();
    const hadScrollIntoView = Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'scrollIntoView');

    if (!hadScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: () => {},
      });
    }

    const scrollIntoViewSpy = jest
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => {});

    try {
      renderWithRouter(
        <SearchWrapper>
          <Search />
        </SearchWrapper>,
      );

      await user.click(screen.getByRole('button', { name: "See what's new" }));

      expect(mockSetRefinementAction).toHaveBeenCalledWith('is_new_content', ['true']);
      expect(searchContext4.dispatch).toHaveBeenCalledWith({
        type: 'SET_REFINEMENT',
        args: ['is_new_content', ['true']],
      });
      await waitFor(() => {
        expect(scrollIntoViewSpy).toHaveBeenCalled();
      });
    } finally {
      scrollIntoViewSpy.mockRestore();
      if (!hadScrollIntoView) {
        delete HTMLElement.prototype.scrollIntoView;
      }
    }
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
