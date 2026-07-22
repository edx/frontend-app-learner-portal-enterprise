import React from 'react';
import { Badge } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { PathwayCourseStatus } from '../state';
import { STATUS_MESSAGE } from './constants';
import './styles/index.scss';

export interface PathwayCourseStatusBadgeProps {
  status: PathwayCourseStatus;
}

const PathwayCourseStatusBadge = ({ status }: PathwayCourseStatusBadgeProps) => {
  const intl = useIntl();

  return (
    <Badge as="span" className={`pathway-course-status-badge pathway-course-status-badge--${status}`}>
      <span className="pathway-course-status-badge__dot" />
      {intl.formatMessage(STATUS_MESSAGE[status])}
    </Badge>
  );
};

export default PathwayCourseStatusBadge;
