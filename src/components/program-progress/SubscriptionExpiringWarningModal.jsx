import PropTypes from 'prop-types';
import {
  ActionRow, Button, MailtoLink, StandardModal,
} from '@openedx/paragon';
import {
  defineMessages, FormattedMessage, useIntl,
} from '@edx/frontend-platform/i18n';
import { SUBSCRIPTION_EXPIRING_MODAL_TITLE } from './data/constants';
import { useEnterpriseCustomer, useSubscriptions } from '../app/data';
import { i18nFormatTimestamp } from '../../utils/common';

const messages = defineMessages({
  contactLearningManager: {
    id: 'enterprise.program.progress.subscription.warning.contact.learning.manager',
    defaultMessage: 'contact your learning manager',
    description: 'Link text for the contact action in the subscription expiration warning modal.',
  },
  subscriptionWillExpire: {
    id: 'enterprise.program.progress.subscription.warning.body.expiration',
    defaultMessage: 'Your edX subscription access through [{enterpriseName}] will expire before you are projected to complete all of the courses in the program (based off of course end dates). If you are not able to complete all of the courses in the program before your access expires, you will not be eligible to view or share your program record.',
    description: 'Primary explanation in the subscription expiration warning modal.',
  },
  renewalNoticePrefix: {
    id: 'enterprise.program.progress.subscription.warning.body.renewal.notice.prefix',
    defaultMessage: 'If you plan to complete the program, please ',
    description: 'Prefix for the renewal guidance shown before the contact action in the subscription expiration warning modal.',
  },
  renewalNoticeSuffix: {
    id: 'enterprise.program.progress.subscription.warning.body.renewal.notice.suffix',
    defaultMessage: ' to ensure your subscription access is renewed.',
    description: 'Suffix for the renewal guidance shown after the contact action in the subscription expiration warning modal.',
  },
  accessExpires: {
    id: 'enterprise.program.progress.subscription.warning.access.expires',
    defaultMessage: 'Access expires: {expirationDate}.',
    description: 'Expiration date label in the subscription expiration warning modal.',
  },
  acknowledge: {
    id: 'enterprise.program.progress.subscription.warning.acknowledge',
    defaultMessage: 'OK',
    description: 'Confirmation button label in the subscription expiration warning modal.',
  },
});

const SubscriptionExpirationWarningModal = ({
  isSubscriptionExpiringWarningModalOpen,
  onSubscriptionExpiringWarningModalClose,
}) => {
  const intl = useIntl();
  const { data: enterpriseCustomer } = useEnterpriseCustomer();
  const { data: { subscriptionPlan } } = useSubscriptions();
  const modalTitle = intl.formatMessage(SUBSCRIPTION_EXPIRING_MODAL_TITLE);

  const renderContactText = () => {
    const contactText = intl.formatMessage(messages.contactLearningManager);
    if (enterpriseCustomer.contactEmail) {
      return (
        <MailtoLink to={enterpriseCustomer.contactEmail} className="font-weight-bold">{contactText}</MailtoLink>
      );
    }
    return contactText;
  };

  const renderExpiredBody = () => (
    <>
      <p>
        <FormattedMessage
          id={messages.subscriptionWillExpire.id}
          defaultMessage={messages.subscriptionWillExpire.defaultMessage}
          description={messages.subscriptionWillExpire.description}
          values={{
            enterpriseName: enterpriseCustomer.name,
          }}
        />
      </p>
      <p>
        {intl.formatMessage(messages.renewalNoticePrefix)}
        {renderContactText()}
        {intl.formatMessage(messages.renewalNoticeSuffix)}
      </p>
      <i>
        <FormattedMessage
          id={messages.accessExpires.id}
          defaultMessage={messages.accessExpires.defaultMessage}
          description={messages.accessExpires.description}
          values={{
            expirationDate: i18nFormatTimestamp({ intl, timestamp: subscriptionPlan.expirationDate }),
          }}
        />
      </i>
    </>
  );

  return (
    <StandardModal
      title={modalTitle}
      isOpen={isSubscriptionExpiringWarningModalOpen}
      hasCloseButton={false}
      isOverflowVisible={false}
      onClose={onSubscriptionExpiringWarningModalClose}
      footerNode={(
        <ActionRow>
          <Button onClick={onSubscriptionExpiringWarningModalClose}>
            <FormattedMessage
              id={messages.acknowledge.id}
              defaultMessage={messages.acknowledge.defaultMessage}
              description={messages.acknowledge.description}
            />
          </Button>
        </ActionRow>
      )}
    >
      {renderExpiredBody()}
    </StandardModal>
  );
};
SubscriptionExpirationWarningModal.propTypes = {
  isSubscriptionExpiringWarningModalOpen: PropTypes.bool.isRequired,
  onSubscriptionExpiringWarningModalClose: PropTypes.func.isRequired,
};
export default SubscriptionExpirationWarningModal;
