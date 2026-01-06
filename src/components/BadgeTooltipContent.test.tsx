import { BadgeRarity } from '@prisma/client';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BadgeTooltipContent } from './BadgeTooltipContent';

describe('BadgeTooltipContent', () => {
  const defaultProps = {
    badgeKey: 'test_badge',
    name: 'Test Badge',
    description: 'A test badge description',
    requirement: 'Complete a test',
    rarity: BadgeRarity.BRONZE,
  };

  it('renders badge icon and name', () => {
    const { container } = render(<BadgeTooltipContent {...defaultProps} />);

    // BadgeIcon renders an img element
    expect(container.querySelector('img')).toBeInTheDocument();
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('renders description and requirement', () => {
    render(<BadgeTooltipContent {...defaultProps} />);

    expect(screen.getByText('A test badge description')).toBeInTheDocument();
    expect(screen.getByText('Complete a test')).toBeInTheDocument();
  });

  it('shows bronze rarity icon', () => {
    render(<BadgeTooltipContent {...defaultProps} rarity={BadgeRarity.BRONZE} />);

    expect(screen.getByTitle('Bronze')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('shows silver rarity icon', () => {
    render(<BadgeTooltipContent {...defaultProps} rarity={BadgeRarity.SILVER} />);

    expect(screen.getByTitle('Silber')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
  });

  it('shows gold rarity icon', () => {
    render(<BadgeTooltipContent {...defaultProps} rarity={BadgeRarity.GOLD} />);

    expect(screen.getByTitle('Gold')).toBeInTheDocument();
    expect(screen.getByText('🥇')).toBeInTheDocument();
  });

  it('shows legendary rarity icon', () => {
    render(<BadgeTooltipContent {...defaultProps} rarity={BadgeRarity.LEGENDARY} />);

    expect(screen.getByTitle('Legendär')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
  });

  it('shows formatted earned date when provided', () => {
    render(<BadgeTooltipContent {...defaultProps} earnedAt="2025-06-15T12:00:00.000Z" />);

    expect(screen.getByText(/Erreicht am/)).toBeInTheDocument();
    expect(screen.getByText(/15. Juni 2025/)).toBeInTheDocument();
  });

  it('does not show earned date section when not provided', () => {
    render(<BadgeTooltipContent {...defaultProps} />);

    expect(screen.queryByText(/Erreicht am/)).not.toBeInTheDocument();
  });

  it('has correct min and max width constraints', () => {
    const { container } = render(<BadgeTooltipContent {...defaultProps} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('min-w-[220px]');
    expect(wrapper).toHaveClass('max-w-[280px]');
  });
});
