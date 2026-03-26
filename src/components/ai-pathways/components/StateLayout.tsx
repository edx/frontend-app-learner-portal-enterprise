import React from 'react';
import { Container } from '@openedx/paragon';
import classNames from 'classnames';

interface StateLayoutProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: string | number;
}

/**
 * StateLayout is a local layout helper for feature states (loading, empty, error).
 * It ensures consistent centering and spacing across the AI Pathways prototype.
 */
export const StateLayout = ({
  children,
  className,
  minHeight = '200px',
}: StateLayoutProps) => (
  <Container
    className={classNames(
      'd-flex flex-column align-items-center justify-content-center p-4 text-center',
      className,
    )}
    style={{ minHeight }}
  >
    {children}
  </Container>
);
