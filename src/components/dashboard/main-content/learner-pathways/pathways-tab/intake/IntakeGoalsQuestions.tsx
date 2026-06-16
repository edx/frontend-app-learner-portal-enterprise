import React from 'react';
import { Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import IntakeTextareaQuestionField from './IntakeTextareaQuestionField';
import { INTAKE_QUESTION_CHARACTER_LIMITS } from './constants';
import messages from './messages';

const IntakeGoalsQuestions = () => {
  const intl = useIntl();

  return (
    <Stack gap={3} data-testid="intake-goals-questions">
      <IntakeTextareaQuestionField
        name="motivation"
        controlId="intake-motivation-question"
        label={intl.formatMessage(messages.motivationQuestionLabel)}
        placeholder={intl.formatMessage(messages.motivationQuestionPlaceholder)}
        requiredErrorMessage={intl.formatMessage(messages.motivationQuestionRequiredError)}
        maxCharacters={INTAKE_QUESTION_CHARACTER_LIMITS.motivation}
        fieldTestId="intake-motivation-field"
        feedbackTestId="intake-motivation-feedback"
      />
      <IntakeTextareaQuestionField
        name="goal"
        controlId="intake-goal-question"
        label={intl.formatMessage(messages.goalQuestionLabel)}
        placeholder={intl.formatMessage(messages.goalQuestionPlaceholder)}
        requiredErrorMessage={intl.formatMessage(messages.goalQuestionRequiredError)}
        maxCharacters={INTAKE_QUESTION_CHARACTER_LIMITS.goal}
        fieldTestId="intake-goal-field"
        feedbackTestId="intake-goal-feedback"
      />
    </Stack>
  );
};

export default IntakeGoalsQuestions;
