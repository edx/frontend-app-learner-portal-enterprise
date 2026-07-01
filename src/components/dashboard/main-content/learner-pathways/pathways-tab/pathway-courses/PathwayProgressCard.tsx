import React from 'react';
import { Card, Col, Row } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { PathwayProgress } from '../state';
import messages from './messages';

export interface PathwayProgressCardProps {
  progress: PathwayProgress;
}

const PathwayProgressCard = ({ progress }: PathwayProgressCardProps) => {
  const intl = useIntl();

  const metrics = [
    { key: 'completed', value: progress.completed, label: intl.formatMessage(messages.completedLabel) },
    { key: 'in-progress', value: progress.inProgress, label: intl.formatMessage(messages.inProgressLabel) },
    { key: 'upcoming', value: progress.upcoming, label: intl.formatMessage(messages.upcomingLabel) },
    { key: 'total', value: progress.totalCourses, label: intl.formatMessage(messages.totalCoursesLabel) },
  ];

  return (
    <Card className="shadow-sm mb-4">
      <Card.Section>
        <Row>
          {metrics.map((metric) => (
            <Col
              key={metric.key}
              xs={6}
              md={3}
              className="text-center"
              data-testid={`pathway-progress-${metric.key}`}
            >
              <div className="h1 mb-1 font-weight-bold">{metric.value}</div>
              <div className="small text-uppercase font-weight-bold text-muted">{metric.label}</div>
            </Col>
          ))}
        </Row>
      </Card.Section>
    </Card>
  );
};

export default PathwayProgressCard;
