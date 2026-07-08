import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import CareerMatchesBody from '../CareerMatchesBody';
import type { OrderedMatch } from '../CareerMatchesBody';
import type { CareerMatch } from '../../state';

const mockMatch1: CareerMatch = {
  id: 'software-engineer',
  title: 'Software Engineer',
  matchPercentage: 90,
};
const mockMatch2: CareerMatch = {
  id: 'product-manager',
  title: 'Product Manager',
  matchPercentage: 80,
};

const orderedMatches: OrderedMatch[] = [
  { match: mockMatch1, percentage: 90 },
  { match: mockMatch2, percentage: 80 },
];

const defaultProps = {
  orderedMatches: [],
  selectedCareer: null,
  isBuildingPathway: false,
  isCareerMatchesLoading: false,
  onSelectCareer: jest.fn(),
  onBeginEditing: jest.fn(),
};

const renderComponent = (overrides = {}) => render(
  <IntlProvider locale="en">
    <CareerMatchesBody {...defaultProps} {...overrides} />
  </IntlProvider>,
);

describe('CareerMatchesBody', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('loading state', () => {
    it('renders spinner when isCareerMatchesLoading is true', () => {
      renderComponent({ isCareerMatchesLoading: true });
      expect(screen.getByTestId('career-matches-loading')).toBeInTheDocument();
    });

    it('does not render empty state or match list while loading', () => {
      renderComponent({ isCareerMatchesLoading: true });
      expect(screen.queryByTestId('career-matches-empty-state')).not.toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when orderedMatches is empty and not loading', () => {
      renderComponent({ orderedMatches: [] });
      expect(screen.getByTestId('career-matches-empty-state')).toBeInTheDocument();
    });

    it('renders "No strong career matches yet" heading in empty state', () => {
      renderComponent({ orderedMatches: [] });
      expect(screen.getByText('No strong career matches yet')).toBeInTheDocument();
    });

    it('calls onBeginEditing when the edit goal summary button is clicked', async () => {
      const user = userEvent.setup();
      const onBeginEditing = jest.fn();
      renderComponent({ orderedMatches: [], onBeginEditing });
      await user.click(screen.getByRole('button', { name: 'Edit goal summary' }));
      expect(onBeginEditing).toHaveBeenCalledTimes(1);
    });
  });

  describe('loaded state', () => {
    it('renders match buttons when orderedMatches is non-empty', () => {
      renderComponent({ orderedMatches });
      expect(screen.getByTestId('career-match-software-engineer')).toBeInTheDocument();
      expect(screen.getByTestId('career-match-product-manager')).toBeInTheDocument();
    });

    it('renders a list container with role="list"', () => {
      renderComponent({ orderedMatches });
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('calls onSelectCareer with the career id when a match button is clicked', async () => {
      const user = userEvent.setup();
      const onSelectCareer = jest.fn();
      renderComponent({ orderedMatches, onSelectCareer });
      await user.click(screen.getByTestId('career-match-software-engineer'));
      expect(onSelectCareer).toHaveBeenCalledWith('software-engineer');
    });

    it('shows the selected career with primary variant and aria-pressed=true', () => {
      renderComponent({ orderedMatches, selectedCareer: mockMatch1 });
      const selectedBtn = screen.getByTestId('career-match-software-engineer');
      expect(selectedBtn).toHaveAttribute('aria-pressed', 'true');
      // Unselected match should have aria-pressed=false
      expect(screen.getByTestId('career-match-product-manager')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('disables all match buttons when isBuildingPathway is true', () => {
      renderComponent({ orderedMatches, isBuildingPathway: true });
      expect(screen.getByTestId('career-match-software-engineer')).toBeDisabled();
      expect(screen.getByTestId('career-match-product-manager')).toBeDisabled();
    });

    it('renders the match percentage badge when percentage is not null', () => {
      renderComponent({ orderedMatches });
      expect(screen.getByText('90% match')).toBeInTheDocument();
      expect(screen.getByText('80% match')).toBeInTheDocument();
    });

    it('does not render a badge when percentage is null', () => {
      const matchesWithNullPercentage: OrderedMatch[] = [
        { match: mockMatch1, percentage: null },
      ];
      renderComponent({ orderedMatches: matchesWithNullPercentage });
      expect(screen.queryByText('% match')).not.toBeInTheDocument();
    });
  });
});
