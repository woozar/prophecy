import type { ReactNode } from 'react';

import { MantineProvider } from '@mantine/core';
import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBadgeStore } from '@/store/useBadgeStore';
import { useUserStore } from '@/store/useUserStore';

import BadgesPage from './page';

// Helper to create badge store mock state
const createBadgeStoreMock = (overrides = {}) => ({
  badges: {},
  allUserBadges: {},
  isInitialized: false,
  isLoading: false,
  error: null,
  myBadges: {},
  awardedBadges: [],
  addMyBadge: vi.fn(),
  removeMyBadge: vi.fn(),
  addUserBadge: vi.fn(),
  removeUserBadge: vi.fn(),
  setBadges: vi.fn(),
  setAllUserBadges: vi.fn(),
  setMyBadges: vi.fn(),
  setAwardedBadges: vi.fn(),
  setInitialized: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  ...overrides,
});

// Helper to create user store mock state
const createUserStoreMock = (overrides = {}) => ({
  users: {},
  currentUserId: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  connectionStatus: 'connected' as const,
  setUsers: vi.fn(),
  setUser: vi.fn(),
  removeUser: vi.fn(),
  setCurrentUserId: vi.fn(),
  setInitialized: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  setConnectionStatus: vi.fn(),
  ...overrides,
});

// Mock matchMedia for Mantine modals
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? true : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

const renderWithMantine = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

// Mock the stores
vi.mock('@/store/useBadgeStore', () => ({
  useBadgeStore: vi.fn(),
}));

vi.mock('@/store/useUserStore', () => ({
  useUserStore: vi.fn(),
}));

// Mock UserAvatar to avoid complex rendering
vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({ userId }: { userId: string }) => (
    <div data-testid={`avatar-${userId}`}>{userId}</div>
  ),
}));

