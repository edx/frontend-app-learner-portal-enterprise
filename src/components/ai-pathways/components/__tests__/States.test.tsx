import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorState } from '../ErrorState';
import { LoadingState } from '../LoadingState';
import { StateLayout } from '../StateLayout';

describe('AI Pathways State Components', () => {
  describe('StateLayout', () => {
    it('renders children and applies custom className and minHeight', () => {
      render(
        <StateLayout className="custom-class" minHeight="500px">
          <div data-testid="child">Child</div>
        </StateLayout>
      );
      const container = screen.getByTestId('child').parentElement;
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveStyle({ minHeight: '500px' });
    });

    it('uses default minHeight if not provided', () => {
      render(<StateLayout>test</StateLayout>);
      const container = screen.getByText('test');
      expect(container).toHaveStyle({ minHeight: '200px' });
    });
  });

  describe('LoadingState', () => {
    it('renders with default message', () => {
      render(<LoadingState />);
      expect(screen.getByText('Loading...', { selector: 'p' })).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<LoadingState message="Wait a moment" />);
      expect(screen.getByText('Wait a moment', { selector: 'p' })).toBeInTheDocument();
    });

    it('passes className and minHeight to StateLayout', () => {
      render(<LoadingState className="loading-class" minHeight="300px" />);
      const container = screen.getByText('Loading...', { selector: 'p' }).parentElement;
      expect(container).toHaveClass('loading-class');
      expect(container).toHaveStyle({ minHeight: '300px' });
    });
  });

  describe('ErrorState', () => {
    it('renders with default message', () => {
      render(<ErrorState />);
      expect(screen.getByText('An unexpected error occurred. Please try again later.')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<ErrorState message="Custom error" />);
      expect(screen.getByText('Custom error')).toBeInTheDocument();
    });

    it('renders retry button and calls onRetry when clicked', () => {
      const onRetry = jest.fn();
      render(<ErrorState onRetry={onRetry} />);
      const button = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(button);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button if onRetry is not provided', () => {
      render(<ErrorState />);
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });
});
