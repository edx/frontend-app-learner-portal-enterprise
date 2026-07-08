import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Button } from '@openedx/paragon';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';
import { FormattedMessage } from '@edx/frontend-platform/i18n';
import { useEnterpriseCustomer } from '../app/data';
import './styles/VideoDetailPage.scss';

const VideoBanner = ({ onSeeWhatsNew }) => {
  const { data: enterpriseCustomer } = useEnterpriseCustomer();

  useEffect(() => {
    if (!enterpriseCustomer?.uuid) {
      return;
    }
    sendEnterpriseTrackEvent(
      enterpriseCustomer.uuid,
      'edx.ui.enterprise.learner_portal.latest_offerings_banner.viewed',
    );
  }, [enterpriseCustomer]);

  const handleSeeWhatsNew = () => {
    if (enterpriseCustomer?.uuid) {
      sendEnterpriseTrackEvent(
        enterpriseCustomer.uuid,
        'edx.ui.enterprise.learner_portal.latest_offerings_banner.see_whats_new_clicked',
      );
    }

    onSeeWhatsNew?.();
  };
  return (
    <div data-testid="latest-offerings-banner" className="d-flex justify-content-center">
      <Card orientation="horizontal" className="video-banner-class bg-light-300">
        <Card.Section className="col-9">
          <span className="d-flex justify-content-center align-items-end">
            <h3 className="text-brand-500 pr-1 m-0">
              <FormattedMessage
                id="enterprise.microlearning.latestOfferings.banner.new"
                defaultMessage="New!"
                description="New badge for the latest offerings banner."
              />
            </h3>
            <h3 className="p-0 m-0">
              <FormattedMessage
                id="enterprise.microlearning.latestOfferingsBanner.title"
                defaultMessage="Just dropped"
                description="Title for the latest offerings banner on the search page."
              />
            </h3>
          </span>
          <p className="d-flex justify-content-center">
            <FormattedMessage
              id="enterprise.microlearning.latestOfferingsBanner.description"
              defaultMessage="Expand your skills with the latest courses and professional certificates."
              description="Description for the latest offerings banner on the search page."
            />
          </p>
        </Card.Section>
        <Card.Footer className="col-3 justify-content-end">
          <Button
            variant="outline-primary"
            onClick={handleSeeWhatsNew}
          >
            <FormattedMessage
              id="enterprise.microlearning.latestOfferingsBanner.exploreVideos"
              defaultMessage="See what's new"
              description="Button text for the latest offerings CTA on the search page."
            />
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
};

VideoBanner.propTypes = {
  onSeeWhatsNew: PropTypes.func,
};

export default VideoBanner;
