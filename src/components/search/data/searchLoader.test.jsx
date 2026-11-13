import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { getConfig } from '@edx/frontend-platform/config';
import { when } from 'jest-when';
import { renderWithRouterProvider } from '../../../utils/tests';
import makeSearchLoader from './searchLoader';
import {
  extractEnterpriseCustomer,
  queryAcademiesList,
  queryContentHighlightSets,
  resolveCanViewAcademies,
} from '../../app/data';
import { ensureAuthenticatedUser } from '../../app/routes/data/utils';
import { enterpriseCustomerFactory } from '../../app/data/services/data/__factories__';

jest.mock('../../app/routes/data/utils', () => ({
  ...jest.requireActual('../../app/routes/data/utils'),
  ensureAuthenticatedUser: jest.fn(),
}));
jest.mock('../../app/data', () => ({
  ...jest.requireActual('../../app/data'),
  extractEnterpriseCustomer: jest.fn(),
  resolveCanViewAcademies: jest.fn(),
}));

jest.mock('@edx/frontend-platform/config', () => ({
  getConfig: jest.fn(),
}));

const mockEnterpriseCustomer = enterpriseCustomerFactory();

const mockAcademies = [
  {
    uuid: 'test-academy-uuid-1',
  },
];

const mockQueryClient = {
  ensureQueryData: jest.fn().mockResolvedValue({}),
  getQueryData: jest.fn().mockReturnValue(mockAcademies),
};

