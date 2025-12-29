import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Link } from './Link';

// Mock createPortal to render particles inline for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('Link', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set desktop viewport by default
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children correctly', () => {
    render(<Link href="/test">Test Link</Link>);
    expect(screen.getByText('Test Link')).toBeInTheDocument();
  });

  it('renders as anchor element', () => {
    render(<Link href="/test">Link Text</Link>);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('passes through additional props', () => {
    render(
      <Link href="/test" className="custom-class" data-testid="custom-link">
        Props Test
      </Link>
    );
    const link = screen.getByTestId('custom-link');
    expect(link).toHaveClass('custom-class');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(
      <Link href="/test" onClick={handleClick}>
        Clickable
      </Link>
    );

    fireEvent.click(screen.getByRole('link'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not create particles on desktop click', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    window.dispatchEvent(new Event('resize'));

    const { container } = render(<Link href="/test">Desktop Link</Link>);

    fireEvent.click(screen.getByRole('link'), {
      clientX: 100,
      clientY: 100,
    });

    // No particles should be created on desktop
    const particles = container.querySelectorAll('.fixed.rounded-full');
    expect(particles.length).toBe(0);
  });

  it('creates particles on mobile click', () => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    const { container } = render(<Link href="/test">Mobile Link</Link>);

    // Trigger resize to update isMobile state
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    fireEvent.click(screen.getByRole('link'), {
      clientX: 150,
      clientY: 200,
    });

    // Particles should be created on mobile
    const particles = container.querySelectorAll('.fixed.rounded-full');
    expect(particles.length).toBe(8);
  });

  it('particles have correct initial properties on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    const { container } = render(<Link href="/test">Animated Link</Link>);

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    fireEvent.click(screen.getByRole('link'), {
      clientX: 100,
      clientY: 100,
    });

    // Check particles exist with correct styling
    const particles = container.querySelectorAll('.fixed.rounded-full');
    expect(particles.length).toBe(8);

    // Each particle should have opacity style
    particles.forEach((particle) => {
      expect(particle).toHaveStyle({ opacity: '1' });
    });
  });

  it('handles multiple clicks accumulating particles on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });

    const { container } = render(<Link href="/test">Multi Click</Link>);

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // First click
    fireEvent.click(screen.getByRole('link'), { clientX: 100, clientY: 100 });

    // Second click before first particles fade
    fireEvent.click(screen.getByRole('link'), { clientX: 150, clientY: 150 });

    // Should have particles from both clicks
    const particles = container.querySelectorAll('.fixed.rounded-full');
    expect(particles.length).toBe(16);
  });

  it('cleans up resize listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<Link href="/test">Cleanup Test</Link>);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('renders with target="_blank" when specified', () => {
    render(
      <Link href="https://external.com" target="_blank">
        External Link
      </Link>
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders with rel attribute when specified', () => {
    render(
      <Link href="https://external.com" rel="noopener noreferrer">
        Secure Link
      </Link>
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
