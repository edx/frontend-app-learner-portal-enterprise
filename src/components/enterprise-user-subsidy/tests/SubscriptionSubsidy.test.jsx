import React from 'react';
import moment from 'moment';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import SubscriptionSubsidy from '../SubscriptionSubsidy';

import { renderWithRouter } from '../../../utils/tests';
import { LICENSE_STATUS } from '../data/constants';

jest.mock('../data/service');
jest.mock('../offers/data/service');

const TEST_SUBSCRIPTION_UUID = 'test-subscription-uuid';
const TEST_LICENSE_UUID = 'test-license-uuid';
const TEST_ENTERPRISE_SLUG = 'test-enterprise-slug';

// eslint-disable-next-line react/prop-types

describe('SubscriptionSubsidy', () => {
  const defaultEnterpriseConfig = { slug: TEST_ENTERPRISE_SLUG };
  describe('without subscription plan', () => {
    test('does not redirect to Dashboard page from non-Dashboard page route', async () => {
      const Component = <SubscriptionSubsidy subscriptionPlan={null} enterpriseConfig={defaultEnterpriseConfig} />;
      const { history } = renderWithRouter(Component, {
        route: `/${TEST_ENTERPRISE_SLUG}/search`,
      });

      // assert we did NOT get redirected
      expect(history.location.pathname).toEqual(`/${TEST_ENTERPRISE_SLUG}/search`);
    });
  });

  describe('with subscription plan that is expired or has not yet started', () => {
    const startDate = moment().subtract(1, 'y');
    const expirationDate = moment().subtract(1, 'w');
    const subscriptionPlan = {
      uuid: TEST_SUBSCRIPTION_UUID,
      startDate: startDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
    };

    test('renders alert if plan has not started or has already ended', async () => {
      const Component = (
        <SubscriptionSubsidy
          enterpriseConfig={defaultEnterpriseConfig}
          plan={subscriptionPlan}
        />
      );
      renderWithRouter(Component, {
        route: `/${TEST_ENTERPRISE_SLUG}`,
      });

      // assert status alert message renders
      await waitFor(() => {
        const activationMessage = 'does not have an active subscription plan';
        expect(screen.queryByRole('alert')).toBeInTheDocument();
        expect(screen.queryByText(activationMessage, { exact: false })).toBeInTheDocument();
      });
    });
  });

  describe('with subscription plan that has started, but not yet ended, no offers', () => {
    const subscriptionPlan = {
      uuid: TEST_SUBSCRIPTION_UUID,
      startDate: moment().subtract(1, 'w').toISOString(),
      expirationDate: moment().add(1, 'y').toISOString(),
    };

    test('renders license activation alert if user has an assigned (pending) license on Dashboard page route', () => {
      const license = {
        uuid: TEST_LICENSE_UUID,
        status: LICENSE_STATUS.ASSIGNED,
      };

      const Component = (
        <SubscriptionSubsidy
          enterpriseConfig={defaultEnterpriseConfig}
          license={license}
          plan={subscriptionPlan}
        />
      );
      renderWithRouter(Component, {
        route: `/${TEST_ENTERPRISE_SLUG}`,
      });

      // assert status alert message renders
      const activationMessage = 'activate your enterprise license';
      expect(screen.queryByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText(activationMessage, { exact: false })).toBeInTheDocument();
    });

    test('renders license deactivation alert if user has a revoked license on Dashboard page route', () => {
      const license = {
        uuid: TEST_LICENSE_UUID,
        status: LICENSE_STATUS.REVOKED,
      };
      const Component = (
        <SubscriptionSubsidy
          enterpriseConfig={defaultEnterpriseConfig}
          license={license}
          plan={subscriptionPlan}
        />
      );
      renderWithRouter(Component, {
        route: `/${TEST_ENTERPRISE_SLUG}`,
      });

      // assert status alert message renders

      const deactivationMessage = 'enterprise license is no longer active';
      expect(screen.queryByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText(deactivationMessage, { exact: false })).toBeInTheDocument();
    });

    test('renders unassigned license alert if user does not have an associated license on Dashboard page route', () => {
      const Component = (
        <SubscriptionSubsidy
          enterpriseConfig={defaultEnterpriseConfig}
          plan={subscriptionPlan}
          license={null}
        />
      );
      renderWithRouter(Component, {
        route: `/${TEST_ENTERPRISE_SLUG}`,
      });

      // assert status alert message renders
      const deactivationMessage = 'do not have an enterprise license';
      expect(screen.queryByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText(deactivationMessage, { exact: false })).toBeInTheDocument();
    });

    test('redirects to Dashboard page if user has an assigned (pending) license on non-Dashboard page route', async () => {
      const license = {
        uuid: TEST_LICENSE_UUID,
        status: LICENSE_STATUS.ASSIGNED,
      };

      const Component = (
        <SubscriptionSubsidy
          enterpriseConfig={defaultEnterpriseConfig}
          plan={subscriptionPlan}
          license={license}
        />
      );
      const { history } = renderWithRouter(Component, {
        route: `/${TEST_ENTERPRISE_SLUG}/search`,
      });

      await waitFor(() => {
        expect(history.location.pathname).toEqual(`/${TEST_ENTERPRISE_SLUG}`);
      });
    });

    test('redirects to Dashboard page if user has a revoked license on non-Dashboard page route', async () => {
      const license = {
        uuid: TEST_LICENSE_UUID,
        status: LICENSE_STATUS.REVOKED,
      };

      const Component = (
        <SubscriptionSubsidy
          enterpriseConfig={defaultEnterpriseConfig}
          plan={subscriptionPlan}
          license={license}
        />
      );
      const { history } = renderWithRouter(Component, {
        route: `/${TEST_ENTERPRISE_SLUG}/search`,
      });

      await waitFor(() => {
        expect(history.location.pathname).toEqual(`/${TEST_ENTERPRISE_SLUG}`);
      });
    });
    test('does not redirect if user has an activated license', async () => {
      const license = {
        uuid: TEST_LICENSE_UUID,
        status: LICENSE_STATUS.ACTIVATED,
      };

      const Component = (
        <SubscriptionSubsidy
          enterpriseConfig={defaultEnterpriseConfig}
          plan={subscriptionPlan}
          license={license}
        />
      );
      const { history } = renderWithRouter(Component, {
        route: `/${TEST_ENTERPRISE_SLUG}/search`,
      });
      await waitFor(() => {
        expect(history.location.pathname).toEqual(`/${TEST_ENTERPRISE_SLUG}/search`);
      });
    });
  });
});
