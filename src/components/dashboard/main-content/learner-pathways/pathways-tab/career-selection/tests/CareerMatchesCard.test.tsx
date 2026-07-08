import '@testing-library/jest-dom/extend-expect';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import type { CareerMatch } from '../../state';
import CareerMatchesCard from '../CareerMatchesCard';
import type { OrderedMatch } from '../CareerMatchesCard';

const makeMatch = (id: string, title: string, percentage: number): OrderedMatch => ({
  match: { id, title, matchPercentage: percentage } as CareerMatch,
  percentage,
});

const testMatches: OrderedMatch[] = [
  makeMatch('analyst', 'Data Analyst', 90),
  makeMatch('manager', 'Business Manager', 75),
];

const selectedCareer = testMatches[0].match;

const renderCard = (props: Partial<React.ComponentProps<typeof CareerMatchesCard>> = {}) => render(
  <IntlProvider locale="en">
    <CareerMatchesCard
      orderedMatches={testMatches}
      selectedCareer={selectedCareer}
      onSelectCareer={jest.fn()}
      onBeginEditing={jest.fn()}
      {...props}
    />
  </IntlProvider>,
);

describe('CareerMatchesCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders career match buttons with titles and percentages', () => {
    renderCard();
    const analystBtn = screen.getByTestId('career-match-analyst');
    expect(within(analystBtn).getByText('Data Analyst')).toBeInTheDocument();
    expect(within(analystBtn).getByText('90% match')).toBeInTheDocument();
  });

  it('exposes each career match as a listitem within the list container', () => {
    renderCard();
    expect(screen.getByRole('list', { name: 'Career Matches' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(testMatches.length);
  });

  it('marks the selected career as aria-pressed', () => {
    renderCard({ selectedCareer });
    expect(screen.getByTestId('career-match-analyst')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('career-match-manager')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelectCareer with the career id when a match is clicked', async () => {
    const user = userEvent.setup();
    const onSelectCareer = jest.fn();
    renderCard({ onSelectCareer });
    await user.click(screen.getByTestId('career-match-manager'));
    expect(onSelectCareer).toHaveBeenCalledWith('manager');
  });

  it('disables all match buttons when isBuildingPathway', () => {
    renderCard({ isBuildingPathway: true });
    testMatches.forEach(({ match }) => {
      expect(screen.getByTestId(`career-match-${match.id}`)).toBeDisabled();
    });
  });

  it('shows loading spinner while career matches are loading', () => {
    renderCard({ isCareerMatchesLoading: true, orderedMatches: [] });
    expect(screen.getByTestId('career-matches-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('career-match-analyst')).not.toBeInTheDocument();
  });

  it('shows error alert when careerMatchesError is set', () => {
    renderCard({ careerMatchesError: 'Failed to load matches.' });
    expect(screen.getByText('Failed to load matches.')).toBeInTheDocument();
  });

  it('shows empty state when there are no ordered matches', () => {
    renderCard({ orderedMatches: [], selectedCareer: null });
    expect(screen.getByTestId('career-matches-empty-state')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit goal summary' })).toBeInTheDocument();
  });

  it('calls onBeginEditing from the empty state edit button', async () => {
    const user = userEvent.setup();
    const onBeginEditing = jest.fn();
    renderCard({ orderedMatches: [], selectedCareer: null, onBeginEditing });
    await user.click(screen.getByRole('button', { name: 'Edit goal summary' }));
    expect(onBeginEditing).toHaveBeenCalledTimes(1);
  });

  it('renders a match without a percentage badge when percentage is null', () => {
    const matchWithoutPercent: OrderedMatch = {
      match: { id: 'no-pct', title: 'Unknown Role' },
      percentage: null,
    };
    renderCard({ orderedMatches: [matchWithoutPercent], selectedCareer: null });
    expect(screen.getByTestId('career-match-no-pct')).toBeInTheDocument();
    expect(screen.queryByText(/match/)).not.toBeInTheDocument();
  });
});
