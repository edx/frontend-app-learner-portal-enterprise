import React from 'react';
import {
  Icon,
  IconButton,
  OverlayTrigger,
  Tooltip,
} from '@openedx/paragon';
import { InfoOutline } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './messages';

const IntakePrivacyHelper = () => {
  const intl = useIntl();

  return (
    <div className="flex-shrink-0 ml-2">
      <OverlayTrigger
        trigger={['hover', 'focus']}
        placement="right"
        overlay={(
          <Tooltip id="intake-privacy-helper-tooltip">
            <p className="mb-2 text-left">
              {intl.formatMessage(messages.privacyTooltipFirstLine)}
            </p>
            <p className="mb-0 text-left">
              {intl.formatMessage(messages.privacyTooltipSecondLine)}
            </p>
          </Tooltip>
        )}
      >
        <IconButton
          src={InfoOutline}
          iconAs={Icon}
          alt={intl.formatMessage(messages.privacyTriggerLabel)}
          variant="primary"
          size="inline"
        />
      </OverlayTrigger>
    </div>
  );
};

export default IntakePrivacyHelper;
