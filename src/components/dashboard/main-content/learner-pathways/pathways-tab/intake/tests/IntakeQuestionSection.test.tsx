import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakeQuestionSection from '../IntakeQuestionSection';

interface MockIntakeQuestionSectionProps {
  children?: React.ReactNode;
}

const MockIntakeQuestionSection = ({ children }: MockIntakeQuestionSectionProps) => (
  <IntlProvider locale="en">
    <IntakeQuestionSection title="Section Title" emptyPlaceholderTestId="empty-placeholder">
      {children}
    </IntakeQuestionSection>
  </IntlProvider>
);

describe('IntakeQuestionSection', () => {
  it('renders placeholder when no slot content is provided', () => {
    render(<MockIntakeQuestionSection />);

    expect(screen.getByRole('heading', { name: 'Section Title' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-placeholder')).toBeInTheDocument();
  });

  it('renders children when slot content is provided', () => {
    render(
      <MockIntakeQuestionSection>
        <div data-testid="section-slot-content" />
      </MockIntakeQuestionSection>,
    );

    expect(screen.getByTestId('section-slot-content')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-placeholder')).not.toBeInTheDocument();
  });
});
