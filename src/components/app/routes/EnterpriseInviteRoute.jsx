import { Button, Hyperlink } from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';

import { ErrorPage } from '../../error-page';
import messages from './messages';

export { makeEnterpriseInviteLoader } from './loaders';

/**
 * The UI associated with the enterprise invite route. It should only render
 * if the API call to link the user to the enterprise customer fails, which
 * occurs within the associated route loader.
 *
 * @returns {JSX.Element} - The EnterpriseInviteRoute component.
 */
const EnterpriseInviteRoute = () => {
  const intl = useIntl();

  return (
    <ErrorPage
      subtitle={intl.formatMessage(messages.enterpriseInviteSubtitle)}
      errorPageContentClassName="py-4.5"
      testId="enterprise-invite-error"
    >
      <p className="mb-5">
        <FormattedMessage
          {...messages.enterpriseInviteBody}
          values={{
            helpCenterLink: (
              <Hyperlink
                destination={getConfig().LEARNER_SUPPORT_URL}
                target="_blank"
              >
                {intl.formatMessage(messages.enterpriseInviteHelpCenterLinkText)}
              </Hyperlink>
            ),
            marketingSiteLink: (
              <Hyperlink
                destination={getConfig().MARKETING_SITE_BASE_URL}
                target="_blank"
              >
                {intl.formatMessage(messages.enterpriseInviteMarketingSiteLinkText)}
              </Hyperlink>
            ),
          }}
        />
      </p>
      <Button
        as={Hyperlink}
        target="_blank"
        destination={getConfig().MARKETING_SITE_BASE_URL}
        variant="primary"
        size="sm"
      >
        {intl.formatMessage(messages.enterpriseInviteContinueCta)}
      </Button>
    </ErrorPage>
  );
};

export default EnterpriseInviteRoute;
