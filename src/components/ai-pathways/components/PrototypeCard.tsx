import React from 'react';
import { Card } from '@openedx/paragon';
import classNames from 'classnames';

interface PrototypeCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * PrototypeCard is a local layout helper that mirrors the source app's
 * usage of IonCard while using Paragon components.
 */
export const PrototypeCard = ({
  title,
  subtitle,
  children,
  footer,
  className,
  onClick,
}: PrototypeCardProps) => (
  <Card
    className={classNames('mb-4 h-100', className, { 'cursor-pointer': !!onClick })}
    onClick={onClick}
  >
    {(title || subtitle) && (
      <Card.Header
        title={title}
        subtitle={subtitle}
      />
    )}
    <Card.Body>{children}</Card.Body>
    {footer && <Card.Footer>{footer}</Card.Footer>}
  </Card>
);
