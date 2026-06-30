import React from 'react';
import { Button, Spinner } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

interface GoalSummaryEditHeaderProps {
  isProfileSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  onCancel: () => void;
}

const GoalSummaryEditHeader = ({
  isProfileSubmitting,
  isDirty,
  isValid,
  onCancel,
}: GoalSummaryEditHeaderProps) => {
  const intl = useIntl();

  return (
    <div className="d-flex justify-content-between align-items-start mb-4.5">
      <h2 className="mb-0">
        {intl.formatMessage(messages.goalSummary)}
      </h2>
      <div className="d-flex align-items-center">
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          className="mr-2"
          onClick={onCancel}
          disabled={isProfileSubmitting}
        >
          {intl.formatMessage(messages.cancel)}
        </Button>
        <Button
          type="submit"
          variant="outline-primary"
          size="sm"
          disabled={!isDirty || isProfileSubmitting || !isValid}
          data-testid="goal-summary-submit-button"
        >
          {isProfileSubmitting && (
            <Spinner
              animation="border"
              size="sm"
              className="mr-2"
              screenReaderText={intl.formatMessage(messages.submitting)}
            />
          )}
          {intl.formatMessage(
            isProfileSubmitting ? messages.submitting : messages.submit,
          )}
        </Button>
      </div>
    </div>
  );
};

export default GoalSummaryEditHeader;
