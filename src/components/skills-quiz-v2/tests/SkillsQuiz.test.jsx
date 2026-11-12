import '@testing-library/jest-dom/extend-expect';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '@edx/frontend-platform/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { SearchData } from '@2uinc/frontend-enterprise-catalog-search';
import { SkillsContextProvider } from '../../skills-quiz/SkillsContextProvider';
import { renderWithRouter } from '../../../utils/tests';
import SkillsQuizV2 from '../SkillsQuiz';
import {
  isFindACourseDisabledForEnterpriseCustomer,
  useAlgoliaSearch,
  useDefaultSearchFilters,
  useEnterpriseCustomer,
} from '../../app/data';
import { authenticatedUserFactory, enterpriseCustomerFactory } from '../../app/data/services/data/__factories__';
import { resetMockReactInstantSearch, setFakeHits } from '../../skills-quiz/__mocks__/react-instantsearch-dom';

// [tech debt] We appear to attempting to call legit Algolia APIs in these tests; lots
// of test output related to Algolia errors. Does not appear to impact the test results.

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  isFindACourseDisabledForEnterpriseCustomer: jest.fn(),
  useEnterpriseCustomer: jest.fn(),
  useAlgoliaSearch: jest.fn(),
  useDefaultSearchFilters: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory();
const mockAuthenticatedUser = authenticatedUserFactory();
const mockAlgoliaSearch = {
  searchClient: {
    search: jest.fn(), appId: 'test-app-id',
  },
  searchIndex: {
    indexName: 'mock-index-name',
    // The quiz fetches recommendations on mount; resolve them so those fetches don't reject
    // asynchronously and fail whichever test happens to be running.
    search: jest.fn().mockResolvedValue({ hits: [], nbHits: 0 }),
  },
};

const defaultAppState = {
  authenticatedUser: mockAuthenticatedUser,
};

const hits = [
  {
    skills: [
      'JavaScript',
      'React',
      'Node.js',
      'Python',
      'Django',
      'SQL',
      'AWS',
    ],
  },
];
describe('<SkillsQuizV2 />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useAlgoliaSearch.mockReturnValue(mockAlgoliaSearch);
    useDefaultSearchFilters.mockReturnValue(`enterprise_customer_uuids:${mockEnterpriseCustomer.uuid}`);
    isFindACourseDisabledForEnterpriseCustomer.mockReturnValue(false);
    setFakeHits(hits);
  });
  afterEach(() => {
    resetMockReactInstantSearch();
  });
  it('renders SkillsQuizV2 component correctly', () => {
    renderWithRouter(
      <IntlProvider locale="en">
        <SearchData>
          <SkillsContextProvider>
            <AppContext.Provider value={defaultAppState}>
              <SkillsQuizV2 />
            </AppContext.Provider>
          </SkillsContextProvider>
        </SearchData>
      </IntlProvider>,
      { route: '/test/skills-quiz/' },
    );

    expect(screen.getByText('Skills Builder')).toBeInTheDocument();
    expect(screen.getByText('Let edX be your guide')).toBeInTheDocument();
    expect(screen.getByText('What roles are you interested in ?')).toBeInTheDocument();
    expect(screen.getByText('Show advanced options')).toBeInTheDocument();
  });

  it.each([
    { isFindACourseDisabled: false, expectedPath: `/${mockEnterpriseCustomer.slug}/search` },
    { isFindACourseDisabled: true, expectedPath: `/${mockEnterpriseCustomer.slug}` },
  ])('navigates to $expectedPath on exit (Find a Course disabled: $isFindACourseDisabled)', async ({
    isFindACourseDisabled,
    expectedPath,
  }) => {
    isFindACourseDisabledForEnterpriseCustomer.mockReturnValue(isFindACourseDisabled);
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    const user = userEvent.setup();
    renderWithRouter(
      <IntlProvider locale="en">
        <SearchData>
          <SkillsContextProvider>
            <AppContext.Provider value={defaultAppState}>
              <SkillsQuizV2 />
            </AppContext.Provider>
          </SkillsContextProvider>
        </SearchData>
      </IntlProvider>,
      { route: '/test/skills-quiz/' },
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(await screen.findByRole('button', { name: 'Exit' }));

    expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
  });
});
