import React from 'react';
import { Alert } from '@openedx/paragon';

interface GoalSummaryErrorAlertProps {
  error?: string | null;
}

const GoalSummaryErrorAlert = ({ error }: GoalSummaryErrorAlertProps) => {
  if (!error) {
    return null;
  }
  return (
    <Alert variant="danger" className="mb-4">
      {error}
    </Alert>
  );
};

export default GoalSummaryErrorAlert;
