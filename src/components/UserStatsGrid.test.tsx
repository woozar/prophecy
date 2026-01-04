import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UserStatsGrid } from './UserStatsGrid';

describe('UserStatsGrid', () => {
  it('renders all three stat cards', () => {
    render(<UserStatsGrid prophecyCount={5} ratingCount={10} badgeCount={3} />);

    expect(screen.getByText('Prophezeiungen')).toBeInTheDocument();
    expect(screen.getByText('Bewertungen')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
  });

  it('displays correct prophecy count', () => {
    render(<UserStatsGrid prophecyCount={42} ratingCount={0} badgeCount={0} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays correct rating count', () => {
    render(<UserStatsGrid prophecyCount={0} ratingCount={99} badgeCount={0} />);

    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('displays correct badge count', () => {
    render(<UserStatsGrid prophecyCount={0} ratingCount={0} badgeCount={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('displays all values correctly', () => {
    render(<UserStatsGrid prophecyCount={15} ratingCount={25} badgeCount={5} />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <UserStatsGrid prophecyCount={0} ratingCount={0} badgeCount={0} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles zero values', () => {
    render(<UserStatsGrid prophecyCount={0} ratingCount={0} badgeCount={0} />);

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(3);
  });

  it('renders icon containers with correct color classes', () => {
    const { container } = render(
      <UserStatsGrid prophecyCount={1} ratingCount={2} badgeCount={3} />
    );

    // Check for color class indicators
    expect(container.querySelector('.bg-cyan-500\\/10')).toBeInTheDocument();
    expect(container.querySelector('.bg-violet-500\\/10')).toBeInTheDocument();
    expect(container.querySelector('.bg-amber-500\\/10')).toBeInTheDocument();
  });
});
