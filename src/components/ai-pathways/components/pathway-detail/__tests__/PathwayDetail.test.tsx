import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { PathwayDetail } from '../PathwayDetail';
import { PathwayCourse } from '../../../types';

const customRender = (ui: React.ReactElement) => render(
  <IntlProvider locale="en">
    {ui}
  </IntlProvider>,
);

describe('PathwayDetail', () => {
  const mockCourse: PathwayCourse = {
    id: '1',
    title: 'React Course',
    level: 'Advanced',
    skills: ['Hooks', 'Context'],
    reasoning: 'AI reasoning text',
    status: 'not_started',
    order: 1,
  };

  const mockOnClose = jest.fn();
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing if course is null', () => {
    const { container } = customRender(
      <PathwayDetail course={null} isOpen onClose={mockOnClose} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly with not_started status', () => {
    customRender(
      <PathwayDetail
        course={mockCourse}
        isOpen
        onClose={mockOnClose}
        onAction={mockOnAction}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'React Course' })).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('AI reasoning text')).toBeInTheDocument();
    expect(screen.getByText('Hooks')).toBeInTheDocument();
    expect(screen.getByText('Context')).toBeInTheDocument();

    const registerBtn = screen.getByRole('button', { name: /register/i });
    expect(registerBtn).toBeInTheDocument();

    fireEvent.click(registerBtn);
    expect(mockOnAction).toHaveBeenCalledWith(mockCourse);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders "View Certificate" for completed status', () => {
    customRender(
      <PathwayDetail
        course={{ ...mockCourse, status: 'completed' }}
        isOpen
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText(/View Certificate/i)).toBeInTheDocument();
  });

  it('renders "Continue Course" for in progress status', () => {
    customRender(
      <PathwayDetail
        course={{ ...mockCourse, status: 'in_progress' }}
        isOpen
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText(/Continue Course/i)).toBeInTheDocument();
  });

  it('handles empty skills list', () => {
    customRender(
      <PathwayDetail
        course={{ ...mockCourse, skills: [] }}
        isOpen
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText(/No skills listed for this course./i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    customRender(
      <PathwayDetail
        course={mockCourse}
        isOpen
        onClose={mockOnClose}
      />,
    );
    // There are two close buttons: the 'X' and the 'Close' text button.
    // Target the 'Close' text button specifically.
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
