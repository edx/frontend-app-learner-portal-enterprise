import React from 'react';
import { Col, Row } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';

import type { LearnerIntent } from '../state';
import messages from './messages';

interface GoalSummaryReadOnlyProps {
  learnerIntent: LearnerIntent;
}

const GoalSummaryReadOnly = ({ learnerIntent }: GoalSummaryReadOnlyProps) => {
  const intl = useIntl();
  const renderValue = (value: string) => value || intl.formatMessage(messages.notProvided);

  return (
    <>
      <Row className="mb-3">
        <Col
          md={6}
          className="mb-3 mb-md-0"
          data-testid="profile-career-goal"
        >
          <h4 className="h3 mb-1">
            {intl.formatMessage(messages.careerGoal)}
          </h4>
          <p className="mb-0">{renderValue(learnerIntent.careerGoal)}</p>
        </Col>
        <Col md={6} data-testid="profile-target-industry">
          <h4 className="h3 mb-1">
            {intl.formatMessage(messages.targetIndustry)}
          </h4>
          <p className="mb-0">{renderValue(learnerIntent.targetIndustry)}</p>
        </Col>
      </Row>
      <div className="mb-3" data-testid="profile-background">
        <h4 className="h3 mb-1">
          {intl.formatMessage(messages.background)}
        </h4>
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
          {renderValue(learnerIntent.background)}
        </p>
      </div>
      <div data-testid="profile-motivation">
        <h4 className="h3 mb-1">
          {intl.formatMessage(messages.motivation)}
        </h4>
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
          {renderValue(learnerIntent.motivation)}
        </p>
      </div>
    </>
  );
};

export default GoalSummaryReadOnly;
