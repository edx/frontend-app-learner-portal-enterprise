import React from 'react';
import { Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import IntakeTextareaQuestionField from './IntakeTextareaQuestionField';
import messages from './messages';

const IntakeBackgroundQuestions: React.FC = () => {
  const intl = useIntl();

  return (
    <Stack gap={3} data-testid="intake-background-questions">
      <IntakeTextareaQuestionField
        name="background"
        controlId="intake-background-question"
        label={intl.formatMessage(messages.backgroundQuestionLabel)}
        placeholder={intl.formatMessage(messages.backgroundQuestionPlaceholder)}
        requiredErrorMessage={intl.formatMessage(messages.backgroundQuestionRequiredError)}
        fieldTestId="intake-background-field"
        feedbackTestId="intake-background-feedback"
      />
      <IntakeTextareaQuestionField
        name="industry"
        controlId="intake-industry-question"
        label={intl.formatMessage(messages.industryQuestionLabel)}
        placeholder={intl.formatMessage(messages.industryQuestionPlaceholder)}
        requiredErrorMessage={intl.formatMessage(messages.industryQuestionRequiredError)}
        fieldTestId="intake-industry-field"
        feedbackTestId="intake-industry-feedback"
      />
    </Stack>
  );
};

export default IntakeBackgroundQuestions;
