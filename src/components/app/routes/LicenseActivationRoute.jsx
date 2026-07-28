import { useContext } from 'react';
import { getConfig } from '@edx/frontend-platform';
import { Helmet } from 'react-helmet';
import { Hyperlink } from '@openedx/paragon';
import { AppContext } from '@edx/frontend-platform/react';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';

import NotFoundIcon from '../../../assets/icons/NotFound.svg';
import { ErrorPage } from '../../error-page';
import messages from './messages';

const LicenseActivationRoute = () => {
  const intl = useIntl();
  const { authenticatedUser } = useContext(AppContext);
  const { email } = authenticatedUser;

  return (
    <ErrorPage
      title={intl.formatMessage(messages.licenseActivationTitle)}
      titleClassName="display-1 text-brand-500 mb-4.5"
      spannedTitle={intl.formatMessage(messages.licenseActivationSpannedTitle)}
      showSiteHeader={false}
      showSiteFooter={false}
      errorPageContentClassName="text-center py-5"
      imageSrc={NotFoundIcon}
    >
      <Helmet title={intl.formatMessage(messages.licenseActivationHelmetTitle)} />
      <p>
        <FormattedMessage
          {...messages.licenseActivationLoggedInAs}
          values={{ email: <span className="text-brand">{email}</span> }}
        />
      </p>
      <p className="font-weight-bold">
        {intl.formatMessage(messages.licenseActivationResolutionsHeading)}
      </p>
      <div className="d-flex align-items-center justify-content-center">
        <ul className="text-left w-75 small">
          <li>
            <FormattedMessage
              {...messages.licenseActivationLogOutResolution}
              values={{
                logOutLink: (
                  <Hyperlink
                    destination={getConfig().LOGOUT_URL}
                    variant="muted"
                    isInline
                  >
                    {intl.formatMessage(messages.licenseActivationLogOutLinkText)}
                  </Hyperlink>
                ),
              }}
            />
          </li>
          <li>
            {intl.formatMessage(messages.licenseActivationCreateAccountResolution)}
          </li>
          <li>
            <FormattedMessage
              {...messages.licenseActivationUpdateEmailResolution}
              values={{
                updateEmailLink: (
                  <Hyperlink
                    destination={`${getConfig().ACCOUNT_SETTINGS_URL}`}
                    variant="muted"
                    isInline
                  >
                    {intl.formatMessage(messages.licenseActivationUpdateEmailLinkText)}
                  </Hyperlink>
                ),
              }}
            />
          </li>
        </ul>
      </div>
    </ErrorPage>
  );
};

export default LicenseActivationRoute;
