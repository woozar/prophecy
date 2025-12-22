import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default padding class p-6', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-6');
  });

  it('applies custom padding class when specified', () => {
    render(<Card padding="p-8" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-8');
  });

  it('applies card-dark base class', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('card-dark');
  });

  it('applies col-span-2 class when colSpan is 2', () => {
    render(<Card colSpan={2} data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('md:col-span-2');
  });

  it('does not apply col-span class when colSpan is 1', () => {
    render(<Card colSpan={1} data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).not.toHaveClass('md:col-span-2');
  });

  it('merges custom className', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('card-dark');
  });

  it('passes through additional HTML attributes', () => {
    render(<Card data-testid="card" id="my-card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('id', 'my-card');
  });
});

describe('Card.Title', () => {
  it('renders title text correctly', () => {
    render(<Card.Title>My Title</Card.Title>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('My Title');
  });

  it('applies text-highlight class', () => {
    render(<Card.Title>My Title</Card.Title>);
    const title = screen.getByRole('heading');
    expect(title).toHaveClass('text-highlight');
  });
});
