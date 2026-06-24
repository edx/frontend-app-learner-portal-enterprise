import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { SearchContext } from '@2uinc/frontend-enterprise-catalog-search';
import { AppContext } from '@edx/frontend-platform/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { SkillsContextProvider } from '../SkillsContextProvider';
import SearchJobCard from '../SearchJobCard';
import { useAlgoliaSearch, useEnterpriseCustomer } from '../../app/data';
import { getSupportedLocale } from '../../app/data/utils';
import { authenticatedUserFactory, enterpriseCustomerFactory } from '../../app/data/services/data/__factories__';
import {
  resetMockReactInstantSearch, setFakeHits, getCapturedConfigureProps, resetCapturedConfigureProps,
} from '../__mocks__/react-instantsearch-dom';

jest.mock('react-loading-skeleton', () => ({
  __esModule: true,
  default: (props = {}) => <div data-testid={props['data-testid']} />,
}));

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useAlgoliaSearch: jest.fn(),
}));

jest.mock('../../app/data/utils', () => ({
  ...jest.requireActual('../../app/data/utils'),
  getSupportedLocale: jest.fn(() => 'en'),
}));

const mockAuthenticatedUser = authenticatedUserFactory();

const initialAppState = {
  config: {
    LMS_BASE_URL: process.env.LMS_BASE_URL,
  },
  authenticatedUser: mockAuthenticatedUser,
};

const SearchJobCardWithContext = ({
  appState = initialAppState,
  initialSearchState,
  initialJobsState,
}) => (
  <IntlProvider locale="en">
    <AppContext.Provider value={appState}>
      <SearchContext.Provider value={initialSearchState}>
        <SkillsContextProvider initialState={initialJobsState}>
          <SearchJobCard />
        </SkillsContextProvider>
      </SearchContext.Provider>
    </AppContext.Provider>
  </IntlProvider>
);

const TEST_JOB_KEY = 'test-job-key';
const TEST_JOB_TITLE = 'Test Job Title';
const TEST_MEDIAN_SALARY = '100000';
const TEST_JOB_POSTINGS = '4321';
const TRANSFORMED_MEDIAN_SALARY = '$100,000';
const TRANSFORMED_JOB_POSTINGS = '4,321';

const hitObject = {
  hits: [
    {
      name: TEST_JOB_TITLE,
      objectID: TEST_JOB_KEY,
      job_postings: [
        {
          median_salary: TEST_MEDIAN_SALARY,
          unique_postings: TEST_JOB_POSTINGS,
        },
      ],
    },
  ],
};

const mockEnterpriseCustomer = enterpriseCustomerFactory();

const initialSearchState = {
  refinements: { name: [], current_job: ['test-current-job'] },
  dispatch: () => null,
};

const initialJobsState = {
  state: {
    interestedJobs: hitObject.hits,
  },
  dispatch: () => null,
};

const mockAlgoliaSearch = {
  searchClient: {
    search: jest.fn(), appId: 'test-app-id',
  },
  searchIndex: {
    indexName: 'mock-index-name',
  },
};

describe('<SearchJobCard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useAlgoliaSearch.mockReturnValue(mockAlgoliaSearch);
    setFakeHits(hitObject.hits);
    resetCapturedConfigureProps();
  });
  afterEach(() => {
    resetMockReactInstantSearch();
    resetCapturedConfigureProps();
  });
  test('renders the data in job cards correctly', async () => {
    render(
      <SearchJobCardWithContext
        initialAppState={initialAppState}
        initialSearchState={initialSearchState}
        initialJobsState={initialJobsState}
      />,
    );
    expect(await screen.findByText(TEST_JOB_TITLE)).toBeInTheDocument();
    expect(screen.getByText(TRANSFORMED_MEDIAN_SALARY)).toBeInTheDocument();
    expect(screen.getByText(TRANSFORMED_JOB_POSTINGS)).toBeInTheDocument();
  });

  test('does not render salary data when hideLaborMarketData is true ', async () => {
    const mockEnterpriseCustomerWithHideLaborMarketData = enterpriseCustomerFactory({
      hide_labor_market_data: true,
    });
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomerWithHideLaborMarketData });
    render(
      <SearchJobCardWithContext
        initialAppState={initialAppState}
        initialSearchState={initialSearchState}
        initialJobsState={initialJobsState}
      />,
    );
    await waitFor(() => {
      expect(screen.queryByText(TRANSFORMED_MEDIAN_SALARY)).not.toBeInTheDocument();
      expect(screen.queryByText(TRANSFORMED_JOB_POSTINGS)).not.toBeInTheDocument();
    });
  });

  test('applies metadata_language filter with default English locale', async () => {
    getSupportedLocale.mockImplementation(() => 'en');

    render(
      <SearchJobCardWithContext
        initialAppState={initialAppState}
        initialSearchState={initialSearchState}
        initialJobsState={initialJobsState}
      />,
    );

    await waitFor(() => {
      const configureProps = getCapturedConfigureProps();
      expect(configureProps.length).toBeGreaterThan(0);
      const lastCall = configureProps[configureProps.length - 1];
      expect(lastCall.filters).toContain('metadata_language:en');
    });
  });

  test('applies metadata_language filter with Spanish locale', async () => {
    getSupportedLocale.mockImplementation(() => 'es');

    render(
      <SearchJobCardWithContext
        initialAppState={initialAppState}
        initialSearchState={initialSearchState}
        initialJobsState={initialJobsState}
      />,
    );

    await waitFor(() => {
      const configureProps = getCapturedConfigureProps();
      expect(configureProps.length).toBeGreaterThan(0);
      const lastCall = configureProps[configureProps.length - 1];
      expect(lastCall.filters).toContain('metadata_language:es');
    });
  });

  test('includes interested job names in filter when jobs are provided', async () => {
    getSupportedLocale.mockImplementation(() => 'en');
    const testJobs = ['Software Engineer', 'Data Scientist'];
    const searchStateWithJobs = {
      refinements: { name: testJobs, current_job: ['test-current-job'] },
      dispatch: () => null,
    };

    render(
      <SearchJobCardWithContext
        initialAppState={initialAppState}
        initialSearchState={searchStateWithJobs}
        initialJobsState={initialJobsState}
      />,
    );

    await waitFor(() => {
      const configureProps = getCapturedConfigureProps();
      expect(configureProps.length).toBeGreaterThan(0);
      const lastCall = configureProps[configureProps.length - 1];
      // Should include both job names and metadata_language filter
      expect(lastCall.filters).toContain('Software Engineer');
      expect(lastCall.filters).toContain('Data Scientist');
      expect(lastCall.filters).toContain('metadata_language:en');
    });
  });
});
