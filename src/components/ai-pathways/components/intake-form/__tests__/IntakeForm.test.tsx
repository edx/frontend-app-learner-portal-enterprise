import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { IntakeForm } from '../IntakeForm';
import { INTAKE_STEPS } from '../../../constants';

const customRender = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en">
      {ui}
    </IntlProvider>
  );
};

describe('IntakeForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and navigates through steps', async () => {
    customRender(<IntakeForm onSubmit={mockOnSubmit} />);

    // Step 1: Goals
    expect(screen.getByText("Let's start with your goals")).toBeInTheDocument();
    expect(screen.getByLabelText(/What brings you here today\?/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/What brings you here today\?/i), {
      target: { value: 'Learn coding' }
    });

    fireEvent.change(screen.getByLabelText(/What career would you like us to help you achieve\?/i), {
      target: { value: 'Software Engineer' }
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: Background
    expect(screen.getByText('Tell us about your background')).toBeInTheDocument();
    expect(screen.getByLabelText(/What's your current background or role\?/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/What's your current background or role\?/i), {
      target: { value: 'Manager' }
    });

    fireEvent.change(screen.getByLabelText(/Which industry or field are you most interested in\?/i), {
      target: { value: 'Tech' }
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: Preferences
    expect(screen.getByText('How you like to learn')).toBeInTheDocument();
    expect(screen.getByText('How do you prefer to learn?')).toBeInTheDocument();

    // Select a radio option
    const asyncRadio = screen.getByLabelText(/Async only/i);
    fireEvent.click(asyncRadio);

    // Select from dropdowns
    fireEvent.change(screen.getByLabelText(/How much time can you dedicate/i), {
      target: { value: '4-6 hours per week' }
    });

    fireEvent.change(screen.getByLabelText(/Are you interested in a certificate/i), {
      target: { value: 'Yes, definitely' }
    });

    // Select different options for coverage
    fireEvent.click(screen.getByLabelText(/Async \+ live sessions/i));
    fireEvent.change(screen.getByLabelText(/How much time can you dedicate/i), {
      target: { value: '7 or more hours per week' }
    });

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    });

    expect(mockOnSubmit).toHaveBeenCalled();

    // Step 4: Processing
    expect(screen.getByText(/Analyzing your goals/i)).toBeInTheDocument();
  });

  it('can navigate back', () => {
    customRender(<IntakeForm onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Tell us about your background')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText("Let's start with your goals")).toBeInTheDocument();
  });

  it('disables buttons when isSubmitting is true', () => {
    customRender(<IntakeForm onSubmit={mockOnSubmit} isSubmitting={true} />);

    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
  });
});
