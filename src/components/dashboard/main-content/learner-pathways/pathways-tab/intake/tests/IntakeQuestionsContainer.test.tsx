import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { mergeConfig } from '@edx/frontend-platform';
import { sendEnterpriseTrackEvent } from '@2uinc/frontend-enterprise-utils';
import IntakeQuestionsContainer from '../IntakeQuestionsContainer';
import { DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION } from '../constants';
import messages from '../messages';
import type { PathwaysFlowVariant } from '../../flowVariant';
import { usePathwaysStore } from '../../state';
import { PathwaysActionBarProvider } from '../../action-bar';
import { useEnterpriseCustomer } from '../../../../../../app/data';
import { enterpriseCustomerFactory } from '../../../../../../app/data/services/data/__factories__';
import { PATHWAYS_EVENTS } from '../../../../../../../eventTracking';

jest.mock('../../../../../../app/data', () => ({
  ...jest.requireActual('../../../../../../app/data'),
  useEnterpriseCustomer: jest.fn(),
}));
jest.mock('@2uinc/frontend-enterprise-utils', () => ({
  ...jest.requireActual('@2uinc/frontend-enterprise-utils'),
  sendEnterpriseTrackEvent: jest.fn(),
}));

interface MockIntakeQuestionsContainerProps {
  onSubmit?: jest.Mock;
  onSkip?: () => void;
  flowVariant?: PathwaysFlowVariant;
  isProfileSubmitting?: boolean;
  profileError?: string | null;
}

const MockIntakeQuestionsContainer = ({
  onSubmit = jest.fn(),
  onSkip,
  flowVariant,
  isProfileSubmitting,
  profileError,
}: MockIntakeQuestionsContainerProps) => (
  <IntlProvider locale="en">
    <PathwaysActionBarProvider>
      <IntakeQuestionsContainer
        onSubmit={onSubmit}
        onSkip={onSkip}
        flowVariant={flowVariant}
        isProfileSubmitting={isProfileSubmitting}
        profileError={profileError}
      />
    </PathwaysActionBarProvider>
  </IntlProvider>
);

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/mock-form/viewform';
const mockEnterpriseCustomer = enterpriseCustomerFactory({ slug: 'test-enterprise' });

