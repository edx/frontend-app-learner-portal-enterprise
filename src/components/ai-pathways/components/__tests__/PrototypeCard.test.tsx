import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PrototypeCard } from '../PrototypeCard';

describe('PrototypeCard', () => {
  it('renders children correctly', () => {
    render(<PrototypeCard>Card Content</PrototypeCard>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders title and subtitle when provided', () => {
    render(<PrototypeCard title="Test Title" subtitle="Test Subtitle">Content</PrototypeCard>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<PrototypeCard footer={<div>Footer</div>}>Content</PrototypeCard>);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies custom className and handles click', () => {
    const onClick = jest.fn();
    render(<PrototypeCard className="custom-card" onClick={onClick}>Content</PrototypeCard>);

    // Paragon's Card component might render with multiple elements, but we expect the top-level
    // element to have our custom class if we passed it correctly through classNames.
    const card = screen.getByText('Content').closest('.card');
    expect(card).toHaveClass('custom-card');
    expect(card).toHaveClass('cursor-pointer');

    fireEvent.click(card!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render header if title and subtitle are missing', () => {
    render(<PrototypeCard>Content</PrototypeCard>);
    const headers = document.querySelectorAll('.card-header');
    expect(headers.length).toBe(0);
  });
});
