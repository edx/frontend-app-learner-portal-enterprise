import React from 'react';
import {
  Form,
  Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { usePathwaysStore } from '../state';
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
}

const emptyDefaultValues: IntakeFormValues = {
  motivation: '',
  goal: '',
  background: '',
  industry: '',
};

const IntakeQuestionsContainer: React.FC<IntakeQuestionsContainerProps> = ({
  onSubmit,
  onSkip,
}) => {
  const onboardingAnswers = usePathwaysStore((state) => state.onboarding.answers);
  const setOnboardingAnswers = usePathwaysStore((state) => state.setOnboardingAnswers);
  const methods = useForm<IntakeFormValues>({
    defaultValues: {
      motivation: onboardingAnswers.motivation ?? '',
      goal: onboardingAnswers.goal ?? '',
      background: onboardingAnswers.background ?? '',
      industry: onboardingAnswers.industry ?? '',
    },
  });
  const intl = useIntl();
  const handleFormSubmit = methods.handleSubmit((values) => {
    const normalizedValues: IntakeFormValues = {
      motivation: values.motivation ?? emptyDefaultValues.motivation,
      goal: values.goal ?? emptyDefaultValues.goal,
      background: values.background ?? emptyDefaultValues.background,
      industry: values.industry ?? emptyDefaultValues.industry,
    };
    setOnboardingAnswers(normalizedValues);
    onSubmit(normalizedValues);
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
              {/* <IntakeGoalsQuestions /> */}
            </IntakeQuestionSection>
            <IntakeQuestionSection
              title={intl.formatMessage(messages.backgroundSectionTitle)}
              emptyPlaceholderTestId="intake-background-questions-placeholder"
            >
              {/* <IntakeBackgroundQuestions /> */}
            </IntakeQuestionSection>
            <IntakeFooterActions onSkip={onSkip} />
          </Stack>
        </Form>
      </FormProvider>
    </section>
  );
};

export default IntakeQuestionsContainer;
