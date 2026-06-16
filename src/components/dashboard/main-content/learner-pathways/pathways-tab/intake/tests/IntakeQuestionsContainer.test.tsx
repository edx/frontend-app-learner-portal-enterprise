import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakeQuestionsContainer from '../IntakeQuestionsContainer';
import messages from '../messages';
import { usePathwaysStore } from '../../state';

interface MockIntakeQuestionsContainerProps {
  onSubmit?: jest.Mock;
  onSkip?: () => void;
}

const MockIntakeQuestionsContainer = ({
  onSubmit = jest.fn(),
  onSkip,
}: MockIntakeQuestionsContainerProps) => (
  <IntlProvider locale="en">
    <IntakeQuestionsContainer
      onSubmit={onSubmit}
      onSkip={onSkip}
    />
  </IntlProvider>
);

describe('IntakeQuestionsContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
  });

  it('renders translated question section titles', () => {
    render(<MockIntakeQuestionsContainer />);

    expect(screen.getByRole('heading', { name: messages.goalsSectionTitle.defaultMessage })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: messages.backgroundSectionTitle.defaultMessage })).toBeInTheDocument();
  });

  it('renders owned goals/background question components directly', () => {
    render(<MockIntakeQuestionsContainer />);

    expect(screen.getByTestId('intake-goals-questions')).toBeInTheDocument();
    expect(screen.getByTestId('intake-background-questions')).toBeInTheDocument();
    expect(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.backgroundQuestionLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.industryQuestionLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByTestId('intake-motivation-field')).toBeInTheDocument();
    expect(screen.getByTestId('intake-goal-field')).toBeInTheDocument();
    expect(screen.getByTestId('intake-background-field')).toBeInTheDocument();
    expect(screen.getByTestId('intake-industry-field')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(messages.motivationQuestionPlaceholder.defaultMessage)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(messages.goalQuestionPlaceholder.defaultMessage)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(messages.backgroundQuestionPlaceholder.defaultMessage)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(messages.industryQuestionPlaceholder.defaultMessage)).toBeInTheDocument();
  });

  it('hydrates RHF default values from onboarding answers in store', () => {
    usePathwaysStore.getState().setOnboardingAnswers({
      motivation: 'I want to grow in my current role',
      goal: 'Move into data analytics',
      background: 'Operations and reporting',
      industry: 'Technology',
    });

    render(<MockIntakeQuestionsContainer />);

    expect(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage)).toHaveValue('I want to grow in my current role');
    expect(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage)).toHaveValue('Move into data analytics');
    expect(screen.getByLabelText(messages.backgroundQuestionLabel.defaultMessage)).toHaveValue('Operations and reporting');
    expect(screen.getByLabelText(messages.industryQuestionLabel.defaultMessage)).toHaveValue('Technology');
  });

  it('shows all required validation errors and blocks submit on empty form', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockIntakeQuestionsContainer onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('intake-motivation-feedback')).toHaveTextContent(messages.motivationQuestionRequiredError.defaultMessage);
    expect(screen.getByTestId('intake-goal-feedback')).toHaveTextContent(messages.goalQuestionRequiredError.defaultMessage);
    expect(screen.getByTestId('intake-background-feedback')).toHaveTextContent(messages.backgroundQuestionRequiredError.defaultMessage);
    expect(screen.getByTestId('intake-industry-feedback')).toHaveTextContent(messages.industryQuestionRequiredError.defaultMessage);
    expect(screen.getByTestId('intake-motivation-field')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('intake-goal-field')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('intake-background-field')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('intake-industry-field')).toHaveAttribute('aria-invalid', 'true');
  });

  it('persists answers to store before calling onSubmit', async () => {
    const user = userEvent.setup();
    const expectedValues = {
      motivation: 'Motivation answer',
      goal: 'Goal answer',
      background: 'Background answer',
      industry: 'Healthcare',
    };
    const onSubmit = jest.fn((submittedValues) => {
      expect(usePathwaysStore.getState().onboarding.answers).toEqual(expectedValues);
      expect(submittedValues).toEqual(expectedValues);
    });
    render(<MockIntakeQuestionsContainer onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), '  Motivation answer  ');
    await user.type(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage), '  Goal answer  ');
    await user.type(screen.getByLabelText(messages.backgroundQuestionLabel.defaultMessage), '  Background answer  ');
    await user.type(screen.getByLabelText(messages.industryQuestionLabel.defaultMessage), '  Healthcare  ');
    await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(usePathwaysStore.getState().onboarding.answers).toEqual(expectedValues);
  });

  it('rejects whitespace-only input with required messages', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockIntakeQuestionsContainer onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), '   ');
    await user.type(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage), '   ');
    await user.type(screen.getByLabelText(messages.backgroundQuestionLabel.defaultMessage), '   ');
    await user.type(screen.getByLabelText(messages.industryQuestionLabel.defaultMessage), '   ');
    await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(messages.motivationQuestionRequiredError.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText(messages.goalQuestionRequiredError.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText(messages.backgroundQuestionRequiredError.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText(messages.industryQuestionRequiredError.defaultMessage)).toBeInTheDocument();
  });

  it('calls onSkip when skip action is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = jest.fn();

    render(<MockIntakeQuestionsContainer onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: messages.skipToDashboard.defaultMessage }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
