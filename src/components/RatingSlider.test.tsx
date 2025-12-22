import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RatingSlider } from './RatingSlider';

// Mock the useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from '@/hooks/useReducedMotion';

describe('RatingSlider', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('renders slider input', () => {
    render(<RatingSlider />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<RatingSlider label="Rate this" />);
    expect(screen.getByText('Rate this')).toBeInTheDocument();
  });

  it('uses default min and max values', () => {
    render(<RatingSlider />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '-10');
    expect(slider).toHaveAttribute('max', '10');
  });

  it('accepts custom min and max values', () => {
    render(<RatingSlider min={0} max={100} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
  });

  it('displays current value', () => {
    render(<RatingSlider value={5} />);
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('displays negative values without plus sign', () => {
    render(<RatingSlider value={-3} />);
    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('displays zero without plus sign', () => {
    render(<RatingSlider value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('calls onChange when slider value changes', () => {
    const handleChange = vi.fn();
    render(<RatingSlider onChange={handleChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '7' } });
    expect(handleChange).toHaveBeenCalledWith(7);
  });

  it('can be disabled', () => {
    render(<RatingSlider disabled />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });

  it('applies opacity when disabled', () => {
    const { container } = render(<RatingSlider disabled />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('opacity-50');
  });

  it('works as uncontrolled component', () => {
    render(<RatingSlider />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '3' } });
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('shows min and max labels', () => {
    render(<RatingSlider min={-10} max={10} />);
    expect(screen.getByText('-10')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('does not create particle bursts when reduced motion is preferred', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container } = render(<RatingSlider />);
    const slider = screen.getByRole('slider');

    // Change value multiple times
    fireEvent.change(slider, { target: { value: '5' } });
    fireEvent.change(slider, { target: { value: '6' } });

    // With reduced motion, no particle elements should be created
    const particles = container.querySelectorAll('.rounded-full.pointer-events-none');
    expect(particles.length).toBe(0);
  });

  describe('color changes based on value', () => {
    it('shows red color for very negative values', () => {
      render(<RatingSlider value={-7} />);
      const valueDisplay = screen.getByText('-7');
      expect(valueDisplay).toHaveStyle({ color: '#ef4444' });
    });

    it('shows orange color for slightly negative values', () => {
      render(<RatingSlider value={-3} />);
      const valueDisplay = screen.getByText('-3');
      expect(valueDisplay).toHaveStyle({ color: '#f97316' });
    });

    it('shows yellow color for zero value', () => {
      render(<RatingSlider value={0} />);
      const valueDisplay = screen.getByText('0');
      expect(valueDisplay).toHaveStyle({ color: '#eab308' });
    });

    it('shows cyan color for slightly positive values', () => {
      render(<RatingSlider value={3} />);
      const valueDisplay = screen.getByText('+3');
      expect(valueDisplay).toHaveStyle({ color: '#22d3ee' });
    });

    it('shows teal color for very positive values', () => {
      render(<RatingSlider value={8} />);
      const valueDisplay = screen.getByText('+8');
      expect(valueDisplay).toHaveStyle({ color: '#14b8a6' });
    });
  });

  it('updates controlled value when parent changes', () => {
    const { rerender } = render(<RatingSlider value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<RatingSlider value={5} />);
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('supports custom min/max labels', () => {
    render(<RatingSlider min={1} max={5} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
  });
});
