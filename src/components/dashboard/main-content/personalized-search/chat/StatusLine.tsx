import { Spinner } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from '../messages';
import type { StatusStep } from '../stream/types';

const STEP_MESSAGES = {
  understanding: messages.statusUnderstanding,
  searching: messages.statusSearching,
  writing: messages.statusWriting,
};

const StatusLine = ({ step }: { step: StatusStep }) => {
  const intl = useIntl();
  const label = intl.formatMessage(STEP_MESSAGES[step]);
  return (
    <p className="personalized-search__status small text-gray-700 d-flex align-items-center mb-2" data-step={step}>
      <Spinner animation="border" size="sm" className="mr-2" screenReaderText="" />
      {label}
    </p>
  );
};

export default StatusLine;
