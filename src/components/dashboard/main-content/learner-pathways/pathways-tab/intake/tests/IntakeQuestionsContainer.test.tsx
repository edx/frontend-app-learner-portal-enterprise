import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakeQuestionsContainer from '../IntakeQuestionsContainer';
import messages from '../messages';

interface MockIntakeQuestionsContainerProps {
  onSubmit?: jest.Mock;
  goalsQuestions?: React.ReactNode;
  backgroundQuestions?: React.ReactNode;
}

const MockIntakeQuestionsContainer = ({
  onSubmit = jest.fn(),
  goalsQuestions,
  backgroundQuestions,
}: MockIntakeQuestionsContainerProps) => (
  <IntlProvider locale="en">
    <IntakeQuestionsContainer
      onSubmit={onSubmit}
      goalsQuestions={goalsQuestions}
      backgroundQuestions={backgroundQuestions}
    />
  </IntlProvider>
);

describe('IntakeQuestionsContainer', () => {
  it('renders translated question section titles', () => {
    render(<MockIntakeQuestionsContainer />);

    expect(screen.getByRole('heading', { name: messages.goalsSectionTitle.defaultMessage })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: messages.backgroundSectionTitle.defaultMessage })).toBeInTheDocument();
  });

  it('renders slot content for goals and background questions', () => {
    render(
      <MockIntakeQuestionsContainer
        goalsQuestions={<div data-testid="goals-slot" />}
        backgroundQuestions={<div data-testid="background-slot" />}
      />,
    );

    expect(screen.getByTestId('goals-slot')).toBeInTheDocument();
    expect(screen.getByTestId('background-slot')).toBeInTheDocument();
  });

  it('submits RHF default values', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MockIntakeQuestionsContainer onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: messages.submitAndReviewProfile.defaultMessage }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      motivation: '',
      goal: '',
      background: '',
      industry: '',
    });
  });
});
