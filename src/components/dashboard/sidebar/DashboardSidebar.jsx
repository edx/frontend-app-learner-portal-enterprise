import React, { useContext } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { AppContext } from '@edx/frontend-platform/react';
import { MailtoLink } from '@edx/paragon';

import { SidebarBlock } from '../../layout';
import OfferSummaryCard from './OfferSummaryCard';
import SubscriptionSummaryCard from './SubscriptionSummaryCard';
import SidebarCard from './SidebarCard';
import { UserSubsidyContext } from '../../enterprise-user-subsidy';

export const CATALOG_ACCESS_CARD_BUTTON_TEXT = 'Find a course';
export const NEED_HELP_BLOCK_TITLE = 'Need help?';
export const EMAIL_MESSAGE = 'contact your organization\'s edX administrator';

const DashboardSidebar = () => {
  const {
    enterpriseConfig: {
      contactEmail,
      slug,
    },
    subscriptionPlan,
  } = useContext(AppContext);
  const {
    hasAccessToPortal,
    offers: { offersCount },
  } = useContext(UserSubsidyContext);

  const renderContactHelpText = () => {
    const message = EMAIL_MESSAGE;
    if (contactEmail) {
      return (
        <MailtoLink to={contactEmail}>
          {message}
        </MailtoLink>
      );
    }
    return message;
  };

  return (
    <div className="mt-3 mt-lg-0">
      {(subscriptionPlan || offersCount > 0) && (
        <SidebarCard cardClassNames="border-primary border-brand-primary catalog-access-card mb-5">
          {subscriptionPlan && (
            <SubscriptionSummaryCard
              subscriptionPlan={subscriptionPlan}
              className="mb-3"
            />
          )}
          {offersCount > 0 && (
            <OfferSummaryCard
              offersCount={offersCount}
              className="mb-3"
            />
          )}
          <Link
            to={`/${slug}/search`}
            className={classNames('btn btn-outline-primary btn-block', { disabled: !hasAccessToPortal })}
          >
            {CATALOG_ACCESS_CARD_BUTTON_TEXT}
          </Link>
        </SidebarCard>
      )}
      <SidebarBlock
        title={NEED_HELP_BLOCK_TITLE}
        titleOptions={{ tag: 'h3' }}
        className="mb-5"
      >
        <p>
          For technical support, visit the{' '}
          <a href="https://support.edx.org/hc/en-us">edX Help Center</a>.
        </p>
        <p>
          To request more benefits or specific courses, {renderContactHelpText()}.
        </p>
      </SidebarBlock>
    </div>
  );
};

export default DashboardSidebar;
