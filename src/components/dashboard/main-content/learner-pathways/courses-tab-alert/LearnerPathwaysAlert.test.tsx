import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import LearnerPathwaysAlert from './LearnerPathwaysAlert';
import { LEARNER_PATHWAYS_ALERT_DESCRIPTORS } from './data/constants';
import type { LearnerPathwaysAlertViewModel } from './types';
import type { PathwaysExperienceStatus } from '../pathways-tab/state';

const baseViewModel = (status: PathwaysExperienceStatus, overrides = {}): LearnerPathwaysAlertViewModel => ({
  status,
  show: true,
  descriptor: LEARNER_PATHWAYS_ALERT_DESCRIPTORS[status],
  careerGoal: 'Data Scientist',
  progress: null,
  ctaDisabled: false,
  onCtaClick: jest.fn(),
  onDismiss: jest.fn(),
  ...overrides,
});

const renderAlert = (viewModel: LearnerPathwaysAlertViewModel) => render(
  <IntlProvider locale="en">
    <LearnerPathwaysAlert {...viewModel} />
  </IntlProvider>,
);

describe('LearnerPathwaysAlert', () => {
  it.each([
    ['not_started', 'Ready to start your learning journey?', 'Take onboarding quiz'],
    ['onboarding_in_progress', 'Keep building your pathway', 'Continue quiz'],
    ['profile_ready', 'Your personalized pathway is almost ready!', 'Review career profile'],
    ['pathway_completed', 'Learning pathway completed!', 'Retake onboarding quiz'],
  ] as const)('renders the %s heading, body, gradient class, and CTA label', (status, heading, ctaLabel) => {
    renderAlert(baseViewModel(status));

    expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ctaLabel })).toBeInTheDocument();
    expect(screen.getByTestId('learner-pathways-alert')).toHaveClass(`pathways-alert--${LEARNER_PATHWAYS_ALERT_DESCRIPTORS[status].family}`);
  });

  it('renders no progress line for states with no generated pathway', () => {
    renderAlert(baseViewModel('not_started'));
    expect(screen.queryByText(/courses in progress|completed/)).not.toBeInTheDocument();
  });

  it('renders the "in progress" progress-line template before any course is completed', () => {
    renderAlert(baseViewModel('pathway_ready', {
      progress: { completed: 0, inProgress: 0, totalCourses: 5 },
    }));
    expect(screen.getByText('Data Scientist: 0/5 courses in progress')).toBeInTheDocument();
  });

  it('renders the "partial" progress-line template once at least one course is completed and one is in progress', () => {
    renderAlert(baseViewModel('pathway_in_progress', {
      progress: { completed: 1, inProgress: 1, totalCourses: 5 },
    }));
    expect(screen.getByText('Data Scientist: 1 completed • 1 in progress')).toBeInTheDocument();
  });

  it('renders the "completed" progress-line template once every course is completed', () => {
    renderAlert(baseViewModel('pathway_completed', {
      progress: { completed: 5, inProgress: 0, totalCourses: 5 },
    }));
    expect(screen.getByText('Data Scientist: 5/5 courses completed!')).toBeInTheDocument();
  });

  it('disables the CTA button when ctaDisabled is true', () => {
    renderAlert(baseViewModel('not_started', { ctaDisabled: true }));
    expect(screen.getByRole('button', { name: 'Take onboarding quiz' })).toBeDisabled();
  });

  it('calls onCtaClick when the CTA button is clicked', async () => {
    const user = userEvent.setup();
    const onCtaClick = jest.fn();
    renderAlert(baseViewModel('not_started', { onCtaClick }));

    await user.click(screen.getByRole('button', { name: 'Take onboarding quiz' }));

    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the Dismiss action is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    renderAlert(baseViewModel('not_started', { onDismiss }));

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render when show is false', () => {
    renderAlert(baseViewModel('not_started', { show: false }));
    expect(screen.queryByTestId('learner-pathways-alert')).not.toBeInTheDocument();
  });
});
