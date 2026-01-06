import type { BadgeCategory, BadgeRarity } from '@prisma/client';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Badge } from '@/store/useBadgeStore';

import { BadgeTooltipContent } from './BadgeTooltipContent';

const createBadge = (key: string, name: string, threshold: number | null = null): Badge => ({
  id: key,
  key,
  name,
  description: `Description for ${name}`,
  requirement: `Requirement for ${name}`,
  category: 'CREATOR' as BadgeCategory,
  rarity: 'BRONZE' as BadgeRarity,
  threshold,
  createdAt: new Date().toISOString(),
});

describe('BadgeTooltipContent', () => {
  const defaultProps = {
    badgeKey: 'test_badge',
    name: 'Test Badge',
    description: 'A test badge description',
    requirement: 'Complete a test',
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

  it('shows formatted earned date when provided', () => {
    render(<BadgeTooltipContent {...defaultProps} earnedAt="2025-06-15T12:00:00.000Z" />);

    expect(screen.getByText(/Erreicht am/)).toBeInTheDocument();
    // Format: DD.MM.YYYY, HH:mm (German locale)
    expect(screen.getByText(/15\.06\.2025/)).toBeInTheDocument();
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

  describe('tier badges', () => {
    const tierBadges = [
      {
        badge: createBadge('creator_30', 'Orakel', 30),
        isEarned: true,
        earnedAt: '2025-01-05T12:00:00Z',
      },
      {
        badge: createBadge('creator_15', 'Sternendeuter', 15),
        isEarned: true,
        earnedAt: '2025-01-01T12:00:00Z',
      },
      { badge: createBadge('creator_50', 'Hohepriester', 50), isEarned: false },
    ];

    it('does not show tier section when only one badge', () => {
      render(<BadgeTooltipContent {...defaultProps} tierBadges={[tierBadges[0]]} />);

      expect(screen.queryByText('Alle Stufen:')).not.toBeInTheDocument();
    });

    it('shows tier section with exactly 2 badges', () => {
      const twoTierBadges = [
        {
          badge: createBadge('creator_5', 'Mondleser', 5),
          isEarned: true,
          earnedAt: '2025-01-05T12:00:00Z',
        },
        {
          badge: createBadge('creator_1', 'Anfänger-Seher', 1),
          isEarned: true,
          earnedAt: '2025-01-01T12:00:00Z',
        },
      ];

      render(<BadgeTooltipContent {...defaultProps} tierBadges={twoTierBadges} />);

      expect(screen.getByText('Alle Stufen:')).toBeInTheDocument();
      expect(screen.getByText('Mondleser')).toBeInTheDocument();
      expect(screen.getByText('Anfänger-Seher')).toBeInTheDocument();
    });

    it('shows tier section with multiple badges', () => {
      render(<BadgeTooltipContent {...defaultProps} tierBadges={tierBadges} />);

      expect(screen.getByText('Alle Stufen:')).toBeInTheDocument();
    });

    it('shows all tier badge names', () => {
      render(<BadgeTooltipContent {...defaultProps} tierBadges={tierBadges} />);

      expect(screen.getByText('Orakel')).toBeInTheDocument();
      expect(screen.getByText('Sternendeuter')).toBeInTheDocument();
      expect(screen.getByText('Hohepriester')).toBeInTheDocument();
    });

    it('shows checkmark for earned badges without date', () => {
      const tiersWithoutDates = [
        { badge: createBadge('creator_30', 'Orakel', 30), isEarned: true },
        { badge: createBadge('creator_15', 'Sternendeuter', 15), isEarned: true },
      ];

      render(<BadgeTooltipContent {...defaultProps} tierBadges={tiersWithoutDates} />);

      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks).toHaveLength(2);
    });

    it('applies disabled styling to unearned badge icons', () => {
      const { container } = render(
        <BadgeTooltipContent {...defaultProps} tierBadges={tierBadges} />
      );

      // Find all badge images in the tier section
      const tierSection = container.querySelector('.flex.flex-col.gap-1\\.5');
      const images = tierSection?.querySelectorAll('img');

      // Should have 3 images for 3 tier badges
      expect(images).toHaveLength(3);

      // The unearned badge (Hohepriester) should have grayscale class
      const unearnedImage = Array.from(images || []).find((img) =>
        img.className.includes('grayscale')
      );
      expect(unearnedImage).toBeInTheDocument();
    });
  });
});
