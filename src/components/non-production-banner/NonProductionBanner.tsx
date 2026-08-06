import { useCallback, useState, useEffect } from 'react';
import { PageBanner } from '@openedx/paragon';
import { FormattedMessage } from '@edx/frontend-platform/i18n';

import { useEnterpriseCustomer } from '../app/data';
import {
  getNonProductionBannerDismissalStorageKey,
  isNonProductionBannerDismissalActive,
} from './constants';

/**
 * Warns the learner that they are using a non-production portal. Only rendered for enterprise
 * customers whose customer type is `Non-production` in Django admin. Dismissing the banner hides it
 * for 24 hours.
 */
const NonProductionBanner = () => {
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const storageKey = getNonProductionBannerDismissalStorageKey(enterpriseCustomer?.uuid);
  const [isDismissed, setIsDismissed] = useState(() => isNonProductionBannerDismissalActive(storageKey));

  useEffect(() => {
    setIsDismissed(isNonProductionBannerDismissalActive(storageKey));
  }, [storageKey]);

  const handleDismiss = useCallback(() => {
    global.localStorage.setItem(storageKey, String(Date.now()));
    setIsDismissed(true);
  }, [storageKey]);

  if (!enterpriseCustomer?.showNonProductionBanner) {
    return null;
  }

  return (
    <PageBanner
      variant="accentB"
      show={!isDismissed}
      dismissible
      onDismiss={handleDismiss}
    >
      <FormattedMessage
        id="enterprise.banner.nonProductionEnvironment"
        defaultMessage="Non-Production Environment"
        description="Banner message shown to learners when their organization's portal is a non-production portal."
      />
    </PageBanner>
  );
};

export default NonProductionBanner;
