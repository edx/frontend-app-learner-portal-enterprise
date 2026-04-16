import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AIPathwaysTab } from '../AIPathwaysTab';
import { useAlgoliaSearch } from '../../app/data';

jest.mock('@edx/frontend-platform', () => ({
  getConfig: jest.fn(() => ({ ALGOLIA_INDEX_NAME: 'test-index' })),
}));

jest.mock('../../app/data', () => ({
  useAlgoliaSearch: jest.fn(),
}));

jest.mock('../routes/AiPathwaysPage', () => ({
  AiPathwaysPage: () => <div data-testid="pathways-page">Pathways Page</div>,
}));

// Mock react-instantsearch-dom to avoid issues with complex context
jest.mock('react-instantsearch-dom', () => ({
  InstantSearch: ({ children }: any) => <div data-testid="instant-search">{children}</div>,
  Configure: () => <div data-testid="configure" />,
}));

const customRender = (ui: React.ReactElement) => render(
  <IntlProvider locale="en">
    {ui}
  </IntlProvider>,
);

describe('AIPathwaysTab', () => {
  it('renders AiPathwaysPage and InstantSearch when client is available', () => {
    (useAlgoliaSearch as jest.Mock).mockReturnValue({
      searchClient: {},
      searchIndex: { indexName: 'test-index' },
    });

    customRender(<AIPathwaysTab />);

    expect(screen.getByTestId('pathways-page')).toBeInTheDocument();
    expect(screen.getByTestId('instant-search')).toBeInTheDocument();
    expect(screen.getByTestId('configure')).toBeInTheDocument();
  });

  it('renders only AiPathwaysPage when search client is missing', () => {
    (useAlgoliaSearch as jest.Mock).mockReturnValue({
      searchClient: null,
      searchIndex: null,
    });

    customRender(<AIPathwaysTab />);

    expect(screen.getByTestId('pathways-page')).toBeInTheDocument();
    expect(screen.queryByTestId('instant-search')).not.toBeInTheDocument();
  });
});
