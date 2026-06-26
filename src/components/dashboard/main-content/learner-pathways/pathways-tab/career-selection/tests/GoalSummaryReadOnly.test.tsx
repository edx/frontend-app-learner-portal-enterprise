import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import GoalSummaryReadOnly from '../GoalSummaryReadOnly';
import { CAREER_SELECTION_STUB_PROFILE } from '../fixtures';

const renderComponent = (overrides = {}) => render(
  <IntlProvider locale="en">
    <GoalSummaryReadOnly profile={{ ...CAREER_SELECTION_STUB_PROFILE, ...overrides }} />
  </IntlProvider>,
);

describe('GoalSummaryReadOnly', () => {
  it('renders all four profile field values', () => {
    renderComponent();
    expect(screen.getByTestId('profile-career-goal')).toHaveTextContent('Senior Data Analyst');
    expect(screen.getByTestId('profile-target-industry')).toHaveTextContent('EdTech');
    expect(screen.getByTestId('profile-background')).toHaveTextContent(
      'Data analyst at 2U with extensive experience in financial data and team leadership.',
    );
    expect(screen.getByTestId('profile-motivation')).toHaveTextContent(
      'Upskill to prepare for promotion',
    );
  });

  it('falls back to "Not provided" for empty careerGoal', () => {
    renderComponent({ careerGoal: '' });
    expect(screen.getByTestId('profile-career-goal')).toHaveTextContent('Not provided');
  });

  it('falls back to "Not provided" for empty targetIndustry', () => {
    renderComponent({ targetIndustry: '' });
    expect(screen.getByTestId('profile-target-industry')).toHaveTextContent('Not provided');
  });

  it('falls back to "Not provided" for empty background', () => {
    renderComponent({ background: '' });
    expect(screen.getByTestId('profile-background')).toHaveTextContent('Not provided');
  });

  it('falls back to "Not provided" for empty motivation', () => {
    renderComponent({ motivation: '' });
    expect(screen.getByTestId('profile-motivation')).toHaveTextContent('Not provided');
  });

  it('renders all required data-testid attributes', () => {
    renderComponent();
    expect(screen.getByTestId('profile-career-goal')).toBeInTheDocument();
    expect(screen.getByTestId('profile-target-industry')).toBeInTheDocument();
    expect(screen.getByTestId('profile-background')).toBeInTheDocument();
    expect(screen.getByTestId('profile-motivation')).toBeInTheDocument();
  });
});
