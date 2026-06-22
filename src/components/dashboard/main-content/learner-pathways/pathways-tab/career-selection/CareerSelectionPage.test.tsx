import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import type { CareerMatch, LearnerProfile } from '../state';
import CareerSelectionPage, {
  CareerSelectionPageProps,
} from './CareerSelectionPage';

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
const defaults: CareerSelectionPageProps = {
  profile,
  careerMatches: matches,
  onSubmitGoalSummary: jest.fn().mockResolvedValue(undefined),
  onSelectCareer: jest.fn(),
  onBuildPathway: jest.fn().mockResolvedValue(undefined),
};
const renderPage = (props: Partial<CareerSelectionPageProps> = {}) =>
  render(
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
    expect(
      within(buttons[0]).getByText('Reporting Manager'),
    ).toBeInTheDocument();
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
    await waitFor(() =>
      expect(onSubmitGoalSummary).toHaveBeenCalledWith(
        expect.objectContaining({ careerGoal: 'Director of Analytics' }),
      ),
    );
  });

  it('dismisses skills and passes remaining skills to pathway generation', async () => {
    const user = userEvent.setup();
    const onBuildPathway = jest.fn().mockResolvedValue(undefined);
    renderPage({ selectedCareerId: 'high', onBuildPathway });
    await user.click(screen.getByLabelText('Dismiss SQL'));
    await user.click(screen.getByTestId('profile-build-pathway-button'));
    await waitFor(() =>
      expect(onBuildPathway).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'high' }),
        ['Data Visualization'],
      ),
    );
  });

  it('shows the edit prompt when no match is above the threshold', async () => {
    const user = userEvent.setup();
    renderPage({
      careerMatches: [{ id: 'weak', title: 'Weak', matchPercentage: 25 }],
    });
    expect(
      screen.getByTestId('career-matches-empty-state'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('profile-build-pathway-button')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Edit goal summary' }));
    expect(
      screen.getByTestId('goal-summary-submit-button'),
    ).toBeInTheDocument();
  });
});