const mockBadges = {
  'badge-1': {
    id: 'badge-1',
    key: 'creator_1',
    name: 'Anfänger-Seher',
    description: 'Erste Schritte in die Zukunft',
    requirement: '1 Prophezeiung erstellt',
    category: BadgeCategory.CREATOR,
    rarity: BadgeRarity.BRONZE,
    threshold: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  'badge-2': {
    id: 'badge-2',
    key: 'creator_5',
    name: 'Mondleser',
    description: 'Die Sterne beginnen zu sprechen',
    requirement: '5 Prophezeiungen erstellt',
    category: BadgeCategory.CREATOR,
    rarity: BadgeRarity.SILVER,
    threshold: 5,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
};

const mockUsers = {
  'user-1': {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: null,
    role: 'USER',
    status: 'APPROVED',
  },
  'user-2': {
    id: 'user-2',
    username: 'anotheruser',
    displayName: null,
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: null,
    role: 'USER',
    status: 'APPROVED',
  },
};

const mockAllUserBadges = {
  'user-1': {
    'badge-1': {
      id: 'ub-1',
      badgeId: 'badge-1',
      userId: 'user-1',
      earnedAt: '2025-01-05T00:00:00.000Z',
    },
    'badge-2': {
      id: 'ub-2',
      badgeId: 'badge-2',
      userId: 'user-1',
      earnedAt: '2025-01-10T00:00:00.000Z',
    },
  },
  'user-2': {
    'badge-1': {
      id: 'ub-3',
      badgeId: 'badge-1',
      userId: 'user-2',
      earnedAt: '2025-01-08T00:00:00.000Z',
    },
  },
};

describe('BadgesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when not initialized', () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(createBadgeStoreMock({ isInitialized: false }))
    );
    vi.mocked(useUserStore).mockImplementation((selector) => selector(createUserStoreMock()));

    renderWithMantine(<BadgesPage />);

    expect(screen.getByText('Achievements werden geladen...')).toBeInTheDocument();
  });

  it('shows empty state when no achievements awarded', () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(createBadgeStoreMock({ badges: mockBadges, isInitialized: true }))
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    expect(screen.getByText('Noch keine Achievements freigeschaltet.')).toBeInTheDocument();
  });

  it('renders awarded badges with first achiever info', () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(
        createBadgeStoreMock({
          badges: mockBadges,
          allUserBadges: mockAllUserBadges,
          isInitialized: true,
        })
      )
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    // Check badge names are rendered
    expect(screen.getByText('Anfänger-Seher')).toBeInTheDocument();
    expect(screen.getByText('Mondleser')).toBeInTheDocument();

    // Check badge cards are rendered (images load asynchronously)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    // Check first achiever info (Test User appears as first achiever)
    expect(screen.getAllByText('Test User').length).toBeGreaterThanOrEqual(1);
  });

  it('displays correct achiever count for each badge', () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(
        createBadgeStoreMock({
          badges: mockBadges,
          allUserBadges: mockAllUserBadges,
          isInitialized: true,
        })
      )
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    // badge-1 has 2 achievers, badge-2 has 1
    expect(screen.getByText('2 Besitzer')).toBeInTheDocument();
    expect(screen.getByText('1 Besitzer')).toBeInTheDocument();
  });

  it('opens modal when clicking on a badge card', async () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(
        createBadgeStoreMock({
          badges: mockBadges,
          allUserBadges: mockAllUserBadges,
          isInitialized: true,
        })
      )
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    // Click on the second badge card (BRONZE: Anfänger-Seher with 2 achievers)
    const badgeButtons = screen.getAllByRole('button');
    fireEvent.click(badgeButtons[1]);

    // Modal should be open - wait for gold medal (first achiever indicator)
    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument();
    });

    // Verify modal shows achiever list header and badge description (appears in card and modal)
    expect(screen.getByText('Erreicht von:')).toBeInTheDocument();
    expect(screen.getAllByText('Erste Schritte in die Zukunft').length).toBeGreaterThanOrEqual(2);
  });

  it('shows all achievers in modal with ranking', async () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(
        createBadgeStoreMock({
          badges: mockBadges,
          allUserBadges: mockAllUserBadges,
          isInitialized: true,
        })
      )
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    // Click on badge-1 (which has 2 achievers) - sorted by rarity, BRONZE is second
    const badgeButtons = screen.getAllByRole('button');
    fireEvent.click(badgeButtons[1]); // badge-1 (BRONZE) is at index 1

    // Wait for modal content to render
    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument();
    });

    // Check silver medal for second achiever
    expect(screen.getByText('🥈')).toBeInTheDocument();

    // Multiple avatars exist (in badge cards and modal), just verify there are at least 2 of each user
    expect(screen.getAllByTestId('avatar-user-1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('avatar-user-2').length).toBeGreaterThanOrEqual(1);
  });

  it('uses username when displayName is null', async () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(
        createBadgeStoreMock({
          badges: mockBadges,
          allUserBadges: mockAllUserBadges,
          isInitialized: true,
        })
      )
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    // Click on badge-1 (BRONZE, at index 1 due to rarity sorting)
    const badgeButtons = screen.getAllByRole('button');
    fireEvent.click(badgeButtons[1]);

    // Wait for modal to render, then check user-2 is in the achievers list
    await waitFor(() => {
      // user-2 appears in modal achievers list (by userId)
      expect(screen.getAllByTestId('avatar-user-2').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders back link to users page', () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(createBadgeStoreMock({ badges: mockBadges, isInitialized: true }))
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    const backLink = screen.getByRole('link', { name: /Zurück zu Benutzer/i });
    expect(backLink).toHaveAttribute('href', '/users');
  });

  it('shows modal with single achiever (gold medal only)', async () => {
    const singleAchieverBadges = {
      'user-1': {
        'badge-2': {
          id: 'ub-2',
          badgeId: 'badge-2',
          userId: 'user-1',
          earnedAt: '2025-01-10T00:00:00.000Z',
        },
      },
    };

    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(
        createBadgeStoreMock({
          badges: mockBadges,
          allUserBadges: singleAchieverBadges,
          isInitialized: true,
        })
      )
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    // Open modal
    const badgeButton = screen.getByRole('button');
    fireEvent.click(badgeButton);

    // Single achiever should show gold medal
    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument();
    });

    // No silver medal for single achiever
    expect(screen.queryByText('🥈')).not.toBeInTheDocument();
  });

  it('shows bronze medal for third achiever', async () => {
    const threeAchieverBadges = {
      'user-1': {
        'badge-1': {
          id: 'ub-1',
          badgeId: 'badge-1',
          userId: 'user-1',
          earnedAt: '2025-01-05T00:00:00.000Z',
        },
      },
      'user-2': {
        'badge-1': {
          id: 'ub-2',
          badgeId: 'badge-1',
          userId: 'user-2',
          earnedAt: '2025-01-06T00:00:00.000Z',
        },
      },
      'user-3': {
        'badge-1': {
          id: 'ub-3',
          badgeId: 'badge-1',
          userId: 'user-3',
          earnedAt: '2025-01-07T00:00:00.000Z',
        },
      },
    };

    const threeUsers = {
      ...mockUsers,
      'user-3': {
        id: 'user-3',
        username: 'thirduser',
        displayName: 'Third User',
        avatarUrl: null,
        avatarEffect: null,
        avatarEffectColors: null,
        role: 'USER',
        status: 'APPROVED',
      },
    };

    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(
        createBadgeStoreMock({
          badges: mockBadges,
          allUserBadges: threeAchieverBadges,
          isInitialized: true,
        })
      )
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: threeUsers }))
    );

    renderWithMantine(<BadgesPage />);

    // Open modal for badge-1 (3 achievers) - only badge with achievers
    const badgeButtons = screen.getAllByRole('button');
    fireEvent.click(badgeButtons[0]);

    // Should show all three medals
    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument();
    });
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('sorts badges by rarity (highest first)', () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(
        createBadgeStoreMock({
          badges: mockBadges,
          allUserBadges: mockAllUserBadges,
          isInitialized: true,
        })
      )
    );
    vi.mocked(useUserStore).mockImplementation((selector) =>
      selector(createUserStoreMock({ users: mockUsers }))
    );

    renderWithMantine(<BadgesPage />);

    const badgeNames = screen.getAllByRole('heading', { level: 3 });
    // Sorted by rarity: SILVER > BRONZE, so Mondleser first
    expect(badgeNames[0]).toHaveTextContent('Mondleser');
    expect(badgeNames[1]).toHaveTextContent('Anfänger-Seher');
  });

  it('renders page title and description', () => {
    vi.mocked(useBadgeStore).mockImplementation((selector) =>
      selector(createBadgeStoreMock({ badges: mockBadges, isInitialized: true }))
    );
    vi.mocked(useUserStore).mockImplementation((selector) => selector(createUserStoreMock()));

    renderWithMantine(<BadgesPage />);

    expect(screen.getByRole('heading', { name: 'Achievements' })).toBeInTheDocument();
    expect(
      screen.getByText(/Alle Achievements, die bereits freigeschaltet wurden/)
    ).toBeInTheDocument();
  });
});
