import React from 'react';
import { ActionRow, Button } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './messages';

interface IntakeFooterActionsProps {
  onSkip?: () => void;
}

const IntakeFooterActions: React.FC<IntakeFooterActionsProps> = ({ onSkip }) => {
  const intl = useIntl();

  return (
    <ActionRow className="mt-2">
      {onSkip && (
        <Button
          variant="tertiary"
          type="button"
          data-testid="intake-skip-button"
          onClick={onSkip}
        >
          {intl.formatMessage(messages.skipToDashboard)}
        </Button>
      )}
      {onSkip && <ActionRow.Spacer />}
      <Button
        variant="primary"
        type="submit"
        data-testid="intake-submit-button"
      >
        {intl.formatMessage(messages.submitAndReviewProfile)}
      </Button>
    </ActionRow>
  );
};

export default IntakeFooterActions;
