import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { PathwayList } from '../PathwayList';
import { LearningPathway } from '../../../types';
import { COURSE_STATUSES } from '../../../constants';

const customRender = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en">
      {ui}
    </IntlProvider>
  );
};

describe('PathwayList', () => {
  const mockPathway: LearningPathway = {
    id: 'pathway-1',
    title: 'Test Pathway',
    courses: [
      {
        id: 'c1',
        title: 'Course 1',
        status: COURSE_STATUSES.COMPLETED,
        level: 'Beginner',
        reasoning: 'R1',
        order: 1,
        skills: [],
      },
      {
        id: 'c2',
        title: 'Course 2',
        status: COURSE_STATUSES.IN_PROGRESS,
        level: 'Intermediate',
        reasoning: 'R2',
        order: 2,
        skills: [],
      },
      {
        id: 'c3',
        title: 'Course 3',
        status: COURSE_STATUSES.NOT_STARTED,
        level: 'Advanced',
        reasoning: 'R3',
        order: 3,
        skills: [],
      },
    ],
  };

  const mockOnAdjustPathway = jest.fn();

  it('renders correctly and calculates stats', () => {
    customRender(<PathwayList pathway={mockPathway} onAdjustPathway={mockOnAdjustPathway} />);

    expect(screen.getByText('Your Personalized Learning Pathway')).toBeInTheDocument();

    // Check Stats
    expect(screen.getAllByText('1')).toHaveLength(3); // Completed, In Progress, Upcoming
    expect(screen.getByText('3')).toBeInTheDocument(); // Total

    // Check Courses
    expect(screen.getByText('Course 1')).toBeInTheDocument();
    expect(screen.getByText('Course 2')).toBeInTheDocument();
    expect(screen.getByText('Course 3')).toBeInTheDocument();
  });

  it('handles "Adjust My Pathway" click', () => {
    customRender(<PathwayList pathway={mockPathway} onAdjustPathway={mockOnAdjustPathway} />);
    fireEvent.click(screen.getByText('Adjust My Pathway'));
    expect(mockOnAdjustPathway).toHaveBeenCalled();
  });

  it('opens detail modal when "View Details" is clicked', () => {
    customRender(<PathwayList pathway={mockPathway} />);
    const viewDetailsBtns = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsBtns[0]);

    // PathwayDetail is a Modal, it should show Course 1 title
    expect(screen.getAllByText('Course 1')).toHaveLength(2); // One in table, one in modal header
  });

  it('shows empty state when no courses match filters', () => {
    customRender(<PathwayList pathway={mockPathway} />);

    // Apply a filter that matches nothing
    const searchInput = screen.getByPlaceholderText(/Filter by title/i);
    fireEvent.change(searchInput, { target: { value: 'non-existent' } });

    expect(screen.getByText('No courses match your selected filters.')).toBeInTheDocument();

    // Clear filters
    fireEvent.click(screen.getByText('Clear all filters'));
    expect(screen.getByText('Course 1')).toBeInTheDocument();
  });

  it('handles invalid status for badge variant (coverage)', () => {
    const pathwayWithInvalidStatus = {
      ...mockPathway,
      courses: [{ ...mockPathway.courses[0], status: 'invalid' as any }]
    };
    customRender(<PathwayList pathway={pathwayWithInvalidStatus} />);
    // Should not crash and use default 'light' variant
    expect(screen.getByText('invalid')).toBeInTheDocument();
  });
});
