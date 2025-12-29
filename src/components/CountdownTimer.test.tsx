import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from './CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays days and hours for deadlines more than 24h away', () => {
    const deadline = new Date('2025-01-04T18:00:00'); // 3 days 6 hours away
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 3 Tage 6h/)).toBeInTheDocument();
  });

  it('displays hours and minutes for deadlines less than 24h away', () => {
    const deadline = new Date('2025-01-01T20:30:00'); // 8 hours 30 minutes away
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 8h 30min/)).toBeInTheDocument();
  });

  it('displays minutes and seconds for deadlines less than 1h away', () => {
    const deadline = new Date('2025-01-01T12:45:30'); // 45 minutes 30 seconds away
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 45min 30s/)).toBeInTheDocument();
  });

  it('displays "abgelaufen" for past deadlines', () => {
    const deadline = new Date('2025-01-01T11:00:00'); // 1 hour ago
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/abgelaufen/)).toBeInTheDocument();
  });

  it('applies red color class for deadlines less than 1h away', () => {
    const deadline = new Date('2025-01-01T12:30:00'); // 30 minutes away
    render(<CountdownTimer deadline={deadline} />);

    const element = screen.getByText(/noch/);
    expect(element.className).toContain('text-red-400');
  });

  it('applies yellow color class for deadlines less than 24h away', () => {
    const deadline = new Date('2025-01-01T20:00:00'); // 8 hours away
    render(<CountdownTimer deadline={deadline} />);

    const element = screen.getByText(/noch/);
    expect(element.className).toContain('text-yellow-400');
  });

  it('applies muted color class for deadlines more than 24h away', () => {
    const deadline = new Date('2025-01-03T12:00:00'); // 2 days away
    render(<CountdownTimer deadline={deadline} />);

    const element = screen.getByText(/noch/);
    expect(element.className).toContain('text-(--text-muted)');
  });

  it('updates every second when less than 1h remaining', () => {
    const deadline = new Date('2025-01-01T12:01:00'); // 1 minute away
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 1min/)).toBeInTheDocument();

    // Advance 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText(/noch 30s/)).toBeInTheDocument();
  });

  it('updates every minute when more than 1h remaining', () => {
    const deadline = new Date('2025-01-01T15:00:00'); // 3 hours away
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 3h/)).toBeInTheDocument();

    // Advance 1 minute - should update
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText(/noch 2h 59min/)).toBeInTheDocument();
  });

  it('accepts Date objects', () => {
    const deadline = new Date('2025-01-02T12:00:00');
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 1 Tag 0h/)).toBeInTheDocument();
  });

  it('accepts date strings', () => {
    render(<CountdownTimer deadline="2025-01-02T12:00:00" />);

    expect(screen.getByText(/noch 1 Tag 0h/)).toBeInTheDocument();
  });

  it('accepts timestamps', () => {
    const deadline = new Date('2025-01-02T12:00:00').getTime();
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 1 Tag 0h/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const deadline = new Date('2025-01-02T12:00:00');
    render(<CountdownTimer deadline={deadline} className="custom-class" />);

    const element = screen.getByText(/noch/);
    expect(element).toHaveClass('custom-class');
  });

  it('uses singular "Tag" for 1 day', () => {
    const deadline = new Date('2025-01-02T15:00:00'); // 1 day 3 hours away
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 1 Tag 3h/)).toBeInTheDocument();
  });

  it('uses plural "Tage" for multiple days', () => {
    const deadline = new Date('2025-01-05T12:00:00'); // 4 days away
    render(<CountdownTimer deadline={deadline} />);

    expect(screen.getByText(/noch 4 Tage 0h/)).toBeInTheDocument();
  });
});
