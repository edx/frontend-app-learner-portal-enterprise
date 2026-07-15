import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import {
  act, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import type { CareerMatch, LearnerIntent } from '../../state';
import CareerSelectionPage, {
  CareerSelectionPageProps,
} from '../CareerSelectionPage';

const learnerIntent: LearnerIntent = {
  careerGoal: 'Senior Data Analyst',
  targetIndustry: 'EdTech',
  background: 'Financial data analyst and team lead.',
  motivation: 'Prepare for promotion.',
};
const matches: CareerMatch[] = [
  {
    id: 'medium',
    title: 'Business Data Analyst',
    matchPercentage: 80,
    skillsToDevelop: ['Stakeholder Management'],
  },
  {
    id: 'low',
    title: 'Inventory Clerk',
    matchPercentage: 20,
    skillsToDevelop: ['Inventory Management'],
  },
  {
    id: 'high',
    title: 'Reporting Manager',
    matchPercentage: 0.95,
    skillsToDevelop: ['SQL', 'Data Visualization'],
  },
];

const noop = jest.fn();
const defaults: CareerSelectionPageProps = {
  learnerIntent,
  careerMatches: matches,
  onSubmitGoalSummary: jest.fn().mockResolvedValue(undefined),
  onSelectCareer: noop,
  isOverwriteOpen: false,
  onCloseOverwrite: noop,
  onConfirmOverwrite: jest.fn().mockResolvedValue(undefined),
  buildButtonRef: React.createRef(),
  isRetakeOpen: false,
  onCloseRetake: noop,
  onConfirmRetake: noop,
  retakeButtonRef: React.createRef(),
  isNoCoursesOpen: false,
  onCloseNoCourses: noop,
  visibleSkills: ['SQL', 'Data Visualization'],
  dismissedSkillCount: 0,
  onDismissSkill: noop,
  onRestoreSkills: noop,
};

const renderPage = (props: Partial<CareerSelectionPageProps> = {}) => render(
  <IntlProvider locale="en">
    <CareerSelectionPage {...defaults} {...props} />
  </IntlProvider>,
);

describe('CareerSelectionPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the goal summary and sorted matches above 25%', () => {
    renderPage();
    expect(screen.getByTestId('profile-career-goal')).toHaveTextContent('Senior Data Analyst');
    const buttons = screen.getAllByTestId(/^career-match-/);
    expect(buttons).toHaveLength(2);
    expect(within(buttons[0]).getByText('Reporting Manager')).toBeInTheDocument();
    expect(within(buttons[0]).getByText('95% match')).toBeInTheDocument();
    expect(screen.queryByText('Inventory Clerk')).not.toBeInTheDocument();
  });

  it('submits edited goal summary fields', async () => {
    const user = userEvent.setup();
    const onSubmitGoalSummary = jest.fn().mockResolvedValue(undefined);
    renderPage({ onSubmitGoalSummary });
    await user.click(screen.getByTestId('goal-summary-edit-button'));
    const careerGoal = screen.getByLabelText('Career Goal');
    await user.clear(careerGoal);
    await user.type(careerGoal, 'Director of Analytics');
    await user.click(screen.getByTestId('goal-summary-submit-button'));
    await waitFor(() => expect(onSubmitGoalSummary).toHaveBeenCalledWith(
      expect.objectContaining({ careerGoal: 'Director of Analytics' }),
    ));
  });

  it('shows the edit prompt when no match is above the threshold', () => {
    renderPage({
      careerMatches: [{ id: 'weak', title: 'Weak', matchPercentage: 25 }],
      visibleSkills: [],
    });
    expect(screen.getByTestId('career-matches-empty-state')).toBeInTheDocument();
  });

  it('shows the career-matches loading spinner', () => {
    renderPage({ isCareerMatchesLoading: true, careerMatches: [] });
    expect(screen.getByTestId('career-matches-loading')).toBeInTheDocument();
    expect(screen.queryByTestId(/^career-match-/)).not.toBeInTheDocument();
  });

  it('shows error alerts for profile and career match errors', () => {
    renderPage({
      profileError: 'Profile error message.',
      careerMatchesError: 'Matches error message.',
    });
    expect(screen.getByText('Profile error message.')).toBeInTheDocument();
    expect(screen.getByText('Matches error message.')).toBeInTheDocument();
  });

  it('renders visible skills passed from the container', () => {
    renderPage({ visibleSkills: ['Python', 'SQL'] });
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  it('shows the overwrite modal when isOverwriteOpen is true', () => {
    renderPage({ isOverwriteOpen: true });
    expect(screen.getByText('Rebuild your Pathway?')).toBeInTheDocument();
  });

  it('calls onCloseOverwrite when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCloseOverwrite = jest.fn();
    renderPage({ isOverwriteOpen: true, onCloseOverwrite });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseOverwrite).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirmOverwrite when Rebuild Pathway is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmOverwrite = jest.fn().mockResolvedValue(undefined);
    renderPage({ isOverwriteOpen: true, onConfirmOverwrite });
    await user.click(screen.getByRole('button', { name: 'Rebuild Pathway' }));
    expect(onConfirmOverwrite).toHaveBeenCalledTimes(1);
  });

  it('shows the retake-quiz modal when isRetakeOpen is true', () => {
    renderPage({ isRetakeOpen: true });
    expect(screen.getByText('Retake your onboarding quiz?')).toBeInTheDocument();
  });

  it('calls onCloseRetake when Cancel is clicked in the retake-quiz modal', async () => {
    const user = userEvent.setup();
    const onCloseRetake = jest.fn();
    renderPage({ isRetakeOpen: true, onCloseRetake });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseRetake).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirmRetake when Retake quiz is clicked in the retake-quiz modal', async () => {
    const user = userEvent.setup();
    const onConfirmRetake = jest.fn();
    renderPage({ isRetakeOpen: true, onConfirmRetake });
    await user.click(screen.getByRole('button', { name: 'Retake quiz' }));
    expect(onConfirmRetake).toHaveBeenCalledTimes(1);
  });

  it('shows the no-courses modal when isNoCoursesOpen is true', () => {
    renderPage({ isNoCoursesOpen: true });
    expect(screen.getByText('We could not build a pathway for this career match')).toBeInTheDocument();
  });

  it('calls onCloseNoCourses when Back is clicked in the no-courses modal', async () => {
    const user = userEvent.setup();
    const onCloseNoCourses = jest.fn();
    renderPage({ isNoCoursesOpen: true, onCloseNoCourses });
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onCloseNoCourses).toHaveBeenCalledTimes(1);
  });

  it('closes the no-courses modal and opens Goal Summary editing when Choose a different match is clicked', async () => {
    const user = userEvent.setup();
    const onCloseNoCourses = jest.fn();
    renderPage({ isNoCoursesOpen: true, onCloseNoCourses });

    await user.click(screen.getByRole('button', { name: 'Choose a different match' }));

    expect(onCloseNoCourses).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Career Goal')).toBeInTheDocument();
    // isNoCoursesOpen here is a static prop passed by this isolated-component test, so
    // the modal's own focus trap does not actually release the way it does when the
    // container flips it to false in response to onCloseNoCourses — that end-to-end
    // focus-restoration behavior is covered by CareerSelectionContainer's tests instead.
  });

  it('schedules deferred focus handoff when choosing a different match from the no-courses modal', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const onCloseNoCourses = jest.fn();
    try {
      renderPage({ isNoCoursesOpen: true, onCloseNoCourses });

      await user.click(screen.getByRole('button', { name: 'Choose a different match' }));

      expect(onCloseNoCourses).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenCalled();
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(screen.getByLabelText('Career Goal')).toBeInTheDocument();
    } finally {
      setTimeoutSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('falls back to the top match when selectedCareerId does not match any visible career', () => {
    renderPage({ selectedCareerId: 'stale-id-not-in-matches' });
    expect(screen.getByTestId('career-match-high')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('career-match-medium')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clamps out-of-range match percentages and omits the badge when percentage is missing', () => {
    renderPage({
      careerMatches: [
        { id: 'no-pct', title: 'No Percentage Role' },
        { id: 'over', title: 'Over Max Role', matchPercentage: 150 },
        { id: 'under', title: 'Under Min Role', matchPercentage: -10 },
      ],
    });
    const noPctButton = screen.getByTestId('career-match-no-pct');
    expect(within(noPctButton).queryByText(/% match/)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('career-match-over')).getByText('100% match')).toBeInTheDocument();
    expect(screen.queryByTestId('career-match-under')).not.toBeInTheDocument();
  });
});
