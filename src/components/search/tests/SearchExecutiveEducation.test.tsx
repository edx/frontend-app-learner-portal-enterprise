import React from 'react';
import { screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { SearchContext } from '@2uinc/frontend-enterprise-catalog-search';
import '@testing-library/jest-dom/extend-expect';

import * as mockReactInstantSearchDom from '../../skills-quiz/__mocks__/react-instantsearch-dom';
import { renderWithRouter } from '../../../utils/tests';
import SearchExecutiveEducation from '../SearchExecutiveEducation';
import { useEnterpriseCustomer } from '../../app/data';
import { enterpriseCustomerFactory } from '../../app/data/services/data/__factories__';

const {
  resetMockReactInstantSearch,
  setFakeHits,
  getCapturedConfigureProps,
  resetCapturedConfigureProps,
} = mockReactInstantSearchDom as unknown as {
  resetMockReactInstantSearch: () => void;
  setFakeHits: (hits: Record<string, unknown>[]) => void;
  getCapturedConfigureProps: () => Record<string, unknown>[];
  resetCapturedConfigureProps: () => void;
};

jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory();
const mockIndexName = 'mock-index-name';
const mockFilter = 'learning_type:"Executive Education" AND content_type:course AND enterprise_customer_uuids:mock-uuid';

const executiveEducationHits = [
  {
    objectID: 'course-1',
    key: 'MITx+AI',
    title: 'MIT Sloan Artificial Intelligence',
    content_type: 'course',
    learning_type: 'Executive Education',
    learning_type_v2: 'Executive Education',
    course_type: 'executive-education-2u',
    card_image_url: 'https://fake.image/1',
    partners: [{ name: 'MIT', logoImageUrl: 'https://fake.image/logo1' }],
  },
  {
    objectID: 'course-2',
    key: 'sonataQ2+0505260101',
    title: 'Short_course',
    content_type: 'course',
    learning_type: 'Executive Education',
    learning_type_v2: 'Executive Education',
    course_type: 'executive-education-2u',
    card_image_url: 'https://fake.image/2',
    partners: [{ name: 'sonic-3', logoImageUrl: null }],
  },
];

const SearchExecutiveEducationWrapper = (
  props: Partial<React.ComponentProps<typeof SearchExecutiveEducation>>,
) => (
  <IntlProvider locale="en">
    <AppContext.Provider value={{ authenticatedUser: { userId: 'test-user-id' } }}>
      <SearchContext.Provider value={{ refinements: {}, dispatch: () => null }}>
        <SearchExecutiveEducation filter={mockFilter} indexName={mockIndexName} {...props} />
      </SearchContext.Provider>
    </AppContext.Provider>
  </IntlProvider>
);

describe('<SearchExecutiveEducation />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetCapturedConfigureProps();
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
  });

  afterEach(() => {
    resetMockReactInstantSearch();
  });

  it('renders Executive Education course hits, including a hit with a null partner logo', () => {
    setFakeHits(executiveEducationHits);

    renderWithRouter(<SearchExecutiveEducationWrapper />);

    expect(screen.getByText('Executive Education (2 results)')).toBeInTheDocument();
    expect(screen.getByText('MIT Sloan Artificial Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Short_course')).toBeInTheDocument();
  });

  it('passes the given filter through to Configure', () => {
    setFakeHits(executiveEducationHits);

    renderWithRouter(<SearchExecutiveEducationWrapper />);

    const [configureProps] = getCapturedConfigureProps();
    expect(configureProps.filters).toEqual(mockFilter);
  });
});
