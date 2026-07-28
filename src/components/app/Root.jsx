import { useContext } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { getLoginRedirectUrl } from '@edx/frontend-platform/auth';
import { AppContext } from '@edx/frontend-platform/react';
import { Hyperlink } from '@openedx/paragon';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';

import { Toasts, ToastsProvider } from '../Toasts';
import { ErrorPage } from '../error-page';
import { useNProgressLoader } from './data';
import messages from './messages';

const UnauthenticatedRoot = () => {
  const intl = useIntl();

  return (
    <ErrorPage title={intl.formatMessage(messages.loggedOutTitle)} showSiteFooter={false}>
      <FormattedMessage
        {...messages.loggedOutBody}
        values={{
          loginLink: (
            <Hyperlink destination={getLoginRedirectUrl(global.location.href)}>
              {intl.formatMessage(messages.loggedOutLoginLinkText)}
            </Hyperlink>
          ),
        }}
      />
    </ErrorPage>
  );
};

const AuthenticatedRoot = () => (
  <>
    <ToastsProvider>
      <Toasts />
      <Outlet />
    </ToastsProvider>
    <ScrollRestoration />
  </>
);

const Root = () => {
  const { authenticatedUser } = useContext(AppContext);
  const isAppDataHydrated = useNProgressLoader();

  // In the special case where there is not authenticated user and we are being told it's the logout
  // flow, we can show the logout message safely.
  // not rendering the SiteFooter here since it looks like it requires additional setup
  // not available in the logged out state (errors with InjectIntl errors)
  if (!authenticatedUser) {
    return <UnauthenticatedRoot />;
  }

  if (!isAppDataHydrated) {
    return null;
  }

  // User is authenticated, so render the child routes (rest of the app).
  return <AuthenticatedRoot />;
};

export default Root;
