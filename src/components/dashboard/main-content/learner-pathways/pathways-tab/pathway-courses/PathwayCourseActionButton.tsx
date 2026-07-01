import React, { useCallback } from 'react';
import { Button } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { PathwayCourse } from '../state';
import { ACTION_MESSAGE } from './constants';

export interface PathwayCourseActionButtonProps {
  course: PathwayCourse;
  /** Optional for testability; no caller wires this yet (row actions are no-op for this scaffold). */
  onCourseAction?: (course: PathwayCourse) => void;
}

const PathwayCourseActionButton = ({ course, onCourseAction }: PathwayCourseActionButtonProps) => {
  const intl = useIntl();

  const handleClick = useCallback(() => {
    onCourseAction?.(course);
  }, [course, onCourseAction]);

  return (
    <Button
      type="button"
      size="sm"
      variant="primary"
      className="text-nowrap"
      onClick={handleClick}
    >
      {intl.formatMessage(ACTION_MESSAGE[course.status])}
    </Button>
  );
};

export default PathwayCourseActionButton;
