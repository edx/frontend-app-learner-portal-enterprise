import React from 'react';
import { Alert, Button } from '@openedx/paragon';
import { StateLayout } from './StateLayout';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  minHeight?: string | number;
}

/**
 * ErrorState component displays a user-friendly error message and an optional
 * recovery action (retry).
 *
 * It is used to handle failures at any stage of the AI pipeline, such as
 * network errors during intent extraction or course retrieval.
 */
export const ErrorState = ({
  message = 'An unexpected error occurred. Please try again later.',
  onRetry,
  className,
  minHeight,
}: ErrorStateProps) => (
  <StateLayout className={className} minHeight={minHeight}>
    <Alert variant="danger" className="w-100 mb-3 text-start">
      {message}
    </Alert>
    {onRetry && (
      <Button variant="primary" onClick={onRetry}>
        Retry
      </Button>
    )}
  </StateLayout>
);
