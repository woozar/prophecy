import type { ReactNode } from 'react';

import { MantineProvider } from '@mantine/core';
import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBadgeStore } from '@/store/useBadgeStore';
import { useUserStore } from '@/store/useUserStore';
import type { User } from '@/store/useUserStore';

import { UserProfileModal } from './UserProfileModal';

const renderWithMantine = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

vi.mock('@/store/useBadgeStore');
vi.mock('@/store/useUserStore');

const mockApiClientBadgesAward = vi.fn();
const mockApiClientBadgesRevoke = vi.fn();

vi.mock('@/lib/api-client/client', () => ({
  apiClient: {
    admin: {
      badges: {
        award: (...args: unknown[]) => mockApiClientBadgesAward(...args),
        revoke: (...args: unknown[]) => mockApiClientBadgesRevoke(...args),
      },
    },
  },
}));

vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

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
  category: BadgeCategory.CREATOR,
  rarity: BadgeRarity.BRONZE,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockBugHunterBadge = {
  id: 'badge-bug',
  key: 'hidden_bug_hunter',
  name: 'Bug Hunter',
  description: 'Hat einen Bug gefunden',
  requirement: 'Admin-vergeben',
  category: BadgeCategory.HIDDEN,
  rarity: BadgeRarity.GOLD,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockBetaTesterBadge = {
  id: 'badge-beta',
  key: 'hidden_beta_tester',
  name: 'Beta Tester',
  description: 'War beim Beta-Test dabei',
  requirement: 'Admin-vergeben',
  category: BadgeCategory.HIDDEN,
  rarity: BadgeRarity.GOLD,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('UserProfileModal', () => {
  const mockOnClose = vi.fn();

  const setupDefaultMocks = (isAdmin = false, hasManualBadges = false) => {
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector({
        users: {
          'admin-1': {
            id: 'admin-1',
            username: 'admin',
            displayName: 'Admin User',
            role: 'ADMIN',
            status: 'APPROVED',
            avatarUrl: null,
            avatarEffect: null,
            avatarEffectColors: [],
          },
          'user-1': mockUser,
        },
        currentUserId: isAdmin ? 'admin-1' : 'user-1',
        isInitialized: true,
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
        setUsers: vi.fn(),
        setUser: vi.fn(),
        removeUser: vi.fn(),
        setCurrentUserId: vi.fn(),
        setInitialized: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
        setConnectionStatus: vi.fn(),
      })
    );

    const badges: Record<string, typeof mockBadge> = { 'badge-1': mockBadge };
    if (hasManualBadges) {
      badges['badge-bug'] = mockBugHunterBadge;
      badges['badge-beta'] = mockBetaTesterBadge;
    }

    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector({
        badges,
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
        removeMyBadge: vi.fn(),
        setAllUserBadges: vi.fn(),
        addUserBadge: vi.fn(),
        removeUserBadge: vi.fn(),
        setAwardedBadges: vi.fn(),
        setInitialized: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      })
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClientBadgesAward.mockReset();
    mockApiClientBadgesRevoke.mockReset();
    setupDefaultMocks();
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
    // Badge image is rendered via BadgeIcon component
    expect(screen.getByText('Anfänger-Seher').closest('.badge-card')).toBeInTheDocument();
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
        removeMyBadge: vi.fn(),
        setAllUserBadges: vi.fn(),
        addUserBadge: vi.fn(),
        removeUserBadge: vi.fn(),
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

  describe('Admin Badge Management', () => {
    it('does not show admin section for non-admin users', () => {
      setupDefaultMocks(false, true);
      renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

      expect(screen.queryByText('Admin: Badges verwalten')).not.toBeInTheDocument();
    });

    it('shows admin section for admin users with manual badges', () => {
      setupDefaultMocks(true, true);
      renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

      expect(screen.getByText('Admin: Badges verwalten')).toBeInTheDocument();
      expect(screen.getByText('Bug Hunter')).toBeInTheDocument();
      expect(screen.getByText('Beta Tester')).toBeInTheDocument();
    });

    it('does not show admin section when no manual badges exist', () => {
      setupDefaultMocks(true, false);
      renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

      expect(screen.queryByText('Admin: Badges verwalten')).not.toBeInTheDocument();
    });

    it('calls apiClient.admin.badges.award when awarding a badge', async () => {
      setupDefaultMocks(true, true);
      mockApiClientBadgesAward.mockResolvedValue({ data: {}, error: null });

      renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

      const bugHunterButton = screen.getByText('Bug Hunter').closest('button');
      expect(bugHunterButton).toBeInTheDocument();

      fireEvent.click(bugHunterButton!);

      await waitFor(() => {
        expect(mockApiClientBadgesAward).toHaveBeenCalledWith('user-1', 'hidden_bug_hunter');
      });
    });

    it('calls apiClient.admin.badges.revoke when revoking a badge user already has', async () => {
      // Setup where user already has the bug hunter badge
      vi.mocked(useUserStore).mockImplementation((selector) =>
        selector({
          users: {
            'admin-1': {
              id: 'admin-1',
              username: 'admin',
              displayName: 'Admin User',
              role: 'ADMIN',
              status: 'APPROVED',
              avatarUrl: null,
              avatarEffect: null,
              avatarEffectColors: [],
            },
            'user-1': mockUser,
          },
          currentUserId: 'admin-1',
          isInitialized: true,
          isLoading: false,
          error: null,
          connectionStatus: 'connected',
          setUsers: vi.fn(),
          setUser: vi.fn(),
          removeUser: vi.fn(),
          setCurrentUserId: vi.fn(),
          setInitialized: vi.fn(),
          setLoading: vi.fn(),
          setError: vi.fn(),
          setConnectionStatus: vi.fn(),
        })
      );

      vi.mocked(useBadgeStore).mockImplementation((selector) =>
        selector({
          badges: {
            'badge-1': mockBadge,
            'badge-bug': mockBugHunterBadge,
            'badge-beta': mockBetaTesterBadge,
          },
          allUserBadges: {
            'user-1': {
              'badge-1': {
                userId: 'user-1',
                badgeId: 'badge-1',
                earnedAt: '2025-01-15T00:00:00.000Z',
              },
              'badge-bug': {
                userId: 'user-1',
                badgeId: 'badge-bug',
                earnedAt: '2025-01-20T00:00:00.000Z',
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
          removeMyBadge: vi.fn(),
          setAllUserBadges: vi.fn(),
          addUserBadge: vi.fn(),
          removeUserBadge: vi.fn(),
          setAwardedBadges: vi.fn(),
          setInitialized: vi.fn(),
          setLoading: vi.fn(),
          setError: vi.fn(),
        })
      );

      mockApiClientBadgesRevoke.mockResolvedValue({ data: {}, error: null });

      renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

      // Find the admin section and get the Bug Hunter button from there
      const adminSection = screen.getByText('Admin: Badges verwalten').parentElement;
      const bugHunterButtons = adminSection?.querySelectorAll('button');
      const bugHunterButton = Array.from(bugHunterButtons || []).find((btn) =>
        btn.textContent?.includes('Bug Hunter')
      );
      expect(bugHunterButton).toBeInTheDocument();

      fireEvent.click(bugHunterButton!);

      await waitFor(() => {
        expect(mockApiClientBadgesRevoke).toHaveBeenCalledWith('user-1', 'hidden_bug_hunter');
      });
    });

    it('shows error toast when badge award fails', async () => {
      const { showErrorToast } = await import('@/lib/toast/toast');
      setupDefaultMocks(true, true);
      mockApiClientBadgesAward.mockResolvedValue({ data: null, error: { error: 'Failed' } });

      renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

      const bugHunterButton = screen.getByText('Bug Hunter').closest('button');
      fireEvent.click(bugHunterButton!);

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalled();
      });
    });

    it('shows success toast when badge award succeeds', async () => {
      const { showSuccessToast } = await import('@/lib/toast/toast');
      setupDefaultMocks(true, true);
      mockApiClientBadgesAward.mockResolvedValue({ data: {}, error: null });

      renderWithMantine(<UserProfileModal user={mockUser} opened={true} onClose={mockOnClose} />);

      const bugHunterButton = screen.getByText('Bug Hunter').closest('button');
      fireEvent.click(bugHunterButton!);

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith('Badge vergeben');
      });
    });
  });
});
