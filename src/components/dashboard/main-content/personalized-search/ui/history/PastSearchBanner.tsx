import { Alert } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

export interface PastSearchBannerProps {
  created: string;
}

/** Shown while a reopened session is displayed as stored; sending a message continues it. */
const PastSearchBanner = ({ created }: PastSearchBannerProps) => {
  const intl = useIntl();
  return (
    <Alert variant="info" className="mb-3">
      {intl.formatMessage(messages.pastSearch, { date: intl.formatDate(created, { dateStyle: 'medium' }) })}
    </Alert>
  );
};

export default PastSearchBanner;
