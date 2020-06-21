import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import { AppContext } from '@edx/frontend-platform/react';

const NotFoundPage = () => {
  const { enterpriseConfig } = useContext(AppContext);

  let PAGE_TITLE = 'Page not found';
  if (enterpriseConfig) {
    PAGE_TITLE += ` - ${enterpriseConfig.name}`;
  }

  return (
    <div className="container-fluid mt-3">
      <Helmet title={PAGE_TITLE} />
      <div className="text-center py-5">
        <h1>404</h1>
        <p className="lead">Oops, sorry we can&apos;t find that page!</p>
        <p>Either something went wrong or the page doesn&apos;t exist anymore.</p>
      </div>
    </div>
  );
};

export default NotFoundPage;
