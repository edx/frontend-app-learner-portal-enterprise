import React from 'react';
import { Collapsible } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './messages';

const IntakeIntroCollapsible: React.FC = () => {
  const intl = useIntl();

  return (
    <section data-testid="intake-collapsible-info">
      <Collapsible title={intl.formatMessage(messages.introCollapsibleTitle)}>
        <ol className="mb-0 pl-4 py-1">
          <li className="mb-3">
            <p className="font-weight-bold mb-1">
              {intl.formatMessage(messages.introStepOneTitle)}
            </p>
            <p className="mb-0">
              {intl.formatMessage(messages.introStepOneBody)}
            </p>
          </li>
          <li className="mb-3">
            <p className="font-weight-bold mb-1">
              {intl.formatMessage(messages.introStepTwoTitle)}
            </p>
            <p className="mb-0">
              {intl.formatMessage(messages.introStepTwoBody)}
            </p>
          </li>
          <li>
            <p className="font-weight-bold mb-1">
              {intl.formatMessage(messages.introStepThreeTitle)}
            </p>
            <p className="mb-1">
              {intl.formatMessage(messages.introStepThreeBodyLineOne)}
            </p>
            <p className="mb-0">
              {intl.formatMessage(messages.introStepThreeBodyLineTwo)}
            </p>
          </li>
        </ol>
      </Collapsible>
    </section>
  );
};

export default IntakeIntroCollapsible;