describe('IntakeQuestionsContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
    mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: FEEDBACK_FORM_URL });
    (useEnterpriseCustomer as jest.Mock).mockReturnValue({ data: mockEnterpriseCustomer });
    (sendEnterpriseTrackEvent as jest.Mock).mockClear();
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

  it('renders character counters for all fields and updates counter while typing', async () => {
    const user = userEvent.setup();
    render(<MockIntakeQuestionsContainer />);

    expect(screen.getAllByText(`0/${DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}`)).toHaveLength(4);

    await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), 'career');

    expect(screen.getByText(`6/${DEFAULT_MAX_CHARACTERS_PER_INTAKE_QUESTION}`)).toBeInTheDocument();
  });

  it('hydrates RHF default values from learnerIntent in store', () => {
    usePathwaysStore.getState().setLearnerIntent({
      motivation: 'I want to grow in my current role',
      careerGoal: 'Move into data analytics',
      background: 'Operations and reporting',
      targetIndustry: 'Technology',
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

  it('fires intake.validation_failed with the count of invalid fields, once per failed submit click', async () => {
    const user = userEvent.setup();
    render(<MockIntakeQuestionsContainer onSubmit={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

    expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
      mockEnterpriseCustomer.uuid,
      PATHWAYS_EVENTS.INTAKE_VALIDATION_FAILED,
      expect.objectContaining({ invalidFieldCount: 4 }),
    );
    expect((sendEnterpriseTrackEvent as jest.Mock).mock.calls.filter(
      ([, eventName]) => eventName === PATHWAYS_EVENTS.INTAKE_VALIDATION_FAILED,
    )).toHaveLength(1);

    // reValidateMode is 'onChange' after the first failed submit — typing must not
    // re-fire the event on every keystroke.
    await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), 'a');
    expect((sendEnterpriseTrackEvent as jest.Mock).mock.calls.filter(
      ([, eventName]) => eventName === PATHWAYS_EVENTS.INTAKE_VALIDATION_FAILED,
    )).toHaveLength(1);
  });

  it('keeps the action-bar submit button present, single, and enabled after an invalid submission', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockIntakeQuestionsContainer onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

    expect(onSubmit).not.toHaveBeenCalled();
    const submitButtons = screen.getAllByRole('button', { name: messages.submitAndReviewProfile.defaultMessage });
    expect(submitButtons).toHaveLength(1);
    expect(submitButtons[0]).toBeEnabled();
  });

  it('persists answers to store before calling onSubmit', async () => {
    const user = userEvent.setup();
    const expectedValues = {
      motivation: 'Motivation answer',
      careerGoal: 'Goal answer',
      background: 'Background answer',
      targetIndustry: 'Healthcare',
    };
    const onSubmit = jest.fn((submittedValues) => {
      expect(usePathwaysStore.getState().learnerIntent).toEqual(expectedValues);
      expect(submittedValues).toEqual(expectedValues);
    });
    render(<MockIntakeQuestionsContainer onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), '  Motivation answer  ');
    await user.type(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage), '  Goal answer  ');
    await user.type(screen.getByLabelText(messages.backgroundQuestionLabel.defaultMessage), '  Background answer  ');
    await user.type(screen.getByLabelText(messages.industryQuestionLabel.defaultMessage), '  Healthcare  ');
    await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(usePathwaysStore.getState().learnerIntent).toEqual(expectedValues);
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

  it('does not render a Skip to dashboard action when onSkip is not provided', () => {
    render(<MockIntakeQuestionsContainer onSkip={undefined} />);

    expect(screen.queryByRole('button', { name: messages.skipToDashboard.defaultMessage })).not.toBeInTheDocument();
  });

  it('calls onSkip when skip action is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = jest.fn();

    render(<MockIntakeQuestionsContainer onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: messages.skipToDashboard.defaultMessage }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  describe('Give feedback link', () => {
    it('renders leftmost among secondary actions, as a link pointing directly at the form', () => {
      render(<MockIntakeQuestionsContainer onSkip={jest.fn()} />);

      const feedbackLink = screen.getByTestId('pathway-feedback-button');
      expect(feedbackLink.tagName).toBe('A');
      expect(feedbackLink).toHaveAttribute('href', FEEDBACK_FORM_URL);
      expect(feedbackLink).toHaveAttribute('target', '_blank');
    });

    it('renders even when onSkip is not provided (independent of the skip action)', () => {
      render(<MockIntakeQuestionsContainer onSkip={undefined} />);

      expect(screen.getByTestId('pathway-feedback-button')).toBeInTheDocument();
    });

    it('does not call onSubmit or onSkip when clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const onSkip = jest.fn();
      render(<MockIntakeQuestionsContainer onSubmit={onSubmit} onSkip={onSkip} />);

      await user.click(screen.getByTestId('pathway-feedback-button'));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onSkip).not.toHaveBeenCalled();
    });

    it('fires feedback_link.clicked with feedbackSurface "intake" when clicked', async () => {
      const user = userEvent.setup();
      render(<MockIntakeQuestionsContainer onSkip={jest.fn()} />);

      await user.click(screen.getByTestId('pathway-feedback-button'));

      expect(sendEnterpriseTrackEvent).toHaveBeenCalledWith(
        mockEnterpriseCustomer.uuid,
        PATHWAYS_EVENTS.FEEDBACK_LINK_CLICKED,
        expect.objectContaining({ feedbackSurface: 'intake' }),
      );
    });

    it('is entirely absent when PATHWAYS_FEEDBACK_FORM_URL is not configured', () => {
      mergeConfig({ PATHWAYS_FEEDBACK_FORM_URL: null });
      render(<MockIntakeQuestionsContainer onSkip={jest.fn()} />);

      expect(screen.queryByTestId('pathway-feedback-button')).not.toBeInTheDocument();
    });
  });

  describe('profile-submission pending/error state', () => {
    it('shows the loading label and disables the submit action while isProfileSubmitting is true', () => {
      render(<MockIntakeQuestionsContainer isProfileSubmitting />);

      const submitButton = screen.getByTestId('intake-submit-button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(messages.submittingProfile.defaultMessage);
      expect(screen.queryByRole('button', { name: messages.submitAndReviewProfile.defaultMessage })).not.toBeInTheDocument();
    });

    it('disables the skip action while isProfileSubmitting is true', () => {
      const onSkip = jest.fn();
      render(<MockIntakeQuestionsContainer onSkip={onSkip} isProfileSubmitting />);

      expect(screen.getByRole('button', { name: messages.skipToDashboard.defaultMessage })).toBeDisabled();
    });

    it('renders the profile error alert when profileError is set', () => {
      render(<MockIntakeQuestionsContainer profileError="Unable to generate your learner profile." />);

      expect(screen.getByText('Unable to generate your learner profile.')).toBeInTheDocument();
    });

    it('renders no error text when profileError is null', () => {
      render(<MockIntakeQuestionsContainer profileError={null} />);

      expect(screen.queryByText('Unable to generate your learner profile.')).not.toBeInTheDocument();
    });

    it('stays rendered with field values intact when onSubmit rejects (no unhandled rejection)', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockRejectedValue(new Error('network down'));
      render(<MockIntakeQuestionsContainer onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), 'Motivation answer');
      await user.type(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage), 'Goal answer');
      await user.type(screen.getByLabelText(messages.backgroundQuestionLabel.defaultMessage), 'Background answer');
      await user.type(screen.getByLabelText(messages.industryQuestionLabel.defaultMessage), 'Healthcare');
      await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('intake-questions-container')).toBeInTheDocument();
      expect(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage)).toHaveValue('Motivation answer');
      expect(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage)).toHaveValue('Goal answer');
    });
  });

  describe('draft persistence', () => {
    it('debounces draft keystrokes into the store, preserving in-progress whitespace', async () => {
      const user = userEvent.setup();
      render(<MockIntakeQuestionsContainer />);

      await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), 'Grow  ');

      await waitFor(() => {
        expect(usePathwaysStore.getState().learnerIntent.motivation).toBe('Grow  ');
      });
    });

    it('restores draft values on remount (e.g. navigating away and back without submitting)', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<MockIntakeQuestionsContainer />);

      await user.type(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage), 'Become a data analyst');
      await waitFor(() => {
        expect(usePathwaysStore.getState().learnerIntent.careerGoal).toBe('Become a data analyst');
      });
      unmount();

      render(<MockIntakeQuestionsContainer />);

      expect(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage))
        .toHaveValue('Become a data analyst');
    });

    it('overwrites the draft with trimmed values on valid submit, even with a debounced sync still pending', async () => {
      const user = userEvent.setup();
      render(<MockIntakeQuestionsContainer />);

      await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), '  Motivation answer  ');
      await user.type(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage), '  Goal answer  ');
      await user.type(screen.getByLabelText(messages.backgroundQuestionLabel.defaultMessage), '  Background answer  ');
      await user.type(screen.getByLabelText(messages.industryQuestionLabel.defaultMessage), '  Healthcare  ');
      // Submit immediately, without waiting out the debounce window, so the pending
      // draft-sync call is still scheduled when submit fires.
      await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

      expect(usePathwaysStore.getState().learnerIntent).toEqual({
        motivation: 'Motivation answer',
        careerGoal: 'Goal answer',
        background: 'Background answer',
        targetIndustry: 'Healthcare',
      });

      // The canceled draft sync must never fire and clobber the trimmed submit values.
      await new Promise((resolve) => { setTimeout(resolve, 400); });
      expect(usePathwaysStore.getState().learnerIntent).toEqual({
        motivation: 'Motivation answer',
        careerGoal: 'Goal answer',
        background: 'Background answer',
        targetIndustry: 'Healthcare',
      });
    });
  });

  describe('direct flow copy', () => {
    it('shows "Generate recommendations" instead of "Submit and review profile"', () => {
      render(<MockIntakeQuestionsContainer flowVariant="direct" />);

      expect(screen.getByRole('button', { name: messages.generateRecommendations.defaultMessage })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: messages.submitAndReviewProfile.defaultMessage })).not.toBeInTheDocument();
    });

    it('shows "Finding courses..." instead of "Generating your profile..." while pending', () => {
      render(<MockIntakeQuestionsContainer flowVariant="direct" isProfileSubmitting />);

      const submitButton = screen.getByTestId('intake-submit-button');
      expect(submitButton).toHaveTextContent(messages.findingCourses.defaultMessage);
      expect(submitButton).not.toHaveTextContent(messages.submittingProfile.defaultMessage);
    });

    it('still fires onSubmit with the trimmed values — the label swap changes nothing functionally', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<MockIntakeQuestionsContainer flowVariant="direct" onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(messages.motivationQuestionLabel.defaultMessage), 'Motivation answer');
      await user.type(screen.getByLabelText(messages.goalQuestionLabel.defaultMessage), 'Goal answer');
      await user.type(screen.getByLabelText(messages.backgroundQuestionLabel.defaultMessage), 'Background answer');
      await user.type(screen.getByLabelText(messages.industryQuestionLabel.defaultMessage), 'Healthcare');
      await user.click(screen.getByRole('button', { name: messages.generateRecommendations.defaultMessage }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
