import React from 'react';
import { Col, Row } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import type { Control } from 'react-hook-form';

import type { GoalSummaryFormValues } from './types';
import { AutoExpandingTextareaField, requiredNonWhitespace } from '../shared';
import { DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION } from '../intake/constants';
import messages from './messages';

interface GoalSummaryEditFormProps {
  control: Control<GoalSummaryFormValues>;
  isProfileSubmitting: boolean;
}

const GoalSummaryEditForm = ({
  control,
  isProfileSubmitting,
}: GoalSummaryEditFormProps) => {
  const intl = useIntl();

  return (
    <>
      <Row>
        <Col md={6}>
          <AutoExpandingTextareaField
            name="careerGoal"
            control={control}
            rules={{
              validate: {
                required: requiredNonWhitespace(
                  intl.formatMessage(messages.careerGoalRequiredError),
                ),
              },
            }}
            controlId="career-selection-career-goal"
            label={intl.formatMessage(messages.careerGoal)}
            labelClassName="h3"
            maxCharacters={DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}
            disabled={isProfileSubmitting}
            fieldTestId="goal-summary-career-goal-field"
            feedbackTestId="goal-summary-career-goal-feedback"
          />
        </Col>
        <Col md={6}>
          <AutoExpandingTextareaField
            name="targetIndustry"
            control={control}
            rules={{
              validate: {
                required: requiredNonWhitespace(
                  intl.formatMessage(messages.targetIndustryRequiredError),
                ),
              },
            }}
            controlId="career-selection-target-industry"
            label={intl.formatMessage(messages.targetIndustry)}
            labelClassName="h3"
            maxCharacters={DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}
            disabled={isProfileSubmitting}
            fieldTestId="goal-summary-target-industry-field"
            feedbackTestId="goal-summary-target-industry-feedback"
          />
        </Col>
      </Row>
      <AutoExpandingTextareaField
        name="background"
        control={control}
        rules={{
          validate: {
            required: requiredNonWhitespace(
              intl.formatMessage(messages.backgroundRequiredError),
            ),
          },
        }}
        controlId="career-selection-background"
        label={intl.formatMessage(messages.background)}
        labelClassName="h3"
        maxCharacters={DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}
        disabled={isProfileSubmitting}
        fieldTestId="goal-summary-background-field"
        feedbackTestId="goal-summary-background-feedback"
      />
      <AutoExpandingTextareaField
        name="motivation"
        control={control}
        rules={{
          validate: {
            required: requiredNonWhitespace(
              intl.formatMessage(messages.motivationRequiredError),
            ),
          },
        }}
        controlId="career-selection-motivation"
        label={intl.formatMessage(messages.motivation)}
        labelClassName="h3"
        maxCharacters={DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}
        disabled={isProfileSubmitting}
        className="mb-0"
        fieldTestId="goal-summary-motivation-field"
        feedbackTestId="goal-summary-motivation-feedback"
      />
    </>
  );
};

export default GoalSummaryEditForm;
