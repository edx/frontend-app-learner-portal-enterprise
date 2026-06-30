import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';

import GoalSummaryErrorAlert from '../GoalSummaryErrorAlert';

describe('GoalSummaryErrorAlert', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<GoalSummaryErrorAlert error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when error is undefined', () => {
    const { container } = render(<GoalSummaryErrorAlert />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when error is an empty string', () => {
    const { container } = render(<GoalSummaryErrorAlert error="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the error message when error is a non-empty string', () => {
    render(<GoalSummaryErrorAlert error="Something went wrong." />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });
});
