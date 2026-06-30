import React from 'react';
import { Button } from '@openedx/paragon';
import { Edit } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';

import messages from './messages';

interface GoalSummaryReadOnlyHeaderProps {
  onBeginEditing: () => void;
}

const GoalSummaryReadOnlyHeader = ({ onBeginEditing }: GoalSummaryReadOnlyHeaderProps) => {
  const intl = useIntl();

  return (
    <div className="d-flex justify-content-between align-items-start mb-4.5">
      <h2 className="mb-0">
        {intl.formatMessage(messages.goalSummary)}
      </h2>
      <Button
        type="button"
        variant="outline-primary"
        size="sm"
        iconBefore={Edit}
        onClick={onBeginEditing}
        data-testid="goal-summary-edit-button"
      >
        {intl.formatMessage(messages.edit)}
      </Button>
    </div>
  );
};

export default GoalSummaryReadOnlyHeader;
