import { QueryClient } from '@tanstack/react-query';
import { resolveCanViewAcademies, safeEnsureQueryDataEnterpriseOffers } from './utils';
import {
  queryBrowseAndRequestConfiguration,
  queryEnterpriseLearner,
  queryEnterpriseLearnerDashboardBFF,
  queryEnterpriseLearnerOffers,
  queryEnterpriseLearnerSearchBFF,
  querySubscriptions,
} from './queries';
import { LICENSE_STATUS } from '../../../enterprise-user-subsidy/data/constants';
import { SUBSIDY_TYPE } from '../../../../constants';

// Mock the queries module
jest.mock('./queries', () => ({
  queryEnterpriseLearnerOffers: jest.fn(),
  queryEnterpriseLearner: jest.fn(),
  queryEnterpriseLearnerDashboardBFF: jest.fn(),
  queryEnterpriseLearnerSearchBFF: jest.fn(),
  queryEnterpriseLearnerAcademyBFF: jest.fn(),
  queryEnterpriseLearnerSkillsQuizBFF: jest.fn(),
  querySubscriptions: jest.fn(),
  queryBrowseAndRequestConfiguration: jest.fn(),
}));

// eslint-disable-next-line max-len
const mockQueryEnterpriseLearnerOffers = queryEnterpriseLearnerOffers as jest.MockedFunction<typeof queryEnterpriseLearnerOffers>;

describe('safeEnsureQueryDataEnterpriseOffers', () => {
  let queryClient: QueryClient;
  let enterpriseCustomer: { uuid: string };
  let mockEnsureQueryData: jest.SpyInstance;
  let mockSetQueryData: jest.SpyInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    enterpriseCustomer = { uuid: 'test-enterprise-uuid' };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock QueryClient methods
    mockEnsureQueryData = jest.spyOn(queryClient, 'ensureQueryData');
    mockSetQueryData = jest.spyOn(queryClient, 'setQueryData');

    // Setup default mock return values
    mockQueryEnterpriseLearnerOffers.mockReturnValue({
      // @ts-ignore
      queryKey: ['enterprise', 'test-enterprise-uuid', 'subsidies', 'enterpriseOffers'],
      queryFn: jest.fn(),
    });
  });

  it('should return hardcoded data when query succeeds', async () => {
    const expectedReturnValue = {
      enterpriseOffers: [],
      currentEnterpriseOffers: [],
      canEnrollWithEnterpriseOffers: false,
      hasCurrentEnterpriseOffers: false,
      hasLowEnterpriseOffersBalance: false,
      hasNoEnterpriseOffersBalance: true,
    };

    mockEnsureQueryData.mockResolvedValue(expectedReturnValue);

    const result = await safeEnsureQueryDataEnterpriseOffers({
      queryClient,
      enterpriseCustomer,
    });

    // Verify queryEnterpriseLearnerOffers was called with correct UUID
    expect(mockQueryEnterpriseLearnerOffers).toHaveBeenCalledWith('test-enterprise-uuid');

    // Verify ensureQueryData was called with correct query configuration
    expect(mockEnsureQueryData).toHaveBeenCalledWith({
      queryKey: ['enterprise', 'test-enterprise-uuid', 'subsidies', 'enterpriseOffers'],
      queryFn: expect.any(Function),
      retry: false,
    });

    expect(result).toEqual(expectedReturnValue);
  });

  it('should return hardcoded data from queryFn', async () => {
    let capturedQuery: any;

    mockEnsureQueryData.mockImplementation(async (query) => {
      capturedQuery = query;
      return query.queryFn();
    });

    const result = await safeEnsureQueryDataEnterpriseOffers({
      queryClient,
      enterpriseCustomer,
    });

    // Test the queryFn returns hardcoded data
    expect(result).toEqual({
      enterpriseOffers: [],
      currentEnterpriseOffers: [],
      canEnrollWithEnterpriseOffers: false,
      hasCurrentEnterpriseOffers: false,
      hasLowEnterpriseOffersBalance: false,
      hasNoEnterpriseOffersBalance: true,
    });

    // Verify retry is false
    expect(capturedQuery.retry).toBe(false);
  });

  it('should handle different enterprise customer UUID', async () => {
    const differentEnterpriseCustomer = { uuid: 'different-uuid' };

    mockQueryEnterpriseLearnerOffers.mockReturnValue({
      // @ts-ignore
      queryKey: ['enterprise', 'different-uuid', 'subsidies', 'enterpriseOffers'],
      queryFn: jest.fn(),
    });

    mockEnsureQueryData.mockResolvedValue({});

    await safeEnsureQueryDataEnterpriseOffers({
      queryClient,
      enterpriseCustomer: differentEnterpriseCustomer,
    });

    expect(mockQueryEnterpriseLearnerOffers).toHaveBeenCalledWith('different-uuid');
    expect(mockEnsureQueryData).toHaveBeenCalledWith({
      queryKey: ['enterprise', 'different-uuid', 'subsidies', 'enterpriseOffers'],
      queryFn: expect.any(Function),
      retry: false,
    });
  });

  it('should return fallback data when query fails', async () => {
    const error = new Error('Query failed');
    mockEnsureQueryData.mockRejectedValue(error);

    const result = await safeEnsureQueryDataEnterpriseOffers({
      queryClient,
      enterpriseCustomer,
    });

    // Should return fallback data
    expect(result).toEqual({
      enterpriseOffers: [],
      currentEnterpriseOffers: [],
      canEnrollWithEnterpriseOffers: false,
      hasCurrentEnterpriseOffers: false,
      hasLowEnterpriseOffersBalance: false,
      hasNoEnterpriseOffersBalance: false,
    });

    // Should set fallback data in query cache
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['enterprise', 'test-enterprise-uuid', 'subsidies', 'enterpriseOffers'],
      {
        enterpriseOffers: [],
        currentEnterpriseOffers: [],
        canEnrollWithEnterpriseOffers: false,
        hasCurrentEnterpriseOffers: false,
        hasLowEnterpriseOffersBalance: false,
        hasNoEnterpriseOffersBalance: false,
      },
    );
  });
});

