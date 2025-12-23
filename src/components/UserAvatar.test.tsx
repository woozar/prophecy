import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('renders initials from username', () => {
    render(<UserAvatar username="testuser" />);
    expect(screen.getByText('TE')).toBeInTheDocument();
  });

  it('uses displayName for initials when provided', () => {
    render(<UserAvatar username="jdoe" displayName="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('handles single word names', () => {
    render(<UserAvatar username="admin" />);
    expect(screen.getByText('AD')).toBeInTheDocument();
  });

  it('handles multi-word display names', () => {
    render(<UserAvatar username="user" displayName="John Michael Doe" />);
    // Should use first and last name initials
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows name in title attribute', () => {
    render(<UserAvatar username="testuser" displayName="Test User" />);
    expect(screen.getByTitle('Test User')).toBeInTheDocument();
  });

  it('applies sm size class', () => {
    const { container } = render(<UserAvatar username="test" size="sm" />);
    expect(container.firstChild).toHaveClass('w-8', 'h-8');
  });

  it('applies md size class by default', () => {
    const { container } = render(<UserAvatar username="test" />);
    expect(container.firstChild).toHaveClass('w-10', 'h-10');
  });

  it('applies lg size class', () => {
    const { container } = render(<UserAvatar username="test" size="lg" />);
    expect(container.firstChild).toHaveClass('w-12', 'h-12');
  });

  it('generates consistent color for same username', () => {
    const { container: container1 } = render(<UserAvatar username="consistent" />);
    const { container: container2 } = render(<UserAvatar username="consistent" />);

    // Both should have the same color classes
    const el1 = container1.firstChild as HTMLElement;
    const el2 = container2.firstChild as HTMLElement;
    expect(el1.className).toBe(el2.className);
  });

  it('applies custom className', () => {
    const { container } = render(<UserAvatar username="test" className="ml-2" />);
    expect(container.firstChild).toHaveClass('ml-2');
  });

  it('handles null displayName', () => {
    render(<UserAvatar username="fallback" displayName={null} />);
    expect(screen.getByText('FA')).toBeInTheDocument();
  });
});
