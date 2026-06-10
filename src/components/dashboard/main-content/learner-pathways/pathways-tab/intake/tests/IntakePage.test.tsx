import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import IntakePage from '../IntakePage';
import messages from '../messages';

const MockIntakePage = ({ onSubmit = jest.fn() }: { onSubmit?: () => void; }) => (
  <IntlProvider locale="en">
    <IntakePage onSubmit={onSubmit} />
  </IntlProvider>
);

describe('IntakePage', () => {
  it('renders page shell with header and intake form', () => {
    render(<MockIntakePage />);

    expect(screen.getByTestId('intake-page')).toBeInTheDocument();
    expect(screen.getByTestId('intake-header')).toBeInTheDocument();
    expect(screen.getByTestId('intake-form')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: messages.heading.defaultMessage })).toBeInTheDocument();
  });
});