const mockQueryEnterpriseLearner = queryEnterpriseLearner as jest.MockedFunction<typeof queryEnterpriseLearner>;
const mockQueryDashboardBFF = queryEnterpriseLearnerDashboardBFF as jest.MockedFunction<
typeof queryEnterpriseLearnerDashboardBFF
>;
const mockQuerySearchBFF = queryEnterpriseLearnerSearchBFF as jest.MockedFunction<
typeof queryEnterpriseLearnerSearchBFF
>;
const mockQuerySubscriptions = querySubscriptions as jest.MockedFunction<typeof querySubscriptions>;
const mockQueryBrowseAndRequestConfiguration = queryBrowseAndRequestConfiguration as jest.MockedFunction<
typeof queryBrowseAndRequestConfiguration
>;

const mockEnterpriseCustomer = { uuid: 'test-enterprise-uuid', enableAcademies: true } as EnterpriseCustomer;
const mockAuthenticatedUser = { username: 'edx', userId: 3 } as AuthenticatedUser;
const mockEnterpriseSlug = 'test-enterprise';

const mockActivatedLicense = {
  status: LICENSE_STATUS.ACTIVATED,
  subscriptionPlan: { isCurrent: true },
};
const mockLinkedEnterpriseCustomerUsers = [{ enterpriseCustomer: { uuid: mockEnterpriseCustomer.uuid } }];

