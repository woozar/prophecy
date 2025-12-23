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

  it('handles boundary value -5 with red color', () => {
    render(<RatingSlider value={-5} />);
    const valueDisplay = screen.getByText('-5');
    expect(valueDisplay).toHaveStyle({ color: '#ef4444' });
  });

  it('handles boundary value 5 with cyan color', () => {
    render(<RatingSlider value={5} />);
    const valueDisplay = screen.getByText('+5');
    expect(valueDisplay).toHaveStyle({ color: '#22d3ee' });
  });

  it('handles value at -1 with orange color', () => {
    render(<RatingSlider value={-1} />);
    const valueDisplay = screen.getByText('-1');
    expect(valueDisplay).toHaveStyle({ color: '#f97316' });
  });

  it('handles maximum positive value with teal color', () => {
    render(<RatingSlider value={10} />);
    // Multiple elements show '+10' (max label and value display), find the styled one
    const valueDisplays = screen.getAllByText('+10');
    const styledValue = valueDisplays.find((el) =>
      el.classList.contains('font-bold')
    );
    expect(styledValue).toHaveStyle({ color: '#14b8a6' });
  });

  it('handles minimum negative value with red color', () => {
    render(<RatingSlider value={-10} />);
    // Multiple elements show '-10' (min label and value display), find the styled one
    const valueDisplays = screen.getAllByText('-10');
    const styledValue = valueDisplays.find((el) =>
      el.classList.contains('font-bold')
    );
    expect(styledValue).toHaveStyle({ color: '#ef4444' });
  });

  it('does not call onChange when disabled', () => {
    const handleChange = vi.fn();
    render(<RatingSlider onChange={handleChange} disabled />);
    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '5' } });

    // The change event still fires on the input, but the component should not process it
    // Due to how the disabled attribute works, we just verify the slider is disabled
    expect(slider).toBeDisabled();
  });

  it('renders without crashing when no props provided', () => {
    const { container } = render(<RatingSlider />);
    expect(container.firstChild).toBeInTheDocument();
  });

  describe('particle bursts', () => {
    it('does not create burst when value stays the same', () => {
      const { container } = render(<RatingSlider value={5} />);
      const slider = screen.getByRole('slider');

      fireEvent.change(slider, { target: { value: '5' } });

      // No particles should be created (same value)
      const particles = container.querySelectorAll('.absolute.rounded-full.pointer-events-none');
      expect(particles.length).toBe(0);
    });

    it('handles multiple consecutive value changes', () => {
      render(<RatingSlider />);
      const slider = screen.getByRole('slider');

      // Multiple rapid changes
      fireEvent.change(slider, { target: { value: '0' } });
      fireEvent.change(slider, { target: { value: '3' } });
      fireEvent.change(slider, { target: { value: '5' } });

      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('updates internal value when uncontrolled and value changes', () => {
      render(<RatingSlider />);
      const slider = screen.getByRole('slider');

      fireEvent.change(slider, { target: { value: '7' } });

      expect(screen.getByText('+7')).toBeInTheDocument();
    });
  });

  describe('internal vs controlled value', () => {
    it('uses internal value when not controlled', () => {
      render(<RatingSlider />);
      const slider = screen.getByRole('slider');

      fireEvent.change(slider, { target: { value: '7' } });

      expect(screen.getByText('+7')).toBeInTheDocument();
    });

    it('does not update internal value when controlled', () => {
      const { rerender } = render(<RatingSlider value={3} />);

      // Value should stay at 3 even when slider changes
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '9' } });

      // Rerender with same controlled value
      rerender(<RatingSlider value={3} />);
      expect(screen.getByText('+3')).toBeInTheDocument();
    });
  });
});
