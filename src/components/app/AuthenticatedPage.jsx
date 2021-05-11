import React from 'react';
import PropTypes from 'prop-types';
import Cookies from 'universal-cookie';
import { LoginRedirect } from '@edx/frontend-enterprise-logistration';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';

import { EnterprisePage } from '../enterprise-page';
import { EnterpriseBanner } from '../enterprise-banner';
import { Layout } from '../layout';

export default function AuthenticatedPage({ children, useEnterpriseConfigCache }) {
  const config = getConfig();
  const user = getAuthenticatedUser();

  if (!user) {
    const cookies = new Cookies();
    cookies.remove(config.INTEGRATION_WARNING_DISMISSED_COOKIE_NAME);
  }

  return (
    <LoginRedirect>
      <EnterprisePage useEnterpriseConfigCache={useEnterpriseConfigCache}>
        <Layout>
          <EnterpriseBanner />
          {children}
        </Layout>
      </EnterprisePage>
    </LoginRedirect>
  );
}

AuthenticatedPage.propTypes = {
  children: PropTypes.node.isRequired,
  useEnterpriseConfigCache: PropTypes.bool,
};

AuthenticatedPage.defaultProps = {
  useEnterpriseConfigCache: true,
};
