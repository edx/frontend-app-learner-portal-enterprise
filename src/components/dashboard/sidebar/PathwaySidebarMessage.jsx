import { Card } from '@openedx/paragon';
import PropTypes from 'prop-types';
import { getConfig } from '@edx/frontend-platform/config';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';

import { useEnterpriseCustomer } from '../../app/data';
import { isPathwayMessageEnabledForEnterpriseCustomer } from '../data/utils';
import pathwayLogo from './images/tag-gdp-pathway-logo.png';

const PathwaySidebarMessage = ({ className }) => {
  const intl = useIntl();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const isPathwayMessageEnabled = isPathwayMessageEnabledForEnterpriseCustomer(
    enterpriseCustomer.uuid,
    getConfig().FEATURE_ENABLE_PATHWAY_MESSAGE_FOR_ENTERPRISE_CUSTOMER,
  );

  if (!isPathwayMessageEnabled) {
    return null;
  }

  return (
    <Card className={className} data-testid="pathway-sidebar-message">
      <Card.Section>
        <h3>
          <FormattedMessage
            id="enterprise.dashboard.sidebar.pathwayMessage.title"
            defaultMessage="Welcome to your pathway"
            description="Title for the learner portal sidebar pathway message, shown only to allowlisted enterprise customers."
          />
        </h3>
        <p>
          <FormattedMessage
            id="enterprise.dashboard.sidebar.pathwayMessage.body"
            defaultMessage="You are completing these courses through the Talal Abu-Ghazaleh Global Digital Polytechnic (TAG.GDPT) learning pathway."
            description="Body text for the learner portal sidebar pathway message, shown only to allowlisted enterprise customers."
          />
        </p>
        <img
          src={pathwayLogo}
          alt={intl.formatMessage({
            id: 'enterprise.dashboard.sidebar.pathwayMessage.logoAltText',
            defaultMessage: 'TAG.GDPT and edX',
            description: 'Alt text for the TAG.GDPT and edX co-branded logo shown in the learner portal sidebar pathway message. "TAG.GDPT" is the literal brand mark printed on the logo image and must not be changed to "TAG.GDP".',
          })}
          className="mt-2 w-100"
        />
      </Card.Section>
    </Card>
  );
};

PathwaySidebarMessage.propTypes = {
  className: PropTypes.string,
};

PathwaySidebarMessage.defaultProps = {
  className: 'mb-3 mt-3',
};

export default PathwaySidebarMessage;
