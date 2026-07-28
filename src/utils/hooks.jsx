import { useCallback } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

export const useRenderContactHelpText = (enterpriseCustomer) => {
  const intl = useIntl();
  const renderContactHelpText = useCallback(
    (LinkComponent = 'a') => {
      const message = intl.formatMessage(messages.contactHelpText);

      if (!enterpriseCustomer.contactEmail) {
        return message;
      }
      return (
        <LinkComponent href={`mailto:${enterpriseCustomer.contactEmail}`}>
          {message}
        </LinkComponent>
      );
    },
    [enterpriseCustomer.contactEmail, intl],
  );

  return renderContactHelpText;
};
