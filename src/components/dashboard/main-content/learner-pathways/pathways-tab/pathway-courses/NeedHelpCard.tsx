import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, Hyperlink, MailtoLink } from '@openedx/paragon';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

export interface NeedHelpCardProps {
  courseSearchUrl: string;
  contactEmail?: string | string[] | null;
  helpCenterUrl: string;
}

/**
 * Presentational support card shown at the end of the pathway courses page.
 * Inputs are already-resolved link destinations; this component has no
 * awareness of enterprise context, routing, or state.
 */
const NeedHelpCard = ({ courseSearchUrl, contactEmail, helpCenterUrl }: NeedHelpCardProps) => {
  const intl = useIntl();

  return (
    <Card className="mt-3" data-testid="pathway-need-help">
      <Card.Body className="p-4">
        <h3 className="mb-2">{intl.formatMessage(messages.needHelpTitle)}</h3>
        <p className="mb-0">
          <FormattedMessage
            {...messages.needHelpMessage}
            /*
             * React Intl requires rich-text placeholders to be callback renderers.
             * They are invoked to produce nodes and are not mounted as component types,
             * so they do not cause the remount/state-loss issue targeted by this rule.
             * The accepted tradeoff is new callback identities and minor allocations on
             * each render, which are negligible for this small, infrequently rendered card.
             */
            /* eslint-disable react/no-unstable-nested-components */
            values={{
              searchLink: (chunks: ReactNode) => <Link to={courseSearchUrl}>{chunks}</Link>,
              adminLink: (chunks: ReactNode) => (
                contactEmail
                  ? <MailtoLink to={contactEmail} target="_blank">{chunks}</MailtoLink>
                  : chunks
              ),
              helpLink: (chunks: ReactNode) => (
                <Hyperlink destination={helpCenterUrl} target="_blank">{chunks}</Hyperlink>
              ),
            }}
            /* eslint-enable react/no-unstable-nested-components */
          />
        </p>
      </Card.Body>
    </Card>
  );
};

export default NeedHelpCard;
