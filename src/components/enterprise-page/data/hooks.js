import { useState, useEffect } from 'react';
import { logError } from '@edx/frontend-platform/logging';
import { camelCaseObject } from '@edx/frontend-platform/utils';

import colors from '../../../colors.scss';
import {
  fetchEnterpriseCustomerConfig,
  fetchEnterpriseCustomerSubscriptionPlan,
} from './service';

export const defaultPrimaryColor = colors?.primary;
export const defaultSecondaryColor = colors?.info100;
export const defaultTertiaryColor = colors?.info500;

const defaultBrandingConfig = {
  logo: null,
  primaryColor: defaultPrimaryColor,
  secondaryColor: defaultSecondaryColor,
  tertiaryColor: defaultTertiaryColor,
};

/**
 * @param {string} [enterpriseSlug] enterprise slug.
 * @returns {object} EnterpriseConfig
 */
export function useEnterpriseCustomerConfig(enterpriseSlug) {
  const [enterpriseConfig, setEnterpriseConfig] = useState();

  useEffect(() => {
    fetchEnterpriseCustomerConfig(enterpriseSlug)
      .then((response) => {
        const { results } = camelCaseObject(response.data);
        const config = results.pop();
        if (config?.enableLearnerPortal) {
          const brandingConfiguration = config.brandingConfiguration || defaultBrandingConfig;
          const disableSearch = !!(!config?.enableIntegratedCustomerLearnerPortalSearch && config?.identityProvider);
          const showIntegrationWarning = !!(!disableSearch && config?.identityProvider);
          const {
            logo,
            primaryColor,
            secondaryColor,
            tertiaryColor,
          } = brandingConfiguration;
          const {
            name,
            uuid,
            slug,
            contactEmail,
            hideCourseOriginalPrice,
          } = config;
          setEnterpriseConfig({
            name,
            uuid,
            slug,
            contactEmail,
            hideCourseOriginalPrice,
            disableSearch,
            showIntegrationWarning,
            branding: {
              logo,
              colors: {
                primary: primaryColor || defaultPrimaryColor,
                secondary: secondaryColor || defaultSecondaryColor,
                tertiary: tertiaryColor || defaultTertiaryColor,
              },
            },
          });
        } else {
          setEnterpriseConfig(null);
        }
      })
      .catch((error) => {
        logError(new Error(error));
        setEnterpriseConfig(null);
      });
  }, [enterpriseSlug]);

  return enterpriseConfig;
}

export function useEnterpriseCustomerSubscriptionPlan(enterpriseConfig) {
  const [subscriptionPlan, setSubscriptionPlan] = useState();

  useEffect(() => {
    if (enterpriseConfig && enterpriseConfig.uuid) {
      fetchEnterpriseCustomerSubscriptionPlan(enterpriseConfig.uuid)
        .then((response) => {
          const { results } = camelCaseObject(response.data);
          const activePlans = results.filter(plan => plan.isActive);
          if (activePlans.length) {
            setSubscriptionPlan(activePlans.pop());
          } else {
            setSubscriptionPlan(null);
          }
        })
        .catch((error) => {
          logError(new Error(error));
          setSubscriptionPlan(null);
        });
    }
  }, [enterpriseConfig]);

  return subscriptionPlan;
}
