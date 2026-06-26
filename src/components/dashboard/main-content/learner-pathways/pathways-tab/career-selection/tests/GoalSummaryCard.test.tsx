import '@testing-library/jest-dom/extend-expect';
import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import type { LearnerProfile } from '../../state';
import GoalSummaryCard, { GoalSummaryCardProps } from '../GoalSummaryCard';

const testProfile: LearnerProfile = {
  summary: 'Test summary',
  careerGoal: 'Senior Data Analyst',
  targetIndustry: 'EdTech',
  background: 'Data analyst with five years experience.',
  motivation: 'Upskill for promotion.',
  learningStyle: 'Hands-on',
  weeklyTimeCommitment: '5 hours',
  certificatePreference: 'Preferred',
  skills: ['SQL', 'Python'],
};

/**
 * Controlled wrapper so we can test state transitions triggered by onBeginEditing/onEndEditing.
 */
const ControlledCard = ({
  onSubmitGoalSummary = jest.fn().mockResolvedValue(undefined),
  isProfileSubmitting = false,
  profileError = null,
}: Partial<GoalSummaryCardProps>) => {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <IntlProvider locale="en">
      <GoalSummaryCard
        profile={testProfile}
        isEditing={isEditing}
        isProfileSubmitting={isProfileSubmitting}
        profileError={profileError}
        onBeginEditing={() => setIsEditing(true)}
        onEndEditing={() => setIsEditing(false)}
        onSubmitGoalSummary={onSubmitGoalSummary}
      />
    </IntlProvider>
  );
};

