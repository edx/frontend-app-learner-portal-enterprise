import React from 'react';
import { Badge } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import IntakeIntroCollapsible from './IntakeIntroCollapsible';
import IntakePrivacyHelper from './IntakePrivacyHelper';
import messages from './messages';

const IntakeHeader = () => {
  const intl = useIntl();

  return (
    <header data-testid="intake-header">
      <div className="d-flex align-items-center justify-content-center mb-4">
        <h1 className="h2 mb-0">
          {intl.formatMessage(messages.heading)}
        </h1>
        <Badge variant="info" className="ml-2 text-uppercase font-weight-bold">
          {intl.formatMessage(messages.beta)}
        </Badge>
      </div>
      <IntakeIntroCollapsible />
      <div
        data-testid="intake-helper-message"
        className="d-flex align-items-center mt-3"
      >
        <span className="small text-muted">
          {intl.formatMessage(messages.helperText)}
        </span>
        <IntakePrivacyHelper />
      </div>
    </header>
  );
};

export default IntakeHeader;
