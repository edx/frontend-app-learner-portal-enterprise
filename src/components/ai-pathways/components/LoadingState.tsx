import React from 'react';
import { Spinner } from '@openedx/paragon';
import { StateLayout } from './StateLayout';

interface LoadingStateProps {
  message?: string;
  className?: string;
  minHeight?: string | number;
}

/**
 * LoadingState displays a centered spinner and informative message.
 *
 * It is used globally across the AI Pathways feature during asynchronous
 * operations like intent extraction, career retrieval, and pathway generation.
 */
export const LoadingState = ({
  message = 'Loading...',
  className,
  minHeight,
}: LoadingStateProps) => (
  <StateLayout className={className} minHeight={minHeight}>
    <Spinner
      animation="border"
      variant="primary"
      screenReaderText={message}
    />
    {message && <p className="mt-3 text-muted">{message}</p>}
  </StateLayout>
);
