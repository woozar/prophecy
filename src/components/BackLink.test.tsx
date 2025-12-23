import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BackLink } from './BackLink';

describe('BackLink', () => {
  it('renders with default text', () => {
    render(<BackLink href="/home" />);
    expect(screen.getByText('Zurück')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<BackLink href="/home">Go Back</BackLink>);
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('renders as a link with correct href', () => {
    render(<BackLink href="/dashboard" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('renders with arrow icon', () => {
    render(<BackLink href="/home" />);
    // The icon is rendered inside the link
    const link = screen.getByRole('link');
    expect(link.querySelector('svg')).toBeInTheDocument();
  });

  it('has proper styling classes', () => {
    render(<BackLink href="/home" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('inline-flex', 'items-center', 'gap-2');
  });
});