describe('GoalSummaryCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders view mode with profile field values', () => {
    render(<ControlledCard />);
    expect(screen.getByTestId('profile-career-goal')).toHaveTextContent('Senior Data Analyst');
    expect(screen.getByTestId('profile-target-industry')).toHaveTextContent('EdTech');
    expect(screen.getByTestId('profile-background')).toHaveTextContent('Data analyst with five years experience.');
    expect(screen.getByTestId('profile-motivation')).toHaveTextContent('Upskill for promotion.');
  });

  it('opens edit mode when the edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ControlledCard />);
    await user.click(screen.getByTestId('goal-summary-edit-button'));
    expect(screen.getByLabelText('Career Goal')).toBeInTheDocument();
    expect(screen.getByTestId('goal-summary-submit-button')).toBeInTheDocument();
  });

  it('submit button is disabled when no fields are changed', async () => {
    const user = userEvent.setup();
    render(<ControlledCard />);
    await user.click(screen.getByTestId('goal-summary-edit-button'));
    expect(screen.getByTestId('goal-summary-submit-button')).toBeDisabled();
  });

  it('submits updated goal summary fields on form submit', async () => {
    const user = userEvent.setup();
    const onSubmitGoalSummary = jest.fn().mockResolvedValue(undefined);
    render(<ControlledCard onSubmitGoalSummary={onSubmitGoalSummary} />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));
    const goalInput = screen.getByLabelText('Career Goal');
    await user.clear(goalInput);
    await user.type(goalInput, 'Director of Analytics');
    await user.click(screen.getByTestId('goal-summary-submit-button'));

    await waitFor(() => expect(onSubmitGoalSummary).toHaveBeenCalledWith(
      expect.objectContaining({ careerGoal: 'Director of Analytics' }),
    ));
    // Edit mode closes after successful submit
    expect(screen.queryByTestId('goal-summary-submit-button')).not.toBeInTheDocument();
  });

  it('cancel closes edit mode without submitting', async () => {
    const user = userEvent.setup();
    const onSubmitGoalSummary = jest.fn();
    render(<ControlledCard onSubmitGoalSummary={onSubmitGoalSummary} />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));
    const goalInput = screen.getByLabelText('Career Goal');
    await user.clear(goalInput);
    await user.type(goalInput, 'Some other goal');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSubmitGoalSummary).not.toHaveBeenCalled();
    expect(screen.queryByTestId('goal-summary-submit-button')).not.toBeInTheDocument();
  });

  it('shows the profile error alert', () => {
    render(<ControlledCard profileError="Unable to update profile." />);
    expect(screen.getByText('Unable to update profile.')).toBeInTheDocument();
  });

  it('shows spinner and disables submit when isProfileSubmitting', () => {
    render(
      <IntlProvider locale="en">
        <GoalSummaryCard
          profile={testProfile}
          isEditing
          isProfileSubmitting
          onBeginEditing={jest.fn()}
          onEndEditing={jest.fn()}
          onSubmitGoalSummary={jest.fn()}
        />
      </IntlProvider>,
    );
    const submitBtn = screen.getByTestId('goal-summary-submit-button');
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('Submitting...');
  });

  it('resets draft fields when edit mode opens a second time', async () => {
    const user = userEvent.setup();
    render(<ControlledCard />);

    // First edit session: type something then cancel
    await user.click(screen.getByTestId('goal-summary-edit-button'));
    const goalInput = screen.getByLabelText('Career Goal');
    await user.clear(goalInput);
    await user.type(goalInput, 'Temporary goal');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Second edit session: draft should be reset to profile values
    await user.click(screen.getByTestId('goal-summary-edit-button'));
    expect(screen.getByLabelText('Career Goal')).toHaveValue('Senior Data Analyst');
  });

  it('shows pre-filled profile values in edit mode textarea fields', async () => {
    const user = userEvent.setup();
    render(<ControlledCard />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));

    expect(screen.getByLabelText('Career Goal')).toHaveValue('Senior Data Analyst');
    expect(screen.getByLabelText('Target Industry')).toHaveValue('EdTech');
    expect(screen.getByLabelText('Background')).toHaveValue('Data analyst with five years experience.');
    expect(screen.getByLabelText('Motivation')).toHaveValue('Upskill for promotion.');
  });

  it('renders character counters for all edit mode fields', async () => {
    const user = userEvent.setup();
    render(<ControlledCard />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));

    expect(screen.getByTestId('goal-summary-career-goal-field-counter')).toBeInTheDocument();
    expect(screen.getByTestId('goal-summary-target-industry-field-counter')).toBeInTheDocument();
    expect(screen.getByTestId('goal-summary-background-field-counter')).toBeInTheDocument();
    expect(screen.getByTestId('goal-summary-motivation-field-counter')).toBeInTheDocument();
  });

  it('shows character limit error when a field exceeds 300 characters', async () => {
    const user = userEvent.setup();
    render(<ControlledCard />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));
    const goalInput = screen.getByLabelText('Career Goal');
    await user.clear(goalInput);
    await user.type(goalInput, 'a'.repeat(301));

    expect(screen.getByTestId('goal-summary-career-goal-feedback')).toHaveTextContent(
      'Please keep your response up to 300 characters.',
    );
    expect(screen.getByTestId('goal-summary-career-goal-field')).toHaveAttribute('aria-invalid', 'true');
  });

  it('trims leading and trailing whitespace from field values on submit', async () => {
    const user = userEvent.setup();
    const onSubmitGoalSummary = jest.fn().mockResolvedValue(undefined);
    render(<ControlledCard onSubmitGoalSummary={onSubmitGoalSummary} />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));
    const goalInput = screen.getByLabelText('Career Goal');
    await user.clear(goalInput);
    await user.type(goalInput, '  Director of Analytics  ');
    await user.click(screen.getByTestId('goal-summary-submit-button'));

    await waitFor(() => expect(onSubmitGoalSummary).toHaveBeenCalledWith(
      expect.objectContaining({ careerGoal: 'Director of Analytics' }),
    ));
  });

  it('shows required error and blocks submit when a field is cleared to empty', async () => {
    const user = userEvent.setup();
    const onSubmitGoalSummary = jest.fn();
    render(<ControlledCard onSubmitGoalSummary={onSubmitGoalSummary} />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));
    await user.clear(screen.getByLabelText('Career Goal'));

    expect(screen.getByTestId('goal-summary-career-goal-feedback')).toHaveTextContent(
      'Please enter a career goal.',
    );
    expect(screen.getByTestId('goal-summary-career-goal-field')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('goal-summary-submit-button')).toBeDisabled();
  });

  it('does not call onSubmitGoalSummary when a required field is empty', async () => {
    const user = userEvent.setup();
    const onSubmitGoalSummary = jest.fn();
    render(<ControlledCard onSubmitGoalSummary={onSubmitGoalSummary} />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));
    await user.clear(screen.getByLabelText('Career Goal'));
    await user.click(screen.getByTestId('goal-summary-submit-button'));

    expect(onSubmitGoalSummary).not.toHaveBeenCalled();
  });

  it('shows required error for whitespace-only input', async () => {
    const user = userEvent.setup();
    render(<ControlledCard />);

    await user.click(screen.getByTestId('goal-summary-edit-button'));
    const goalInput = screen.getByLabelText('Career Goal');
    await user.clear(goalInput);
    await user.type(goalInput, '   ');

    expect(screen.getByTestId('goal-summary-career-goal-feedback')).toHaveTextContent(
      'Please enter a career goal.',
    );
    expect(screen.getByTestId('goal-summary-submit-button')).toBeDisabled();
  });
});
