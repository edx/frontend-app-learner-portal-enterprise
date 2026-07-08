import React, { useEffect } from 'react';
import { Form, Stack } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { usePathwaysStore } from '../state';
import { usePathwaysActionBar } from '../action-bar';
import IntakeQuestionSection from './IntakeQuestionSection';
import IntakeBackgroundQuestions from './IntakeBackgroundQuestions';
import IntakeGoalsQuestions from './IntakeGoalsQuestions';
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

const FORM_ID = 'pathways-intake-form';

const IntakeQuestionsContainer = ({
  onSubmit,
  onSkip,
}: IntakeQuestionsContainerProps) => {
  const onboardingAnswers = usePathwaysStore((state) => state.onboarding.answers);
  const setOnboardingAnswers = usePathwaysStore((state) => state.setOnboardingAnswers);
  const intl = useIntl();
  const { registerActions, clearActions } = usePathwaysActionBar();

  const methods = useForm<IntakeFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      motivation: onboardingAnswers.motivation ?? '',
      goal: onboardingAnswers.goal ?? '',
      background: onboardingAnswers.background ?? '',
      industry: onboardingAnswers.industry ?? '',
    },
  });

  const handleFormSubmit = methods.handleSubmit((values) => {
    const normalizedValues: IntakeFormValues = {
      motivation: (values.motivation ?? emptyDefaultValues.motivation).trim(),
      goal: (values.goal ?? emptyDefaultValues.goal).trim(),
      background: (values.background ?? emptyDefaultValues.background).trim(),
      industry: (values.industry ?? emptyDefaultValues.industry).trim(),
    };
    setOnboardingAnswers(normalizedValues);
    onSubmit(normalizedValues);
  });

  // Register submit (and optional skip) in the page-level action bar.
  // External <button type="submit" form={FORM_ID}> triggers handleFormSubmit
  // via the native form submit event — react-hook-form validates as normal.
  useEffect(() => {
    registerActions({
      primary: {
        id: 'intake-submit',
        label: messages.submitAndReviewProfile,
        variant: 'primary',
        type: 'submit',
        form: FORM_ID,
        testId: 'intake-submit-button',
      },
      secondary: onSkip
        ? [{
          id: 'intake-skip',
          label: messages.skipToDashboard,
          variant: 'tertiary',
          type: 'button',
          onClick: onSkip,
          testId: 'intake-skip-button',
        }]
        : [],
      alignment: 'end',
    });
    return () => clearActions();
  }, [onSkip, registerActions, clearActions, intl]);

  return (
    <section data-testid="intake-questions-container">
      <FormProvider {...methods}>
        <Form id={FORM_ID} onSubmit={handleFormSubmit} data-testid="intake-form">
          <Stack gap={4}>
            <IntakeQuestionSection
              title={intl.formatMessage(messages.goalsSectionTitle)}
              emptyPlaceholderTestId="intake-goals-questions-placeholder"
            >
              <IntakeGoalsQuestions />
            </IntakeQuestionSection>
            <IntakeQuestionSection
              title={intl.formatMessage(messages.backgroundSectionTitle)}
              emptyPlaceholderTestId="intake-background-questions-placeholder"
            >
              <IntakeBackgroundQuestions />
            </IntakeQuestionSection>
          </Stack>
        </Form>
      </FormProvider>
    </section>
  );
};

export default IntakeQuestionsContainer;
