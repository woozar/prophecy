import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import packageJson from '../../package.json';
import { Footer } from './Footer';

describe('Footer', () => {
  beforeEach(() => {
    // Mock Date to return a fixed year
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders footer element', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('displays current year in copyright with link to GitHub', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2025/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Prophezeiung' });
    expect(link).toHaveAttribute('href', 'https://github.com/woozar/prophecy');
  });

  it('displays version number from package.json', () => {
    render(<Footer />);
    expect(screen.getByText(`v${packageJson.version}`)).toBeInTheDocument();
  });

  it('has fixed positioning', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('fixed', 'bottom-0');
  });

  it('has backdrop blur styling', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('backdrop-blur-xl');
  });
});