describe('resolveCanViewAcademies', () => {
  let queryClient: QueryClient;
  let mockEnsureQueryData: jest.SpyInstance;
  // Query responses keyed by the first segment of the query key, so that the several
  // `ensureQueryData` calls made within a single `resolveCanViewAcademies` call can be
  // resolved independently of the order in which they happen to be issued.
  let queryResponses: Record<string, any>;

  const buildQuery = (queryKey: string[]) => ({ queryKey, queryFn: jest.fn() }) as any;

  // On BFF-enabled routes a single BFF response backs both the linked-customer check and the
  // learner's subscriptions, so both are configured together here.
  const buildBFFResponse = ({
    subscriptionLicense = undefined as any,
    allLinkedEnterpriseCustomerUsers = mockLinkedEnterpriseCustomerUsers,
  } = {}) => ({
    allLinkedEnterpriseCustomerUsers,
    enterpriseCustomerUserSubsidies: { subscriptions: { subscriptionLicense } },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockQueryEnterpriseLearner.mockImplementation(
      (username, enterpriseSlug) => buildQuery(['enterpriseLearner', username as string, enterpriseSlug as string]),
    );
    mockQueryDashboardBFF.mockImplementation(({ enterpriseSlug }) => buildQuery(['bffDashboard', enterpriseSlug]));
    mockQuerySearchBFF.mockImplementation(({ enterpriseSlug }) => buildQuery(['bffSearch', enterpriseSlug]));
    mockQuerySubscriptions.mockImplementation((uuid) => buildQuery(['subscriptions', uuid as string]));
    mockQueryBrowseAndRequestConfiguration.mockImplementation(
      (uuid) => buildQuery(['browseAndRequest', uuid as string]),
    );

    // Linked learner, no subscription access, no browse & request; individual tests override.
    queryResponses = {
      enterpriseLearner: { allLinkedEnterpriseCustomerUsers: mockLinkedEnterpriseCustomerUsers },
      bffDashboard: buildBFFResponse(),
      bffSearch: buildBFFResponse(),
      subscriptions: {},
      browseAndRequest: null,
    };

    mockEnsureQueryData = jest.spyOn(queryClient, 'ensureQueryData').mockImplementation(
      async (query: any) => queryResponses[query.queryKey[0]],
    );
  });

  const callResolveCanViewAcademies = ({
    pathname = `/${mockEnterpriseSlug}/search`,
    enterpriseCustomer = mockEnterpriseCustomer,
  } = {}) => resolveCanViewAcademies({
    requestUrl: new URL(`http://localhost:8734${pathname}`),
    queryClient,
    authenticatedUser: mockAuthenticatedUser,
    enterpriseSlug: mockEnterpriseSlug,
    enterpriseCustomer,
  });

  it('returns false without issuing any queries when Academies are not enabled for the customer', async () => {
    const result = await callResolveCanViewAcademies({
      enterpriseCustomer: { ...mockEnterpriseCustomer, enableAcademies: false } as EnterpriseCustomer,
    });

    expect(result).toBe(false);
    expect(mockEnsureQueryData).not.toHaveBeenCalled();
  });

  it('returns false without issuing any queries when there is no resolved enterprise customer', async () => {
    const result = await callResolveCanViewAcademies({
      enterpriseCustomer: null as unknown as EnterpriseCustomer,
    });

    expect(result).toBe(false);
    expect(mockEnsureQueryData).not.toHaveBeenCalled();
  });

  it('returns false for a staff user who is not linked to the resolved enterprise customer', async () => {
    // An activated license alone must not grant access when the user is not a learner of the customer.
    queryResponses.bffSearch = buildBFFResponse({
      subscriptionLicense: mockActivatedLicense,
      allLinkedEnterpriseCustomerUsers: [{ enterpriseCustomer: { uuid: 'some-other-enterprise-uuid' } }],
    });

    const result = await callResolveCanViewAcademies();

    expect(result).toBe(false);
    // Short-circuits before the subscriptions/browse & request lookups.
    expect(mockQueryBrowseAndRequestConfiguration).not.toHaveBeenCalled();
  });

  it('returns true for a linked learner with an activated, current license from the route BFF response', async () => {
    queryResponses.bffSearch = buildBFFResponse({ subscriptionLicense: mockActivatedLicense });

    const result = await callResolveCanViewAcademies();

    expect(result).toBe(true);
    // Reads back the route's own BFF response rather than issuing a dashboard BFF request.
    expect(mockQuerySearchBFF).toHaveBeenCalledWith({ enterpriseSlug: mockEnterpriseSlug });
    expect(mockQueryDashboardBFF).not.toHaveBeenCalled();
    expect(mockQuerySubscriptions).not.toHaveBeenCalled();
  });

  it('returns false for a linked learner whose license is not activated and current', async () => {
    queryResponses.bffSearch = buildBFFResponse({
      subscriptionLicense: { status: LICENSE_STATUS.ASSIGNED, subscriptionPlan: { isCurrent: true } },
    });

    await expect(callResolveCanViewAcademies()).resolves.toBe(false);
  });

  it('returns true for a linked learner without a license when subscription requests are enabled', async () => {
    queryResponses.browseAndRequest = {
      subsidyRequestsEnabled: true,
      subsidyType: SUBSIDY_TYPE.LICENSE,
    };

    await expect(callResolveCanViewAcademies()).resolves.toBe(true);
  });

  it('returns false when browse & request is enabled for a subsidy type other than licenses', async () => {
    queryResponses.browseAndRequest = {
      subsidyRequestsEnabled: true,
      subsidyType: SUBSIDY_TYPE.COUPON,
    };

    await expect(callResolveCanViewAcademies()).resolves.toBe(false);
  });

  it('returns false when reading the route BFF response back for subscriptions fails', async () => {
    // The first BFF read backs the linked-customer check; the subsequent read is the guarded one.
    let bffReadCount = 0;
    mockEnsureQueryData.mockImplementation(async (query: any) => {
      if (query.queryKey[0] === 'bffSearch') {
        bffReadCount += 1;
        if (bffReadCount > 1) {
          throw new Error('BFF request failed');
        }
      }
      return queryResponses[query.queryKey[0]];
    });

    await expect(callResolveCanViewAcademies()).resolves.toBe(false);
  });

  it('resolves the subscription license via the subscriptions query on non-BFF routes', async () => {
    queryResponses.subscriptions = { subscriptionLicense: mockActivatedLicense };
    queryResponses.bffDashboard = null;

    const result = await callResolveCanViewAcademies({
      pathname: `/${mockEnterpriseSlug}/videos/test-video-uuid`,
    });

    expect(result).toBe(true);
    expect(mockQuerySubscriptions).toHaveBeenCalledWith(mockEnterpriseCustomer.uuid);
    expect(mockQuerySearchBFF).not.toHaveBeenCalled();
    // The legacy enterprise learner query backs the linked-customer check off-BFF routes.
    expect(mockQueryEnterpriseLearner).toHaveBeenCalledWith(mockAuthenticatedUser.username, mockEnterpriseSlug);
  });
});
