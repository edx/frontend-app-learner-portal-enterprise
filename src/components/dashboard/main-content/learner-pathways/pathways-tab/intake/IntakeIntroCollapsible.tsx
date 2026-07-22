import React from 'react';
import { Collapsible } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './messages';

const IntakeIntroCollapsible = () => {
  const intl = useIntl();

  return (
    <section data-testid="intake-collapsible-info">
      <Collapsible title={intl.formatMessage(messages.introCollapsibleTitle)}>
        <ol className="mb-0 pl-4 py-1">
          <li className="mb-3">
            <p className="font-weight-bold mb-1">
              {intl.formatMessage(messages.introStepOneTitle)}
            </p>
            <ul className="mb-0" style={{ listStyleType: 'disc' }}>
              <li className="bold">
                {intl.formatMessage(messages.introStepOneBody)}
              </li>
            </ul>
          </li>
          <li className="mb-3">
            <p className="font-weight-bold mb-1">
              {intl.formatMessage(messages.introStepTwoTitle)}
            </p>
            <ul className="mb-0" style={{ listStyleType: 'disc' }}>
              <li className="mb-0">
                {intl.formatMessage(messages.introStepTwoBody)}
              </li>
            </ul>
          </li>
          <li>
            <p className="font-weight-bold mb-1">
              {intl.formatMessage(messages.introStepThreeTitle)}
            </p>
            <ul className="mb-0" style={{ listStyleType: 'disc' }}>
              <li className="mb-1">
                {intl.formatMessage(messages.introStepThreeBodyLineOne)}
              </li>
              <li className="mb-0">
                {intl.formatMessage(messages.introStepThreeBodyLineTwo)}
              </li>
            </ul>
          </li>
        </ol>
      </Collapsible>
    </section>
  );
};

export default IntakeIntroCollapsible;
