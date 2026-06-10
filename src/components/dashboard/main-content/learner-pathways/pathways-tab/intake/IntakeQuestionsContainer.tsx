import React from 'react';
import {
  Form,
  Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import IntakeFooterActions from './IntakeFooterActions';
import IntakeQuestionSection from './IntakeQuestionSection';
import messages from './messages';

export interface IntakeFormValues {
  motivation: string;
  goal: string;
  background: string;
  industry: string;
}

export interface IntakeQuestionsContainerProps {
  onSubmit: (values: IntakeFormValues) => void;
  onSkip?: () => void;
  goalsQuestions?: React.ReactNode;
  backgroundQuestions?: React.ReactNode;
}

const defaultValues: IntakeFormValues = {
  motivation: '',
  goal: '',
  background: '',
  industry: '',
};

const IntakeQuestionsContainer: React.FC<IntakeQuestionsContainerProps> = ({
  onSubmit,
  onSkip,
  goalsQuestions,
  backgroundQuestions,
}) => {
  const methods = useForm<IntakeFormValues>({ defaultValues });
  const intl = useIntl();
  const handleFormSubmit = methods.handleSubmit((values) => {
    onSubmit({
      motivation: values.motivation ?? defaultValues.motivation,
      goal: values.goal ?? defaultValues.goal,
      background: values.background ?? defaultValues.background,
      industry: values.industry ?? defaultValues.industry,
    });
  });

  return (
    <section data-testid="intake-questions-container">
      <FormProvider {...methods}>
        <Form onSubmit={handleFormSubmit} data-testid="intake-form">
          <Stack gap={4}>
            <IntakeQuestionSection
              title={intl.formatMessage(messages.goalsSectionTitle)}
              emptyPlaceholderTestId="intake-goals-questions-placeholder"
            >
              {goalsQuestions}
            </IntakeQuestionSection>
            <IntakeQuestionSection
              title={intl.formatMessage(messages.backgroundSectionTitle)}
              emptyPlaceholderTestId="intake-background-questions-placeholder"
            >
              {backgroundQuestions}
            </IntakeQuestionSection>
            <IntakeFooterActions onSkip={onSkip} />
          </Stack>
        </Form>
      </FormProvider>
    </section>
  );
};

export default IntakeQuestionsContainer;
