import React from 'react';
import { Alert } from '@openedx/paragon';

interface RequestErrorAlertProps {
  error?: string | null;
}

const RequestErrorAlert = ({ error }: RequestErrorAlertProps) => {
  if (!error) {
    return null;
  }
  return (
    <Alert variant="danger" className="mb-4">
      {error}
    </Alert>
  );
};

export default RequestErrorAlert;
