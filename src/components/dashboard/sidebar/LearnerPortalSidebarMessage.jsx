import { Card } from '@openedx/paragon';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';

import { useEnterpriseCustomer } from '../../app/data';

// DOMPurify strips `target` by default (it's not in the USE_PROFILES `html` allowlist), which
// would silently change existing behavior for any customer whose learnerPortalSidebarContent
// already uses target="_blank" CTA links.
// Browsers treat target values case-insensitively, and any value other than these keywords
// (e.g. "_BLANK", "_new", "someName") opens a new browsing context with `window.opener` set.
const SAME_CONTEXT_TARGETS = ['', '_self', '_parent', '_top'];
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A' || !node.hasAttribute('target')) {
    return;
  }
  const target = node.getAttribute('target').trim().toLowerCase();
  if (!SAME_CONTEXT_TARGETS.includes(target)) {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const LearnerPortalSidebarMessage = ({ className }) => {
  const { data: enterpriseCustomer } = useEnterpriseCustomer();

  const hasLearnerPortalSidebarMessaging = (
    enterpriseCustomer.enableLearnerPortalSidebarMessage && enterpriseCustomer.learnerPortalSidebarContent
  );

  if (!hasLearnerPortalSidebarMessaging) {
    return null;
  }

  return (
    <Card className={className} data-testid="learner-portal-sidebar-message">
      <Card.Section>
        {/* eslint-disable-next-line react/no-danger */}
        <div dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(
            enterpriseCustomer.learnerPortalSidebarContent,
            { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] },
          ),
        }}
        />
      </Card.Section>
    </Card>
  );
};

LearnerPortalSidebarMessage.propTypes = {
  className: PropTypes.string,
};

LearnerPortalSidebarMessage.defaultProps = {
  className: 'mb-3',
};

export default LearnerPortalSidebarMessage;
