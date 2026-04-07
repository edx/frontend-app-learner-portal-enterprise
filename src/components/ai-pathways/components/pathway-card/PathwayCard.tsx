import React from 'react';
import {
  Card, Badge, Button,
} from '@openedx/paragon';
import { ExpandMore } from '@openedx/paragon/icons';
import type { PathwayCourse, CourseStatus } from '../../services/pathways.types';

interface PathwayCardProps {
  /** The course data to display */
  course: PathwayCourse;
  /** Callback for the main action button (Register/Continue/View Cert) */
  onAction?: (course: PathwayCourse) => void;
  /** Callback for the "View Details" link */
  onViewDetails?: (course: PathwayCourse) => void;
  /** Optional additional class names for the card container */
  className?: string;
}

/**
 * Returns a Paragon badge variant for a given course status.
 */
const getStatusVariant = (status: CourseStatus): 'success' | 'warning' | 'info' | 'light' => {
  switch (status) {
    case 'completed': return 'success';
    case 'in progress': return 'warning';
    case 'not started': return 'info';
    default: return 'light';
  }
};

/**
 * PathwayCard component provides a card-based presentation of a single course in a pathway.
 *
 * It preserves the source app's information density, including status, level, reasoning,
 * and context-aware actions. It is designed to be portable and decoupled from the
 * overall pathway state management.
 */
export const PathwayCard = ({
  course,
  onAction,
  onViewDetails,
  className = '',
}: PathwayCardProps) => {
  const {
    title,
    status,
    level,
    reasoning,
  } = course;

  let actionText = 'Register';
  if (status === 'completed') {
    actionText = 'View Certificate';
  } else if (status === 'in progress') {
    actionText = 'Continue Course';
  }

  return (
    <Card className={`h-100 ${className}`}>
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Badge variant={getStatusVariant(status)} className="text-uppercase">
            {status}
          </Badge>
          <Badge
            variant="info"
            className="text-uppercase"
            style={{ backgroundColor: '#EBF5FB', color: '#3498DB', border: 'none' }}
          >
            {level}
          </Badge>
        </div>

        <h5 className="h5 mb-2 font-weight-bold">
          {title}
        </h5>

        <p className="small text-muted mb-4 flex-grow-1" style={{ lineHeight: '1.5' }}>
          {reasoning}
        </p>

        <div className="d-flex justify-content-between align-items-center mt-auto">
          <Button
            variant="link"
            size="sm"
            className="p-0 text-primary d-flex align-items-center"
            style={{ fontSize: '13px', textDecoration: 'underline', border: 'none' }}
            onClick={() => onViewDetails?.(course)}
            iconAfter={ExpandMore}
          >
            View Details
          </Button>
          <Button
            variant={status === 'completed' ? 'success' : 'primary'}
            size="sm"
            className="font-weight-bold text-nowrap"
            style={{
              background: status !== 'completed'
                ? 'linear-gradient(135deg, #3498DB, #9B59B6)'
                : undefined,
              border: 'none',
              padding: '6px 16px',
            }}
            onClick={() => onAction?.(course)}
          >
            {actionText}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};
