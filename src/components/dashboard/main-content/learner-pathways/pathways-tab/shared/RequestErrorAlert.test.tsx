import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';

import RequestErrorAlert from './RequestErrorAlert';

describe('RequestErrorAlert', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<RequestErrorAlert error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when error is undefined', () => {
    const { container } = render(<RequestErrorAlert />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when error is an empty string', () => {
    const { container } = render(<RequestErrorAlert error="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the error message when error is a non-empty string', () => {
    render(<RequestErrorAlert error="Something went wrong." />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });
});
