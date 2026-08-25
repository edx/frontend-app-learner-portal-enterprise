import { renderHook } from '@testing-library/react';

import useCanViewAcademies from './useCanViewAcademies';
import useEnterpriseLearner from './useEnterpriseLearner';
import { useBrowseAndRequestConfiguration } from './useBrowseAndRequest';
import useSubscriptions from './useSubscriptions';
import { LICENSE_STATUS } from '../../../enterprise-user-subsidy/data/constants';
import { SUBSIDY_TYPE } from '../../../../constants';
import { enterpriseCustomerFactory } from '../services/data/__factories__';

jest.mock('./useEnterpriseLearner');
jest.mock('./useBrowseAndRequest');
jest.mock('./useSubscriptions');

const mockEnterpriseCustomer = enterpriseCustomerFactory({ enable_academies: true });

const mockActivatedLicense = {
  status: LICENSE_STATUS.ACTIVATED,
  subscriptionPlan: { isCurrent: true },
};

const mockLinkedEnterpriseCustomerUsers = [
  { enterpriseCustomer: mockEnterpriseCustomer },
];

describe('useCanViewAcademies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnterpriseLearner.mockReturnValue({
      data: {
        enterpriseCustomer: mockEnterpriseCustomer,
        allLinkedEnterpriseCustomerUsers: mockLinkedEnterpriseCustomerUsers,
      },
    });
    useSubscriptions.mockReturnValue({
      data: { subscriptionLicense: mockActivatedLicense },
    });
    useBrowseAndRequestConfiguration.mockReturnValue({
      data: { subsidyRequestsEnabled: false, subsidyType: SUBSIDY_TYPE.LICENSE },
    });
  });

  it('returns true for an entitled customer with a linked user holding an activated, current license', () => {
    const { result } = renderHook(() => useCanViewAcademies());
    expect(result.current).toBe(true);
  });

  it('returns true when the linked user has no license but can request one via browse & request', () => {
    useSubscriptions.mockReturnValue({ data: { subscriptionLicense: null } });
    useBrowseAndRequestConfiguration.mockReturnValue({
      data: { subsidyRequestsEnabled: true, subsidyType: SUBSIDY_TYPE.LICENSE },
    });

    const { result } = renderHook(() => useCanViewAcademies());
    expect(result.current).toBe(true);
  });

  it('returns false when the customer does not have the Academies entitlement enabled', () => {
    const enterpriseCustomerWithoutAcademies = enterpriseCustomerFactory({ enable_academies: false });
    useEnterpriseLearner.mockReturnValue({
      data: {
        enterpriseCustomer: enterpriseCustomerWithoutAcademies,
        allLinkedEnterpriseCustomerUsers: [
          { enterpriseCustomer: enterpriseCustomerWithoutAcademies },
        ],
      },
    });

    const { result } = renderHook(() => useCanViewAcademies());
    expect(result.current).toBe(false);
  });

  it('returns false when the user is not linked to the enterprise customer', () => {
    useEnterpriseLearner.mockReturnValue({
      data: {
        enterpriseCustomer: mockEnterpriseCustomer,
        allLinkedEnterpriseCustomerUsers: [],
      },
    });

    const { result } = renderHook(() => useCanViewAcademies());
    expect(result.current).toBe(false);
  });

  it.each([
    { status: LICENSE_STATUS.REVOKED, subscriptionPlan: { isCurrent: true } },
    { status: LICENSE_STATUS.ASSIGNED, subscriptionPlan: { isCurrent: true } },
    { status: LICENSE_STATUS.ACTIVATED, subscriptionPlan: { isCurrent: false } },
    null,
  ])('returns false without active learner access (license: %j)', (subscriptionLicense) => {
    useSubscriptions.mockReturnValue({ data: { subscriptionLicense } });

    const { result } = renderHook(() => useCanViewAcademies());
    expect(result.current).toBe(false);
  });

  it('returns false when browse & request is enabled for a non-subscription subsidy type', () => {
    useSubscriptions.mockReturnValue({ data: { subscriptionLicense: null } });
    useBrowseAndRequestConfiguration.mockReturnValue({
      data: { subsidyRequestsEnabled: true, subsidyType: SUBSIDY_TYPE.COUPON },
    });

    const { result } = renderHook(() => useCanViewAcademies());
    expect(result.current).toBe(false);
  });

  it('returns false when there is no resolved enterprise customer', () => {
    useEnterpriseLearner.mockReturnValue({
      data: { enterpriseCustomer: null, allLinkedEnterpriseCustomerUsers: [] },
    });

    const { result } = renderHook(() => useCanViewAcademies());
    expect(result.current).toBe(false);
  });
});
