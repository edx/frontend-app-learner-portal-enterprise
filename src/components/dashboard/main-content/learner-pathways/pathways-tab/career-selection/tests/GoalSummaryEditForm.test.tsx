import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useForm } from 'react-hook-form';

import type { GoalSummaryFields } from '../GoalSummaryCard';
import GoalSummaryEditForm from '../GoalSummaryEditForm';

const NON_EMPTY_DEFAULTS: GoalSummaryFields = {
  careerGoal: 'Senior Data Analyst',
  targetIndustry: 'EdTech',
  background: 'Data analyst background.',
  motivation: 'Upskill for promotion.',
};

const Wrapper = ({
  isProfileSubmitting = false,
  defaultValues = NON_EMPTY_DEFAULTS,
}: {
  isProfileSubmitting?: boolean;
  defaultValues?: GoalSummaryFields;
}) => {
  const { control } = useForm<GoalSummaryFields>({
    defaultValues,
    mode: 'onChange',
  });
  return (
    <IntlProvider locale="en">
      <form>
        <GoalSummaryEditForm control={control} isProfileSubmitting={isProfileSubmitting} />
      </form>
    </IntlProvider>
  );
};

describe('GoalSummaryEditForm', () => {
  it('renders all four textarea fields with correct labels', () => {
    render(<Wrapper />);
    expect(screen.getByLabelText('Career Goal')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Industry')).toBeInTheDocument();
    expect(screen.getByLabelText('Background')).toBeInTheDocument();
    expect(screen.getByLabelText('Motivation')).toBeInTheDocument();
  });

  it('pre-fills field values from the form defaultValues', () => {
    render(<Wrapper />);
    expect(screen.getByLabelText('Career Goal')).toHaveValue('Senior Data Analyst');
    expect(screen.getByLabelText('Target Industry')).toHaveValue('EdTech');
    expect(screen.getByLabelText('Background')).toHaveValue('Data analyst background.');
    expect(screen.getByLabelText('Motivation')).toHaveValue('Upskill for promotion.');
  });

  it('disables all fields when isProfileSubmitting is true', () => {
    render(<Wrapper isProfileSubmitting />);
    expect(screen.getByLabelText('Career Goal')).toBeDisabled();
    expect(screen.getByLabelText('Target Industry')).toBeDisabled();
    expect(screen.getByLabelText('Background')).toBeDisabled();
    expect(screen.getByLabelText('Motivation')).toBeDisabled();
  });

  it('renders character counters for all four fields', () => {
    render(<Wrapper />);
    expect(screen.getByTestId('goal-summary-career-goal-field-counter')).toBeInTheDocument();
    expect(screen.getByTestId('goal-summary-target-industry-field-counter')).toBeInTheDocument();
    expect(screen.getByTestId('goal-summary-background-field-counter')).toBeInTheDocument();
    expect(screen.getByTestId('goal-summary-motivation-field-counter')).toBeInTheDocument();
  });

  it('shows required error when a field is cleared to empty', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.clear(screen.getByLabelText('Career Goal'));
    expect(screen.getByTestId('goal-summary-career-goal-feedback')).toHaveTextContent(
      'Please enter a career goal.',
    );
  });

  it('shows required error for whitespace-only input', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaultValues={{ ...NON_EMPTY_DEFAULTS, careerGoal: '' }} />);
    await user.type(screen.getByLabelText('Career Goal'), '   ');
    expect(screen.getByTestId('goal-summary-career-goal-feedback')).toHaveTextContent(
      'Please enter a career goal.',
    );
  });

  it('shows character limit error when a field exceeds 300 characters', async () => {
    const user = userEvent.setup();
    render(<Wrapper defaultValues={{ ...NON_EMPTY_DEFAULTS, careerGoal: '' }} />);
    await user.type(screen.getByLabelText('Career Goal'), 'a'.repeat(301));
    expect(screen.getByTestId('goal-summary-career-goal-feedback')).toHaveTextContent(
      'Please keep your response up to 300 characters.',
    );
  });
});
