import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import type { CareerMatch, LearnerProfile } from '../../state';
import CareerSelectionPage, {
  CareerSelectionPageProps,
} from '../CareerSelectionPage';

const profile: LearnerProfile = {
  summary: 'POC overview that should not render.',
  careerGoal: 'Senior Data Analyst',
  targetIndustry: 'EdTech',
  background: 'Financial data analyst and team lead.',
  motivation: 'Prepare for promotion.',
  learningStyle: 'Hands-on',
  weeklyTimeCommitment: '5 hours',
  certificatePreference: 'Preferred',
  skills: ['Fallback Skill'],
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
  profile,
  careerMatches: matches,
  onSubmitGoalSummary: jest.fn().mockResolvedValue(undefined),
  onSelectCareer: noop,
  isOverwriteOpen: false,
  onCloseOverwrite: noop,
  onConfirmOverwrite: jest.fn().mockResolvedValue(undefined),
  buildButtonRef: React.createRef(),
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

  it('renders the reduced goal summary and sorted matches above 25%', () => {
    renderPage();
    expect(screen.queryByText(profile.summary)).not.toBeInTheDocument();
    expect(screen.queryByText(profile.learningStyle)).not.toBeInTheDocument();
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
    expect(screen.getByText('Overwrite previous pathway?')).toBeInTheDocument();
  });

  it('calls onCloseOverwrite when keep-pathway is clicked', async () => {
    const user = userEvent.setup();
    const onCloseOverwrite = jest.fn();
    renderPage({ isOverwriteOpen: true, onCloseOverwrite });
    await user.click(screen.getByRole('button', { name: 'Keep previous pathway' }));
    expect(onCloseOverwrite).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirmOverwrite when build-new-pathway is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmOverwrite = jest.fn().mockResolvedValue(undefined);
    renderPage({ isOverwriteOpen: true, onConfirmOverwrite });
    await user.click(screen.getByRole('button', { name: 'Build new pathway' }));
    expect(onConfirmOverwrite).toHaveBeenCalledTimes(1);
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
