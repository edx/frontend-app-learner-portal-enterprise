import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakeQuestionsContainer from '../IntakeQuestionsContainer';
import messages from '../messages';
import { usePathwaysStore } from '../../state';

interface MockIntakeQuestionsContainerProps {
  onSubmit?: jest.Mock;
  onSkip?: () => void;
}

const MockIntakeQuestionsContainer = ({
  onSubmit = jest.fn(),
  onSkip,
}: MockIntakeQuestionsContainerProps) => (
  <IntlProvider locale="en">
    <IntakeQuestionsContainer
      onSubmit={onSubmit}
      onSkip={onSkip}
    />
  </IntlProvider>
);

describe('IntakeQuestionsContainer', () => {
  beforeEach(() => {
    usePathwaysStore.getState().resetPathwaysState();
  });

  it('renders translated question section titles', () => {
    render(<MockIntakeQuestionsContainer />);

    expect(screen.getByRole('heading', { name: messages.goalsSectionTitle.defaultMessage })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: messages.backgroundSectionTitle.defaultMessage })).toBeInTheDocument();
  });

  it('calls onSkip when skip action is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = jest.fn();

    render(<MockIntakeQuestionsContainer onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: messages.skipToDashboard.defaultMessage }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
