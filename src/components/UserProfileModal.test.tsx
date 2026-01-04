import type { ReactNode } from 'react';

import { MantineProvider } from '@mantine/core';
import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBadgeStore } from '@/store/useBadgeStore';
import type { User } from '@/store/useUserStore';

import { UserProfileModal } from './UserProfileModal';

const renderWithMantine = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

vi.mock('@/store/useBadgeStore');

const mockUser: User = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER',
  status: 'APPROVED',
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  _count: {
    prophecies: 10,
    ratings: 25,
  },
};

const mockBadge = {
  id: 'badge-1',
  key: 'creator_1',
  name: 'Anfänger-Seher',
  description: 'Erste Schritte in die Zukunft',
  requirement: '1 Prophezeiung erstellt',
  icon: '🔮',
  category: BadgeCategory.CREATOR,
  rarity: BadgeRarity.BRONZE,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('UserProfileModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector({
        badges: { 'badge-1': mockBadge },
        allUserBadges: {
          'user-1': {
            'badge-1': {
              userId: 'user-1',
              badgeId: 'badge-1',
              earnedAt: '2025-01-15T00:00:00.000Z',
            },
          },
        },
        myBadges: {},
        awardedBadges: [],
        isInitialized: true,
        isLoading: false,
        error: null,
        setBadges: vi.fn(),
        setMyBadges: vi.fn(),
        addMyBadge: vi.fn(),
        setAllUserBadges: vi.fn(),
        addUserBadge: vi.fn(),
        setAwardedBadges: vi.fn(),
        setInitialized: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      })
    );
  });

  it('renders nothing when user is null', () => {
    const { container } = renderWithMantine(
      <UserProfileModal user={null} opened={true} onClose={mockOnClose} />
    );

    expect(container.querySelector('.mantine-Modal-root')).toBeNull();
  });

  it('renders user display name', () => {
    renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders username', () => {
    renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('shows username as title when displayName is null', () => {
    const userWithoutDisplayName = { ...mockUser, displayName: null };
    renderWithMantine(
      <UserProfileModal user={userWithoutDisplayName} opened={true} onClose={mockOnClose} />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'testuser' })).toBeInTheDocument();
  });

  it('shows member since date', () => {
    renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Mitglied seit/)).toBeInTheDocument();
  });

  it('renders user badges', () => {
    renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

    expect(screen.getByText('Anfänger-Seher')).toBeInTheDocument();
    expect(screen.getByText('🔮')).toBeInTheDocument();
  });

  it('shows achievement count in header', () => {
    renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

    expect(screen.getByText('Achievements (1)')).toBeInTheDocument();
  });

  it('shows no achievements message when user has no achievements', () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector({
        badges: {},
        allUserBadges: {},
        myBadges: {},
        awardedBadges: [],
        isInitialized: true,
        isLoading: false,
        error: null,
        setBadges: vi.fn(),
        setMyBadges: vi.fn(),
        addMyBadge: vi.fn(),
        setAllUserBadges: vi.fn(),
        addUserBadge: vi.fn(),
        setAwardedBadges: vi.fn(),
        setInitialized: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      })
    );

    renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

    expect(screen.getByText('Noch keine Achievements freigeschaltet.')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

    const closeButton = screen.getByTitle('Schließen');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders UserStatsGrid with correct counts', () => {
    renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

    expect(screen.getByText('10')).toBeInTheDocument(); // prophecies
    expect(screen.getByText('25')).toBeInTheDocument(); // ratings
  });

  it('handles user without _count', () => {
    const userWithoutCount = { ...mockUser, _count: undefined };
    renderWithMantine(
      <UserProfileModal user={userWithoutCount} opened={true} onClose={mockOnClose} />
    );

    // Should render without errors, showing 0 for counts
    expect(screen.getByText('Prophezeiungen')).toBeInTheDocument();
  });

  it('handles user without createdAt', () => {
    const userWithoutCreatedAt = { ...mockUser, createdAt: undefined };
    renderWithMantine(
      <UserProfileModal user={userWithoutCreatedAt} opened={true} onClose={mockOnClose} />
    );

    // Should render without the member since text
    expect(screen.queryByText(/Mitglied seit/)).not.toBeInTheDocument();
  });
});
