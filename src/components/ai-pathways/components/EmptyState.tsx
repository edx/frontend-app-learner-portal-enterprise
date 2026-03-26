import React from 'react';
import { Alert } from '@openedx/paragon';
import { StateLayout } from './StateLayout';

interface EmptyStateProps {
  message?: string;
  className?: string;
  minHeight?: string | number;
  children?: React.ReactNode;
}

/**
 * EmptyState displays a message when no results or data are available.
 * It follows the visual patterns of the source app's "no results" scenarios.
 */
export const EmptyState = ({
  message = 'No data available.',
  className,
  minHeight,
  children,
}: EmptyStateProps) => (
  <StateLayout className={className} minHeight={minHeight}>
    <Alert variant="light" className="w-100 mb-3 border-dashed">
      {message}
    </Alert>
    {children}
  </StateLayout>
);