describe('searchLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ensureAuthenticatedUser.mockResolvedValue({ userId: 3 });
    extractEnterpriseCustomer.mockResolvedValue(mockEnterpriseCustomer);
    resolveCanViewAcademies.mockResolvedValue(true);
    getConfig.mockReturnValue({
      FEATURE_CONTENT_HIGHLIGHTS: false,
    });
  });

  it('does nothing with unauthenticated users', async () => {
    ensureAuthenticatedUser.mockResolvedValue(null);
    renderWithRouterProvider({
      path: '/:enterpriseSlug/search/:pathwayUUID?',
      element: <div>hello world</div>,
      loader: makeSearchLoader(mockQueryClient),
    }, [
      {
        initialEntries: ['/test-enterprise-slug/search'],
      },
    ]);

    expect(await screen.findByText('hello world')).toBeInTheDocument();

    expect(mockQueryClient.ensureQueryData).not.toHaveBeenCalled();
  });

  it('ensures the requisite search data is resolved without content highlights', async () => {
    renderWithRouterProvider({
      path: '/:enterpriseSlug/search/:pathwayUUID?',
      element: <div>hello world</div>,
      loader: makeSearchLoader(mockQueryClient),
    }, [
      {
        initialEntries: ['/test-enterprise-slug/search'],
      },
    ]);

    expect(await screen.findByText('hello world')).toBeInTheDocument();

    expect(mockQueryClient.ensureQueryData).toHaveBeenCalledTimes(1);
    expect(mockQueryClient.ensureQueryData).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryAcademiesList(mockEnterpriseCustomer.uuid).queryKey,
        queryFn: expect.any(Function),
      }),
    );
    expect(mockQueryClient.ensureQueryData).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryContentHighlightSets(mockEnterpriseCustomer.uuid).queryKey,
        queryFn: expect.any(Function),
      }),
    );
  });

  it('ensures the requisite search data is resolved with content highlights', async () => {
    getConfig.mockReturnValue({
      FEATURE_CONTENT_HIGHLIGHTS: true,
    });
    renderWithRouterProvider({
      path: '/:enterpriseSlug/search/:pathwayUUID?',
      element: <div>hello world</div>,
      loader: makeSearchLoader(mockQueryClient),
    }, [
      {
        initialEntries: ['/test-enterprise-slug/search'],
      },
    ]);

    expect(await screen.findByText('hello world')).toBeInTheDocument();

    expect(mockQueryClient.ensureQueryData).toHaveBeenCalledTimes(2);
    expect(mockQueryClient.ensureQueryData).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryAcademiesList(mockEnterpriseCustomer.uuid).queryKey,
        queryFn: expect.any(Function),
      }),
    );
    expect(mockQueryClient.ensureQueryData).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryContentHighlightSets(mockEnterpriseCustomer.uuid).queryKey,
        queryFn: expect.any(Function),
      }),
    );
  });

  it('Redirect learners whose enterprise has enabled one academy.', async () => {
    extractEnterpriseCustomer.mockResolvedValue(enterpriseCustomerFactory({ enable_one_academy: true }));
    const academiesQuery = queryAcademiesList(mockEnterpriseCustomer.uuid);

    when(mockQueryClient.ensureQueryData).calledWith(
      expect.objectContaining({
        queryKey: academiesQuery.queryKey,
      }),
    ).mockResolvedValue(mockAcademies);
    ensureAuthenticatedUser.mockResolvedValue({ userId: 3, username: 'test-user' });

    renderWithRouterProvider({
      path: '/:enterpriseSlug/search/:pathwayUUID?',
      element: <div data-testid="search-page" />,
      loader: makeSearchLoader(mockQueryClient),
    }, {
      routes: [
        {
          path: '/:enterpriseCustomer/academies/:academyUUID',
          element: <div data-testid="academy-details-page" />,
        },
      ],
      initialEntries: [`/${mockEnterpriseCustomer.slug}/search`],
    });

    // Validate user is redirected to the academy details page.
    await waitFor(() => {
      expect(screen.getByTestId('academy-details-page')).toBeInTheDocument();
    });
  });

  it('Does not redirect the learners if enterprise one academy is not enabled.', async () => {
    extractEnterpriseCustomer.mockResolvedValue(mockEnterpriseCustomer);
    const academiesQuery = queryAcademiesList(mockEnterpriseCustomer.uuid);
    when(mockQueryClient.ensureQueryData).calledWith(
      expect.objectContaining({
        queryKey: academiesQuery.queryKey,
      }),
    ).mockResolvedValue(mockAcademies);
    ensureAuthenticatedUser.mockResolvedValue({ userId: 3, username: 'test-user' });

    renderWithRouterProvider({
      path: '/:enterpriseSlug/search/:pathwayUUID?',
      element: <div data-testid="search-page" />,
      loader: makeSearchLoader(mockQueryClient),
    }, {
      routes: [
        {
          path: '/:enterpriseCustomer/academies/:academyUUID',
          element: <div data-testid="academy-details-page" />,
        },
      ],
      initialEntries: [`/${mockEnterpriseCustomer.slug}/search`],
    });

    // Validate user is not redirected to the academy details page.
    await waitFor(() => {
      expect(screen.getByTestId('search-page')).toBeInTheDocument();
    });
  });

  it('does not fetch the academies list for academy-ineligible customers', async () => {
    resolveCanViewAcademies.mockResolvedValue(false);
    getConfig.mockReturnValue({
      FEATURE_CONTENT_HIGHLIGHTS: true,
    });

    renderWithRouterProvider({
      path: '/:enterpriseSlug/search/:pathwayUUID?',
      element: <div>hello world</div>,
      loader: makeSearchLoader(mockQueryClient),
    }, [
      {
        initialEntries: ['/test-enterprise-slug/search'],
      },
    ]);

    expect(await screen.findByText('hello world')).toBeInTheDocument();

    expect(mockQueryClient.ensureQueryData).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryAcademiesList(mockEnterpriseCustomer.uuid).queryKey,
      }),
    );
    // Content highlights are unaffected by academy eligibility.
    expect(mockQueryClient.ensureQueryData).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryContentHighlightSets(mockEnterpriseCustomer.uuid).queryKey,
        queryFn: expect.any(Function),
      }),
    );
  });

  it('does not redirect academy-ineligible learners whose enterprise has enabled one academy', async () => {
    resolveCanViewAcademies.mockResolvedValue(false);
    extractEnterpriseCustomer.mockResolvedValue(enterpriseCustomerFactory({
      enable_academies: true,
      enable_one_academy: true,
    }));
    ensureAuthenticatedUser.mockResolvedValue({ userId: 3, username: 'test-user' });

    renderWithRouterProvider({
      path: '/:enterpriseSlug/search/:pathwayUUID?',
      element: <div data-testid="search-page" />,
      loader: makeSearchLoader(mockQueryClient),
    }, {
      routes: [
        {
          path: '/:enterpriseCustomer/academies/:academyUUID',
          element: <div data-testid="academy-details-page" />,
        },
      ],
      initialEntries: [`/${mockEnterpriseCustomer.slug}/search`],
    });

    await waitFor(() => {
      expect(screen.getByTestId('search-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('academy-details-page')).not.toBeInTheDocument();
  });

  describe('when "Find a Course" is disabled for the enterprise customer', () => {
    it('redirects to the dashboard', async () => {
      getConfig.mockReturnValue({
        FEATURE_CONTENT_HIGHLIGHTS: false,
        FEATURE_DISABLE_FIND_A_COURSE_FOR_ENTERPRISE_CUSTOMER: mockEnterpriseCustomer.uuid,
      });

      renderWithRouterProvider({
        path: '/:enterpriseSlug/search/:pathwayUUID?',
        element: <div data-testid="search-page" />,
        loader: makeSearchLoader(mockQueryClient),
      }, {
        routes: [{ path: '/:enterpriseSlug', element: <div data-testid="dashboard-page" /> }],
        initialEntries: [`/${mockEnterpriseCustomer.slug}/search`],
      });

      expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('search-page')).not.toBeInTheDocument();
    });

    it('still redirects a one-academy customer to their academy rather than the dashboard', async () => {
      const oneAcademyCustomer = enterpriseCustomerFactory({ enable_one_academy: true });
      extractEnterpriseCustomer.mockResolvedValue(oneAcademyCustomer);
      getConfig.mockReturnValue({
        FEATURE_CONTENT_HIGHLIGHTS: false,
        FEATURE_DISABLE_FIND_A_COURSE_FOR_ENTERPRISE_CUSTOMER: oneAcademyCustomer.uuid,
      });

      renderWithRouterProvider({
        path: '/:enterpriseSlug/search/:pathwayUUID?',
        element: <div data-testid="search-page" />,
        loader: makeSearchLoader(mockQueryClient),
      }, {
        routes: [
          { path: '/:enterpriseSlug/academies/:academyUUID', element: <div data-testid="academy-details-page" /> },
          { path: '/:enterpriseSlug', element: <div data-testid="dashboard-page" /> },
        ],
        initialEntries: [`/${oneAcademyCustomer.slug}/search`],
      });

      expect(await screen.findByTestId('academy-details-page')).toBeInTheDocument();
    });

    it('does not redirect pathway detail pages (/search/:pathwayUUID)', async () => {
      getConfig.mockReturnValue({
        FEATURE_CONTENT_HIGHLIGHTS: false,
        FEATURE_DISABLE_FIND_A_COURSE_FOR_ENTERPRISE_CUSTOMER: mockEnterpriseCustomer.uuid,
      });

      renderWithRouterProvider({
        path: '/:enterpriseSlug/search/:pathwayUUID?',
        element: <div data-testid="search-page" />,
        loader: makeSearchLoader(mockQueryClient),
      }, {
        routes: [{ path: '/:enterpriseSlug', element: <div data-testid="dashboard-page" /> }],
        initialEntries: [`/${mockEnterpriseCustomer.slug}/search/test-pathway-uuid`],
      });

      expect(await screen.findByTestId('search-page')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
    });

    it('does not redirect other customers', async () => {
      getConfig.mockReturnValue({
        FEATURE_CONTENT_HIGHLIGHTS: false,
        FEATURE_DISABLE_FIND_A_COURSE_FOR_ENTERPRISE_CUSTOMER: '11111111-1111-1111-1111-111111111111',
      });

      renderWithRouterProvider({
        path: '/:enterpriseSlug/search/:pathwayUUID?',
        element: <div data-testid="search-page" />,
        loader: makeSearchLoader(mockQueryClient),
      }, {
        routes: [{ path: '/:enterpriseSlug', element: <div data-testid="dashboard-page" /> }],
        initialEntries: [`/${mockEnterpriseCustomer.slug}/search`],
      });

      expect(await screen.findByTestId('search-page')).toBeInTheDocument();
    });
  });
});
