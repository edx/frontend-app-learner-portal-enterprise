import { Alert } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';

export interface SessionGoneNoticeProps {
  onDismiss: () => void;
}

/**
 * Shown over a fresh chat when the search the learner opened (a link or Back with `?session=`, or History) or
 * tried to continue was deleted or isn't theirs.
 */
const SessionGoneNotice = ({ onDismiss }: SessionGoneNoticeProps) => {
  const intl = useIntl();
  return (
    <Alert variant="warning" className="mb-3" dismissible closeLabel={intl.formatMessage(messages.close)} onClose={onDismiss}>
      {intl.formatMessage(messages.sessionGone)}
    </Alert>
  );
};

export default SessionGoneNotice;
