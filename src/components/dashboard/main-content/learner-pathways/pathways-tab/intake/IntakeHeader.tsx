import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import IntakeIntroCollapsible from './IntakeIntroCollapsible';
import IntakePrivacyHelper from './IntakePrivacyHelper';
import messages from './messages';

const IntakeHeader: React.FC = () => {
  const intl = useIntl();

  return (
    <header data-testid="intake-header">
      <h1 className="h2 text-center mb-4">
        {intl.formatMessage(messages.heading)}
      </h1>
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
