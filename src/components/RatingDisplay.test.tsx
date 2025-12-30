import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RatingDisplay } from './RatingDisplay';

describe('RatingDisplay', () => {
  it('renders value and scale labels', () => {
    render(<RatingDisplay value={5} />);
    expect(screen.getByText('+5.0')).toBeInTheDocument();
    expect(screen.getByText('Sicher')).toBeInTheDocument();
    expect(screen.getByText('Unmöglich')).toBeInTheDocument();
  });

  it('displays positive value with plus sign and one decimal', () => {
    render(<RatingDisplay value={5} />);
    expect(screen.getByText('+5.0')).toBeInTheDocument();
  });

  it('displays negative value without plus sign', () => {
    render(<RatingDisplay value={-3.5} />);
    expect(screen.getByText('-3.5')).toBeInTheDocument();
  });

  it('displays zero without plus sign', () => {
    render(<RatingDisplay value={0} />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('shows cyan color for positive values', () => {
    render(<RatingDisplay value={5} />);
    const valueDisplay = screen.getByText('+5.0');
    expect(valueDisplay).toHaveStyle({ color: '#22d3ee' });
  });

  it('shows cyan color for zero value', () => {
    render(<RatingDisplay value={0} />);
    const valueDisplay = screen.getByText('0.0');
    expect(valueDisplay).toHaveStyle({ color: '#22d3ee' });
  });

  it('shows purple color for negative values', () => {
    render(<RatingDisplay value={-5} />);
    const valueDisplay = screen.getByText('-5.0');
    expect(valueDisplay).toHaveStyle({ color: '#a855f7' });
  });

  it('shows scale labels', () => {
    render(<RatingDisplay value={0} />);
    expect(screen.getByText('Sicher')).toBeInTheDocument();
    expect(screen.getByText('Unmöglich')).toBeInTheDocument();
  });

  describe('label display', () => {
    it('shows no label when neither label nor ratingCount provided', () => {
      render(<RatingDisplay value={5} />);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('shows just label when only label provided', () => {
      render(<RatingDisplay value={5} label="Test Label" />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('shows "Durchschnitt" with singular when ratingCount is 1', () => {
      render(<RatingDisplay value={5} ratingCount={1} />);
      expect(screen.getByText('Durchschnitt (1 Bewertung)')).toBeInTheDocument();
    });

    it('shows "Durchschnitt" with plural when ratingCount > 1', () => {
      render(<RatingDisplay value={5} ratingCount={5} />);
      expect(screen.getByText('Durchschnitt (5 Bewertungen)')).toBeInTheDocument();
    });

    it('shows label with ratingCount when both provided', () => {
      render(<RatingDisplay value={5} label="Custom" ratingCount={3} />);
      expect(screen.getByText('Custom (3 Bewertungen)')).toBeInTheDocument();
    });

    it('shows label with singular ratingCount when both provided', () => {
      render(<RatingDisplay value={5} label="Custom" ratingCount={1} />);
      expect(screen.getByText('Custom (1 Bewertung)')).toBeInTheDocument();
    });
  });

  it('formats decimal values correctly', () => {
    render(<RatingDisplay value={3.75} />);
    expect(screen.getByText('+3.8')).toBeInTheDocument();
  });
});
