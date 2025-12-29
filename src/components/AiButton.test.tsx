import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { AiButton } from './AiButton';

// Mock the useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('AiButton', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('renders children correctly', () => {
    render(<AiButton>Click me</AiButton>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<AiButton onClick={handleClick}>Click</AiButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = vi.fn();
    render(
      <AiButton disabled onClick={handleClick}>
        Disabled
      </AiButton>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies disabled styling classes', () => {
    render(<AiButton disabled>Disabled</AiButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('disabled:opacity-50');
  });

  it('merges custom className', () => {
    render(<AiButton className="custom-class">Button</AiButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });

  it('has animated border when reduced motion is not preferred', () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    const { container } = render(<AiButton>Animated</AiButton>);
    const borderDiv = container.querySelector('.pointer-events-none');
    expect(borderDiv).toHaveStyle({ animation: 'ai-button-flow 3s linear infinite' });
  });

  it('disables animation when reduced motion is preferred', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container } = render(<AiButton>No Animation</AiButton>);
    const borderDiv = container.querySelector('.pointer-events-none');
    expect(borderDiv).toHaveStyle({ animation: 'none' });
  });

  it('applies transition classes when reduced motion is not preferred', () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    render(<AiButton>Button</AiButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('transition-all');
  });

  it('does not apply transition classes when reduced motion is preferred', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(<AiButton>Button</AiButton>);
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('transition-all');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <AiButton type="submit" data-testid="ai-btn">
        Submit
      </AiButton>
    );
    const button = screen.getByTestId('ai-btn');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('has correct base background color', () => {
    render(<AiButton>Button</AiButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({ background: '#102a43' });
  });
});
