import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getConfig } from '@edx/frontend-platform/config';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { resetMockReactInstantSearch, setFakeHits } from 'react-instantsearch-dom';

import ContentHighlights from '../ContentHighlights';
import { useCanOnlyViewHighlights, useContentHighlightSets, useEnterpriseCustomer } from '../../../app/data';
import { enterpriseCustomerFactory } from '../../../app/data/services/data/__factories__';

jest.mock('@edx/frontend-platform/config', () => ({
  getConfig: jest.fn(() => ({
    FEATURE_CONTENT_HIGHLIGHTS: true,
  })),
}));

jest.mock('../../../app/data', () => ({
  ...jest.requireActual('../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
  useContentHighlightSets: jest.fn(),
  useCanOnlyViewHighlights: jest.fn(),
  useDefaultSearchFilters: jest.fn(() => ''),
  useContentTypeFilter: jest.fn(() => ({ contentTypeFilter: '' })),
}));

const mockHighlightedContent = {};
const mockHighlightSet = {
  uuid: 'test-highlight-set-uuid',
  cardImageUrl: 'https://image.url',
  enterpriseCuration: 'test-curation-uuid',
  highlightedContent: [mockHighlightedContent],
  isPublished: true,
  title: 'Highlight Set 1',
};

jest.mock('../ContentHighlightSet', () => {
  const Component = () => <div data-testid="content-highlight-set" />;
  Component.Skeleton = function Skeleton() { return <div data-testid="content-highlight-set-skeleton" />; };
  return {
    __esModule: true,
    default: Component,
  };
});

const mockEnterpriseCustomer = enterpriseCustomerFactory();

describe('ContentHighlights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseCustomer.mockReturnValue({ data: mockEnterpriseCustomer });
    useContentHighlightSets.mockReturnValue({ data: [] });
    useCanOnlyViewHighlights.mockReturnValue({ data: false });
  });

  describe('feature flag disabled', () => {
    beforeEach(() => {
      getConfig.mockReturnValue({
        FEATURE_CONTENT_HIGHLIGHTS: false,
      });
    });

    afterEach(() => {
      getConfig.mockReturnValue({
        FEATURE_CONTENT_HIGHLIGHTS: true,
      });
    });

    it('does not render component', () => {
      const { container } = render(<ContentHighlights />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  it('renders existing highlight sets', () => {
    const anotherMockHighlightSet = {
      ...mockHighlightSet,
      title: 'Highlight Set 2',
    };
    useContentHighlightSets.mockReturnValue({
      data: [mockHighlightSet, anotherMockHighlightSet],
    });
    render(<ContentHighlights />);
    expect(screen.queryAllByTestId('content-highlight-set')).toHaveLength(2);
  });

  // `PopularResults` has no hit component for highlights, so it can only render this empty state
  // while the popular index itself returns nothing. See ENT-12344 review notes.
  it('renders the highlights empty state for learners who can only view highlights', () => {
    setFakeHits([]);
    useContentHighlightSets.mockReturnValue({ data: [] });
    useCanOnlyViewHighlights.mockReturnValue({ data: true });
    render(
      <IntlProvider locale="en">
        <ContentHighlights />
      </IntlProvider>,
    );
    expect(screen.getByText('No highlights were found to match your search results.')).toBeInTheDocument();
    expect(screen.getByText('Check out some popular highlights below.')).toBeInTheDocument();
    resetMockReactInstantSearch();
  });
});
