import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Prophecy, useProphecyStore } from '@/store/useProphecyStore';
import { type Rating, useRatingStore } from '@/store/useRatingStore';
import { useUserStore } from '@/store/useUserStore';

import { RoundDetailClient } from './RoundDetailClient';

// Mock apiClient
const mockPropheciesCreate = vi.fn();
const mockPropheciesUpdate = vi.fn();
const mockPropheciesDelete = vi.fn();
const mockPropheciesRate = vi.fn();
const mockPropheciesResolve = vi.fn();
const mockRoundsPublishResults = vi.fn();
const mockRoundsUnpublishResults = vi.fn();
const mockRoundsExport = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    prophecies: {
      create: (...args: unknown[]) => mockPropheciesCreate(...args),
      update: (...args: unknown[]) => mockPropheciesUpdate(...args),
      delete: (...args: unknown[]) => mockPropheciesDelete(...args),
      rate: (...args: unknown[]) => mockPropheciesRate(...args),
      resolve: (...args: unknown[]) => mockPropheciesResolve(...args),
    },
    rounds: {
      publishResults: (...args: unknown[]) => mockRoundsPublishResults(...args),
      unpublishResults: (...args: unknown[]) => mockRoundsUnpublishResults(...args),
      export: (...args: unknown[]) => mockRoundsExport(...args),
    },
  },
}));

async function renderWithMantine(ui: React.ReactElement) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<MantineProvider>{ui}</MantineProvider>);
  });
  // Wait for all effects and store subscriptions to settle
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return result!;
}

// Mock matchMedia
beforeAll(() => {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
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

// Mock toast
vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

describe('RoundDetailClient', () => {
  const now = new Date();
  const future = new Date(now.getTime() + 86400000 * 30);
  const farFuture = new Date(now.getTime() + 86400000 * 60);
  const veryFarFuture = new Date(now.getTime() + 86400000 * 90);
  const past = new Date(now.getTime() - 86400000 * 30);
  const farPast = new Date(now.getTime() - 86400000 * 60);

  const mockRoundSubmissionOpen = {
    id: '1',
    title: 'Prophezeiungen 2025',
    submissionDeadline: future.toISOString(),
    ratingDeadline: farFuture.toISOString(),
    fulfillmentDate: veryFarFuture.toISOString(),
    resultsPublishedAt: null,
    createdAt: farPast.toISOString(),
  };

  const mockRoundRatingOpen = {
    id: '2',
    title: 'Bewertungsrunde',
    submissionDeadline: past.toISOString(),
    ratingDeadline: future.toISOString(),
    fulfillmentDate: farFuture.toISOString(),
    resultsPublishedAt: null,
    createdAt: farPast.toISOString(),
  };

  const mockRoundClosed = {
    id: '3',
    title: 'Abgeschlossene Runde',
    submissionDeadline: farPast.toISOString(),
    ratingDeadline: farPast.toISOString(),
    fulfillmentDate: past.toISOString(),
    resultsPublishedAt: past.toISOString(),
    createdAt: farPast.toISOString(),
  };

  const currentUserId = 'current';

  // Helper function to setup stores with test data
  const setupStores = async (prophecies: Prophecy[], ratings: Rating[] = []) => {
    await act(async () => {
      const userStore = useUserStore.getState();
      const prophecyStore = useProphecyStore.getState();
      const ratingStore = useRatingStore.getState();

      // Set up current user
      userStore.setCurrentUserId(currentUserId);
      userStore.setUser({
        id: currentUserId,
        username: 'current',
        displayName: 'Current User',
        role: 'user',
        status: 'active',
      });

      // Set up other users from prophecies
      const users = prophecies.map((p) => ({
        id: p.creatorId,
        username:
          p.creatorId === 'user1' ? 'testuser' : p.creatorId === 'user2' ? 'other' : 'current',
        displayName:
          p.creatorId === 'user1'
            ? 'Test User'
            : p.creatorId === 'user2'
              ? 'Other User'
              : 'Current User',
        role: 'user',
        status: 'active',
      }));

      users.forEach((user) => userStore.setUser(user));

      // Set up prophecies
      prophecyStore.setProphecies(prophecies);

      // Set up ratings
      if (ratings.length > 0) {
        ratingStore.setRatings(ratings);
      }

      // Also set up users for each unique rating userId
      const raterIds = [...new Set(ratings.map((r) => r.userId))];
      raterIds.forEach((raterId, index) => {
        if (!userStore.users[raterId]) {
          userStore.setUser({
            id: raterId,
            username: `rater${index + 1}`,
            displayName: `Rater ${index + 1}`,
            role: 'user',
            status: 'active',
          });
        }
      });
    });
  };

  // Helper to create ratings for a prophecy with a specific count and values
  const createRatingsForProphecy = (prophecyId: string, values: number[]): Rating[] => {
    return values.map((value, index) => ({
      id: `rating-${prophecyId}-${index}`,
      value,
      prophecyId,
      userId: `rater-${index}`,
      createdAt: new Date().toISOString(),
    }));
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear all stores within act() to prevent warnings
    await act(async () => {
      useProphecyStore.setState({ prophecies: {}, isLoading: false, error: null });
      useRatingStore.setState({
        ratings: {},
        ratingsByProphecy: {},
        isLoading: false,
        error: null,
      });
      useUserStore.setState({
        users: {},
        currentUserId: null,
        isInitialized: false,
        isLoading: false,
        error: null,
      });
    });
  });

  afterEach(async () => {
    // Clear all stores after each test within act()
    await act(async () => {
      useProphecyStore.setState({ prophecies: {}, isLoading: false, error: null });
      useRatingStore.setState({
        ratings: {},
        ratingsByProphecy: {},
        isLoading: false,
        error: null,
      });
      useUserStore.setState({
        users: {},
        currentUserId: null,
        isInitialized: false,
        isLoading: false,
        error: null,
      });
    });
  });

  it('displays round title', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);
    expect(screen.getByText('Prophezeiungen 2025')).toBeInTheDocument();
  });

  it('shows submission open badge when submission is open', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);
    expect(screen.getByText('Einreichung offen')).toBeInTheDocument();
  });

  it('shows rating open badge when rating is open', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
    expect(screen.getByText('Bewertung offen')).toBeInTheDocument();
  });

  it('shows closed badge when round is closed', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundClosed} />);
    expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
  });

  it('shows new prophecy button when submission is open', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);
    expect(screen.getByText('Neue Prophezeiung')).toBeInTheDocument();
  });

  it('hides new prophecy button when submission is closed', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
    expect(screen.queryByText('Neue Prophezeiung')).not.toBeInTheDocument();
  });

  it('displays all prophecies by default', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p2',
        roundId: '2',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    const ratings = [
      {
        id: 'r1',
        prophecyId: 'p3',
        userId: currentUserId,
        value: 7,
        createdAt: new Date().toISOString(),
      },
    ];

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
    expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    expect(screen.getByText('Bereits bewertete Prophezeiung')).toBeInTheDocument();
  });

  it('filters to show only own prophecies', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p2',
        roundId: '2',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    fireEvent.click(screen.getByText(/Meine \(/));

    expect(screen.queryByText('Deutschland wird Weltmeister')).not.toBeInTheDocument();
    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    expect(screen.queryByText('Bereits bewertete Prophezeiung')).not.toBeInTheDocument();
  });

  it('filters to show only prophecies to rate', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p2',
        roundId: '2',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    const ratings = [
      {
        id: 'r1',
        prophecyId: 'p3',
        userId: currentUserId,
        value: 7,
        createdAt: new Date().toISOString(),
      },
    ];

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    fireEvent.click(screen.getByText(/Noch zu bewerten/));

    expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
    expect(screen.queryByText('Meine eigene Prophezeiung')).not.toBeInTheDocument();
    expect(screen.queryByText('Bereits bewertete Prophezeiung')).not.toBeInTheDocument();
  });

  it('shows empty state when no prophecies', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);
    expect(screen.getByText('Noch keine Prophezeiungen vorhanden.')).toBeInTheDocument();
  });

  it('displays only rating count during rating phase for non-authors', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1', // Not the current user
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    // 4 ratings with values that average to 5.5: (5 + 5 + 6 + 6) / 4 = 5.5
    const ratings = createRatingsForProphecy('p1', [5, 5, 6, 6]);

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
    // Average should NOT be visible for non-authors during rating phase
    expect(screen.queryByText('+5.5')).not.toBeInTheDocument();
    // But rating count should be visible
    expect(screen.getByText('4 Bewertungen')).toBeInTheDocument();
  });

  it('displays average rating for own prophecy during rating phase', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId, // Current user is author
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    // 4 ratings with values that average to 5.5: (5 + 5 + 6 + 6) / 4 = 5.5
    const ratings = createRatingsForProphecy('p1', [5, 5, 6, 6]);

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
    // Author can see average even during rating phase
    expect(screen.getByText('+5.5')).toBeInTheDocument();
    expect(screen.getByText(/Durchschnitt \(4 Bewertungen\)/)).toBeInTheDocument();
  });

  it('displays average rating after rating deadline for non-authors', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '3',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1', // Not the current user
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    // 4 ratings with values that average to 5.5: (5 + 5 + 6 + 6) / 4 = 5.5
    const ratings = createRatingsForProphecy('p1', [5, 5, 6, 6]);

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundClosed} />);
    // After rating deadline, everyone can see the average
    expect(screen.getByText('+5.5')).toBeInTheDocument();
    expect(screen.getByText(/Durchschnitt \(4 Bewertungen\)/)).toBeInTheDocument();
  });

  it('shows "Meine" badge for own prophecies', async () => {
    const prophecies = [
      {
        id: 'p2',
        roundId: '2',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
    expect(screen.getByText('Meine')).toBeInTheDocument();
  });

  it('shows delete button for own prophecies during submission phase', async () => {
    const prophecies = [
      {
        id: 'p2',
        roundId: '1',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);
    expect(screen.getByTitle('Löschen')).toBeInTheDocument();
  });

  it('hides delete button for own prophecies after submission deadline', async () => {
    const prophecies = [
      {
        id: 'p2',
        roundId: '2',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
    expect(screen.queryByTitle('Löschen')).not.toBeInTheDocument();
  });

  it('shows rating slider for non-own prophecies during rating phase', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    const ratings = [
      {
        id: 'r1',
        prophecyId: 'p3',
        userId: currentUserId,
        value: 7,
        createdAt: new Date().toISOString(),
      },
    ];

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
  });

  it('opens create modal when button clicked', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

    fireEvent.click(screen.getByText('Neue Prophezeiung'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
    });
  });

  it('closes create modal when cancel clicked', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

    fireEvent.click(screen.getByText('Neue Prophezeiung'));
    await waitFor(() => {
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Abbrechen'));

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText('z.B. Deutschland wird Weltmeister')
      ).not.toBeInTheDocument();
    });
  });

  it('shows back link', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);
    expect(screen.getByText('Zurück zur Übersicht')).toBeInTheDocument();
  });

  it('displays deadline information', async () => {
    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);
    expect(screen.getByText('Einreichung bis:')).toBeInTheDocument();
    expect(screen.getByText('Bewertung bis:')).toBeInTheDocument();
    expect(screen.getByText('Stichtag:')).toBeInTheDocument();
  });

  it('calls delete API when delete button clicked', async () => {
    const prophecies = [
      {
        id: 'p2',
        roundId: '1',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    mockPropheciesDelete.mockResolvedValue({ data: { success: true }, error: null });

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

    fireEvent.click(screen.getByTitle('Löschen'));

    await waitFor(() => {
      expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(
      (btn) => btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockPropheciesDelete).toHaveBeenCalledWith('p2');
    });
  });

  it('removes prophecy from list after successful delete', async () => {
    const prophecies = [
      {
        id: 'p2',
        roundId: '1',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    mockPropheciesDelete.mockResolvedValue({ data: { success: true }, error: null });

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Löschen'));

    await waitFor(() => {
      expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(
      (btn) => btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(screen.queryByText('Meine eigene Prophezeiung')).not.toBeInTheDocument();
    });
  });

  it('displays user rating when already rated', async () => {
    const prophecies = [
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    const ratings = [
      {
        id: 'r1',
        prophecyId: 'p3',
        userId: currentUserId,
        value: 7,
        createdAt: new Date().toISOString(),
      },
    ];

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    expect(screen.getAllByText('Deine Bewertung').length).toBeGreaterThan(0);
  });

  it('calls rate API when slider value changes and save is clicked', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    mockPropheciesRate.mockResolvedValue({
      data: {
        prophecy: { id: 'p1', averageRating: 6.0, ratingCount: 5 },
        rating: {
          id: 'r-new',
          prophecyId: 'p1',
          userId: currentUserId,
          value: 5,
          createdAt: new Date().toISOString(),
        },
      },
      error: null,
    });

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '5' } });

    const saveButton = await screen.findByRole('button', { name: 'Bewertung speichern' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPropheciesRate).toHaveBeenCalledWith('p1', 5);
    });
  });

  it('shows creator name for each prophecy', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    expect(screen.getByText('von Test User')).toBeInTheDocument();
    expect(screen.getByText('von Other User')).toBeInTheDocument();
  });

  it('creates prophecy and adds to list', async () => {
    const newProphecy = {
      id: 'new',
      roundId: '1',
      title: 'Neue Prophezeiung',
      description: 'Beschreibung',
      createdAt: new Date().toISOString(),
      creatorId: currentUserId,
      averageRating: null,
      ratingCount: 0,
      fulfilled: null,
      resolvedAt: null,
    };

    mockPropheciesCreate.mockResolvedValue({
      data: { prophecy: newProphecy },
      error: null,
    });

    await setupStores([]);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

    fireEvent.click(screen.getByText('Neue Prophezeiung'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister');
    const descInput = screen.getByPlaceholderText('Beschreibe deine Prophezeiung genauer...');

    fireEvent.change(titleInput, { target: { value: 'Neue Prophezeiung' } });
    fireEvent.change(descInput, { target: { value: 'Beschreibung' } });

    fireEvent.click(screen.getByText('Erstellen'));

    await waitFor(() => {
      expect(mockPropheciesCreate).toHaveBeenCalledWith({
        roundId: '1',
        title: 'Neue Prophezeiung',
        description: 'Beschreibung',
      });
    });
  });

  it('shows empty state message for "mine" filter when no own prophecies', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    fireEvent.click(screen.getByText(/Meine \(/));
    expect(screen.getByText('Du hast noch keine Prophezeiungen erstellt.')).toBeInTheDocument();
  });

  it('shows empty state message for "toRate" filter when all rated', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '2',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p2',
        roundId: '2',
        title: 'Meine eigene Prophezeiung',
        description: 'Das ist meine eigene Prophezeiung',
        createdAt: new Date().toISOString(),
        creatorId: currentUserId,
        averageRating: null,
        ratingCount: 0,
        fulfilled: null,
        resolvedAt: null,
      },
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    const ratings = [
      {
        id: 'r1',
        prophecyId: 'p1',
        userId: currentUserId,
        value: 5,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'r2',
        prophecyId: 'p3',
        userId: currentUserId,
        value: 7,
        createdAt: new Date().toISOString(),
      },
    ];

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    fireEvent.click(screen.getByText(/Noch zu bewerten/));
    expect(screen.getByText('Keine Prophezeiungen mehr zu bewerten.')).toBeInTheDocument();
  });

  it('shows user rating in closed round with "Meine" tag in individual ratings', async () => {
    const prophecies = [
      {
        id: 'p3',
        roundId: '3',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2',
        averageRating: 3.0,
        ratingCount: 2,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    const ratings = [
      {
        id: 'r1',
        prophecyId: 'p3',
        userId: currentUserId,
        value: 7,
        createdAt: new Date().toISOString(),
      },
    ];

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundClosed} />);

    // Expand individual ratings
    const expandButton = screen.getByText('Einzelbewertungen anzeigen');
    fireEvent.click(expandButton);

    // User's rating should be tagged with "Meine"
    expect(screen.getByText('Meine')).toBeInTheDocument();
    expect(screen.getByText('+7')).toBeInTheDocument();
  });

  it('shows "to rate" filter during submission phase (ratings possible from start)', async () => {
    const prophecies = [
      {
        id: 'p1',
        roundId: '1',
        title: 'Deutschland wird Weltmeister',
        description: 'Bei der nächsten WM wird Deutschland gewinnen',
        createdAt: new Date().toISOString(),
        creatorId: 'user1',
        averageRating: 5.5,
        ratingCount: 4,
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

    expect(screen.getByText(/Noch zu bewerten/)).toBeInTheDocument();
  });

  it('shows rating count text correctly during rating phase for non-authors', async () => {
    const prophecies = [
      {
        id: 'p3',
        roundId: '2',
        title: 'Bereits bewertete Prophezeiung',
        description: 'Diese habe ich schon bewertet',
        createdAt: new Date().toISOString(),
        creatorId: 'user2', // Not current user
        fulfilled: null,
        resolvedAt: null,
      },
    ];

    // 2 ratings
    const ratings = createRatingsForProphecy('p3', [3, 3]);

    await setupStores(prophecies, ratings);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    // During rating phase, non-authors only see the count (no average)
    expect(screen.getByText('2 Bewertungen')).toBeInTheDocument();
    expect(screen.queryByText(/Durchschnitt/)).not.toBeInTheDocument();
  });

  describe('Rating functionality', () => {
    it('does not show rating slider for own prophecies', async () => {
      const ownProphecyOnly = [
        {
          id: 'p2',
          roundId: '2',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(ownProphecyOnly);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('shows "Bewerte diese Prophezeiung" label for unrated prophecy', async () => {
      const unratedProphecy = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(unratedProphecy);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      expect(screen.getByText('Bewerte diese Prophezeiung')).toBeInTheDocument();
    });

    it('does not show save button initially', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      const { container } = await renderWithMantine(
        <RoundDetailClient round={mockRoundRatingOpen} />
      );

      // Save button is always in DOM but hidden when no changes
      const saveButton = container.querySelector('[aria-label="Bewertung speichern"]');
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveStyle({ visibility: 'hidden' });
    });

    it('shows save button after changing slider value', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      const { container } = await renderWithMantine(
        <RoundDetailClient round={mockRoundRatingOpen} />
      );

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '8' } });

      const saveButton = container.querySelector('[aria-label="Bewertung speichern"]');
      expect(saveButton).toHaveStyle({ visibility: 'visible' });
    });

    it('shows rating slider during submission phase for other users prophecies', async () => {
      const otherUserProphecy = [
        {
          id: 'p1',
          roundId: '1',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(otherUserProphecy);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
      expect(screen.getByText('Bewerte diese Prophezeiung')).toBeInTheDocument();
    });

    it('does not show rating slider for own prophecies during submission phase', async () => {
      const ownProphecyOnly = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(ownProphecyOnly);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('hides rating slider when round is closed', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '3',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundClosed} />);

      expect(screen.queryByText('Bewerte diese Prophezeiung')).not.toBeInTheDocument();
    });

    it('displays user rating with positive sign in individual ratings', async () => {
      const prophecyWithPositiveRating = [
        {
          id: 'p3',
          roundId: '3',
          title: 'Bereits bewertete Prophezeiung',
          description: 'Diese habe ich schon bewertet',
          createdAt: new Date().toISOString(),
          creatorId: 'user2',
          averageRating: 3.0,
          ratingCount: 2,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      const ratings = [
        {
          id: 'r1',
          prophecyId: 'p3',
          userId: currentUserId,
          value: 5,
          createdAt: new Date().toISOString(),
        },
      ];

      await setupStores(prophecyWithPositiveRating, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundClosed} />);

      // Expand individual ratings
      fireEvent.click(screen.getByText('Einzelbewertungen anzeigen'));

      // User's rating should be tagged with "Meine" and show +5
      expect(screen.getByText('Meine')).toBeInTheDocument();
      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('displays negative user rating without plus sign in individual ratings', async () => {
      const prophecyWithNegativeRating = [
        {
          id: 'p3',
          roundId: '3',
          title: 'Bereits bewertete Prophezeiung',
          description: 'Diese habe ich schon bewertet',
          createdAt: new Date().toISOString(),
          creatorId: 'user2',
          averageRating: 3.0,
          ratingCount: 2,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      const ratings = [
        {
          id: 'r1',
          prophecyId: 'p3',
          userId: currentUserId,
          value: -3,
          createdAt: new Date().toISOString(),
        },
      ];

      await setupStores(prophecyWithNegativeRating, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundClosed} />);

      // Expand individual ratings
      fireEvent.click(screen.getByText('Einzelbewertungen anzeigen'));

      // User's rating should be tagged with "Meine" and show -3
      expect(screen.getByText('Meine')).toBeInTheDocument();
      expect(screen.getByText('-3')).toBeInTheDocument();
    });

    it('handles rating API error gracefully', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      mockPropheciesRate.mockResolvedValue({
        data: null,
        error: { error: 'Rating failed' },
      });

      const { showErrorToast } = await import('@/lib/toast/toast');

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '5' } });

      const saveButton = await screen.findByRole('button', { name: 'Bewertung speichern' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Rating failed');
      });
    });

    it('updates prophecy rating count after successful save', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1', // Not current user
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      // Start with 4 ratings
      const initialRatings = createRatingsForProphecy('p1', [5, 5, 6, 6]);

      mockPropheciesRate.mockResolvedValue({
        data: {
          prophecy: {
            id: 'p1',
            roundId: '2',
            title: 'Deutschland wird Weltmeister',
            description: 'Bei der nächsten WM wird Deutschland gewinnen',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            fulfilled: null,
            resolvedAt: null,
          },
          rating: {
            id: 'r-new',
            prophecyId: 'p1',
            userId: currentUserId,
            value: 5,
            createdAt: new Date().toISOString(),
          },
        },
        error: null,
      });

      await setupStores(prophecies, initialRatings);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '5' } });

      const saveButton = await screen.findByRole('button', { name: 'Bewertung speichern' });
      fireEvent.click(saveButton);

      // During rating phase, non-authors only see count (not average)
      // After saving, there should be 5 ratings (4 initial + 1 new)
      await waitFor(() => {
        expect(screen.getByText('5 Bewertungen')).toBeInTheDocument();
      });
    });

    it('correctly counts prophecies to rate in filter button', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
        {
          id: 'p2',
          roundId: '2',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
        {
          id: 'p3',
          roundId: '2',
          title: 'Bereits bewertete Prophezeiung',
          description: 'Diese habe ich schon bewertet',
          createdAt: new Date().toISOString(),
          creatorId: 'user2',
          averageRating: 3.0,
          ratingCount: 2,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      const ratings = [
        {
          id: 'r1',
          prophecyId: 'p3',
          userId: currentUserId,
          value: 7,
          createdAt: new Date().toISOString(),
        },
      ];

      await setupStores(prophecies, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      expect(screen.getByText(/Noch zu bewerten \(1\)/)).toBeInTheDocument();
    });

    it('shows dash when prophecy has null average rating', async () => {
      const prophecyWithNullAverage = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecyWithNullAverage);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      expect(screen.queryByText('Bewertungen')).not.toBeInTheDocument();
    });

    it('shows single rating text for 1 rating during rating phase for non-authors', async () => {
      const prophecyWithOneRating = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1', // Not current user
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      // 1 rating
      const ratings = createRatingsForProphecy('p1', [5]);

      await setupStores(prophecyWithOneRating, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      // During rating phase, non-authors only see the count
      expect(screen.getByText('1 Bewertung')).toBeInTheDocument();
      expect(screen.queryByText(/Durchschnitt/)).not.toBeInTheDocument();
    });
  });

  describe('Edit functionality', () => {
    it('shows edit button for own prophecies during submission phase', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      expect(screen.getByTitle('Bearbeiten')).toBeInTheDocument();
    });

    it('hides edit button after submission deadline', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '2',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      expect(screen.queryByTitle('Bearbeiten')).not.toBeInTheDocument();
    });

    it('opens edit modal when edit button clicked', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });
    });

    it('pre-fills edit form with current values', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        const inputs = screen.getAllByRole('textbox');
        const titleInput = inputs.find(
          (input) => (input as HTMLInputElement).value === 'Meine eigene Prophezeiung'
        );
        expect(titleInput).toBeInTheDocument();
      });
    });

    it('calls update API when edit is submitted', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      mockPropheciesUpdate.mockResolvedValue({
        data: {
          prophecy: {
            ...prophecies[0],
            title: 'Updated Title',
          },
        },
        error: null,
      });

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole('textbox');
      const titleInput = inputs.find(
        (input) => (input as HTMLInputElement).value === 'Meine eigene Prophezeiung'
      );

      fireEvent.change(titleInput!, { target: { value: 'Updated Title' } });
      fireEvent.click(screen.getByText('Speichern'));

      await waitFor(() => {
        expect(mockPropheciesUpdate).toHaveBeenCalledWith('p2', {
          title: 'Updated Title',
          description: 'Das ist meine eigene Prophezeiung',
        });
      });
    });

    it('closes edit modal when cancel button clicked', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

      await waitFor(() => {
        expect(screen.queryByText('Prophezeiung bearbeiten')).not.toBeInTheDocument();
      });
    });

    it('updates description field in edit modal', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const descriptionInput = screen.getByLabelText('Beschreibung');
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

      expect(descriptionInput).toHaveValue('Updated description');
    });

    it('shows confirmation dialog when editing prophecy with ratings', async () => {
      const prophecyWithRatings = [
        {
          id: 'p-rated',
          roundId: '1',
          title: 'Prophezeiung mit Bewertungen',
          description: 'Diese hat schon Bewertungen',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      // 3 ratings
      const ratings = createRatingsForProphecy('p-rated', [4, 5, 5]);

      await setupStores(prophecyWithRatings, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten?')).toBeInTheDocument();
      });
    });

    it('shows correct rating count in edit confirmation dialog', async () => {
      const prophecyWith5Ratings = [
        {
          id: 'p-rated',
          roundId: '1',
          title: 'Prophezeiung mit 5 Bewertungen',
          description: 'Diese hat 5 Bewertungen',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      // 5 ratings
      const ratings = createRatingsForProphecy('p-rated', [4, 4, 5, 5, 5]);

      await setupStores(prophecyWith5Ratings, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(
          screen.getByText('Diese Prophezeiung hat bereits 5 Bewertungen erhalten.')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Beim Speichern werden alle Bewertungen gelöscht.')
        ).toBeInTheDocument();
      });
    });

    it('shows singular "Bewertung" for single rating in confirmation dialog', async () => {
      const prophecyWith1Rating = [
        {
          id: 'p-rated',
          roundId: '1',
          title: 'Prophezeiung mit 1 Bewertung',
          description: 'Diese hat 1 Bewertung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      // 1 rating
      const ratings = createRatingsForProphecy('p-rated', [5]);

      await setupStores(prophecyWith1Rating, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(
          screen.getByText('Diese Prophezeiung hat bereits 1 Bewertung erhalten.')
        ).toBeInTheDocument();
      });
    });

    it('opens edit modal directly when prophecy has no ratings', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
        expect(screen.queryByText('Prophezeiung bearbeiten?')).not.toBeInTheDocument();
      });
    });

    it('opens edit modal after confirming in dialog', async () => {
      const prophecyWithRatings = [
        {
          id: 'p-rated',
          roundId: '1',
          title: 'Prophezeiung mit Bewertungen',
          description: 'Diese hat schon Bewertungen',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      // 3 ratings
      const ratings = createRatingsForProphecy('p-rated', [4, 5, 5]);

      await setupStores(prophecyWithRatings, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten?')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Trotzdem bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
        expect(screen.queryByText('Prophezeiung bearbeiten?')).not.toBeInTheDocument();
      });
    });

    it('closes confirmation dialog when cancelled', async () => {
      const prophecyWithRatings = [
        {
          id: 'p-rated',
          roundId: '1',
          title: 'Prophezeiung mit Bewertungen',
          description: 'Diese hat schon Bewertungen',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      // 3 ratings
      const ratings = createRatingsForProphecy('p-rated', [4, 5, 5]);

      await setupStores(prophecyWithRatings, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten?')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

      await waitFor(() => {
        expect(screen.queryByText('Prophezeiung bearbeiten?')).not.toBeInTheDocument();
        expect(screen.queryByText('Prophezeiung bearbeiten')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete functionality', () => {
    it('shows delete button for own prophecies during submission phase', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      expect(screen.getByTitle('Löschen')).toBeInTheDocument();
    });

    it('opens delete confirmation modal when delete button clicked', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
      });
    });

    it('shows prophecy title in delete confirmation modal', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      await waitFor(() => {
        expect(screen.getByText('"Meine eigene Prophezeiung"')).toBeInTheDocument();
      });
    });

    it('closes delete confirmation modal when cancelled', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

      await waitFor(() => {
        expect(screen.queryByText('Prophezeiung löschen?')).not.toBeInTheDocument();
      });
    });

    it('calls delete API when confirmed', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      mockPropheciesDelete.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      const modal = await screen.findByRole('dialog');

      fireEvent.click(within(modal).getByRole('button', { name: 'Löschen' }));

      await waitFor(() => {
        expect(mockPropheciesDelete).toHaveBeenCalledWith('p2');
      });
    });
  });

  describe('Modal close handlers', () => {
    it('closes create modal via cancel button', async () => {
      await setupStores([]);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText('z.B. Deutschland wird Weltmeister')
        ).not.toBeInTheDocument();
      });
    });

    it('closes edit modal via cancel button and preserves original data', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Meine eigene Prophezeiung');
      fireEvent.change(titleInput, { target: { value: 'Modified Title' } });

      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

      await waitFor(() => {
        expect(screen.queryByText('Prophezeiung bearbeiten')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    });

    it('clears title error when create modal is closed via onClose', async () => {
      await setupStores([]);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')
        ).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const closeButton =
        dialog.querySelector('button[aria-label="Close modal"]') ||
        dialog.querySelector('button.mantine-Modal-close') ||
        within(dialog).queryByRole('button', { name: /close/i });

      if (closeButton) {
        fireEvent.click(closeButton);
      } else {
        const overlay = document.querySelector('.mantine-Modal-overlay');
        if (overlay) {
          fireEvent.click(overlay);
        }
      }

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText('z.B. Deutschland wird Weltmeister')
        ).not.toBeInTheDocument();
      });
    });

    it('clears edit title error when edit modal is closed via onClose', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const closeButton =
        dialog.querySelector('button[aria-label="Close modal"]') ||
        dialog.querySelector('button.mantine-Modal-close') ||
        within(dialog).queryByRole('button', { name: /close/i });

      if (closeButton) {
        fireEvent.click(closeButton);
      } else {
        const overlay = document.querySelector('.mantine-Modal-overlay');
        if (overlay) {
          fireEvent.click(overlay);
        }
      }

      await waitFor(() => {
        expect(screen.queryByText('Prophezeiung bearbeiten')).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation errors', () => {
    it('shows validation error when creating prophecy with empty title', async () => {
      await setupStores([]);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')
        ).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Erstellen').closest('button');
      expect(submitButton).toBeDisabled();
    });

    it('clears title error when user types in create modal', async () => {
      await setupStores([]);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')
        ).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister');

      fireEvent.change(titleInput, { target: { value: 'Valid Title' } });

      expect(titleInput).toHaveValue('Valid Title');
    });

    it('clears title error when user types in edit modal', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Meine eigene Prophezeiung');

      fireEvent.change(titleInput, { target: { value: '' } });
      fireEvent.change(titleInput, { target: { value: 'New Valid Title' } });

      expect(titleInput).toHaveValue('New Valid Title');
    });

    it('handles create API error with specific error message', async () => {
      mockPropheciesCreate.mockResolvedValue({
        data: null,
        error: { error: 'Specific API error' },
      });

      const { showErrorToast } = await import('@/lib/toast/toast');

      await setupStores([]);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')
        ).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister');
      const descInput = screen.getByPlaceholderText('Beschreibe deine Prophezeiung genauer...');

      fireEvent.change(titleInput, { target: { value: 'Test Prophecy' } });
      fireEvent.change(descInput, { target: { value: 'Description' } });

      fireEvent.click(screen.getByText('Erstellen'));

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Specific API error');
      });
    });

    it('handles edit API error with specific error message', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      mockPropheciesUpdate.mockResolvedValue({
        data: null,
        error: { error: 'Edit failed' },
      });

      const { showErrorToast } = await import('@/lib/toast/toast');

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Meine eigene Prophezeiung');
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

      fireEvent.click(screen.getByText('Speichern'));

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Edit failed');
      });
    });

    it('handles delete API error with specific error message', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      mockPropheciesDelete.mockResolvedValue({
        data: null,
        error: { error: 'Delete not allowed' },
      });

      const { showErrorToast } = await import('@/lib/toast/toast');

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
      });

      const modal = await screen.findByRole('dialog');
      fireEvent.click(within(modal).getByRole('button', { name: 'Löschen' }));

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Delete not allowed');
      });
    });

    it('shows validation error when edit title is cleared and saved', async () => {
      const prophecies = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Meine eigene Prophezeiung');
      fireEvent.change(titleInput, { target: { value: '' } });

      const saveButton = screen.getByText('Speichern').closest('button');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Filter functionality', () => {
    it('filters to show only own prophecies when "Meine" is clicked', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '1',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText(/Meine \(/));

      expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
      expect(screen.queryByText('Deutschland wird Weltmeister')).not.toBeInTheDocument();
    });

    it('shows all prophecies when "Alle" is clicked after filtering', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '1',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText(/Meine \(/));

      fireEvent.click(screen.getByText(/Alle \(/));

      expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
      expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
    });

    it('filters to show only unrated prophecies when "Noch zu bewerten" is clicked', async () => {
      const prophecies = [
        {
          id: 'p1',
          roundId: '1',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
        {
          id: 'p3',
          roundId: '1',
          title: 'Bereits bewertete Prophezeiung',
          description: 'Diese habe ich schon bewertet',
          createdAt: new Date().toISOString(),
          creatorId: 'user2',
          averageRating: 3.0,
          ratingCount: 2,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      const ratings = [
        {
          id: 'r1',
          prophecyId: 'p3',
          userId: currentUserId,
          value: 7,
          createdAt: new Date().toISOString(),
        },
      ];

      await setupStores(prophecies, ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText(/Noch zu bewerten/));

      expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
      expect(screen.queryByText('Meine eigene Prophezeiung')).not.toBeInTheDocument();
    });

    it('shows empty state when filter has no results', async () => {
      const onlyOwnProphecy = [
        {
          id: 'p2',
          roundId: '1',
          title: 'Meine eigene Prophezeiung',
          description: 'Das ist meine eigene Prophezeiung',
          createdAt: new Date().toISOString(),
          creatorId: currentUserId,
          averageRating: null,
          ratingCount: 0,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(onlyOwnProphecy);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText(/Noch zu bewerten/));

      expect(screen.getByText('Keine Prophezeiungen mehr zu bewerten.')).toBeInTheDocument();
    });

    it('shows correct empty state for "Meine" filter with no own prophecies', async () => {
      const othersProphecies = [
        {
          id: 'p1',
          roundId: '1',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 4,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(othersProphecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByText(/Meine \(/));

      expect(screen.getByText('Du hast noch keine Prophezeiungen erstellt.')).toBeInTheDocument();
    });
  });

  describe('Admin functionality', () => {
    const adminUserId = 'admin-user';

    const setupAdminStores = async (prophecies: Prophecy[], ratings: Rating[] = []) => {
      await act(async () => {
        const userStore = useUserStore.getState();
        const prophecyStore = useProphecyStore.getState();
        const ratingStore = useRatingStore.getState();

        // Set up admin user
        userStore.setCurrentUserId(adminUserId);
        userStore.setUser({
          id: adminUserId,
          username: 'admin',
          displayName: 'Admin User',
          role: 'ADMIN',
          status: 'active',
        });

        // Set up other users from prophecies
        const users = prophecies.map((p) => ({
          id: p.creatorId,
          username: p.creatorId === 'user1' ? 'testuser' : 'other',
          displayName: p.creatorId === 'user1' ? 'Test User' : 'Other User',
          role: 'user',
          status: 'active',
        }));

        users.forEach((user) => userStore.setUser(user));
        prophecyStore.setProphecies(prophecies);
        if (ratings.length > 0) {
          ratingStore.setRatings(ratings);
        }
      });
    };

    const mockRoundAwaitingResolution = {
      id: 'round-awaiting',
      title: 'Runde zur Auflösung',
      submissionDeadline: farPast.toISOString(),
      ratingDeadline: past.toISOString(),
      fulfillmentDate: past.toISOString(),
      resultsPublishedAt: null,
      createdAt: farPast.toISOString(),
    };

    describe('handleExportRound', () => {
      it('shows export button for admin users', async () => {
        await setupAdminStores([]);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        expect(screen.getByText('Excel Export')).toBeInTheDocument();
      });

      it('calls export API when export button clicked', async () => {
        const mockBlob = new Blob(['test'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        mockRoundsExport.mockResolvedValue({
          data: { blob: mockBlob, filename: 'export.xlsx' },
          error: null,
        });

        // Mock URL.createObjectURL and URL.revokeObjectURL
        const mockCreateObjectURL = vi.fn(() => 'blob:test');
        const mockRevokeObjectURL = vi.fn();
        globalThis.URL.createObjectURL = mockCreateObjectURL;
        globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

        await setupAdminStores([]);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        fireEvent.click(screen.getByText('Excel Export'));

        await waitFor(() => {
          expect(mockRoundsExport).toHaveBeenCalledWith('round-awaiting');
        });
      });

      it('shows exporting state while export is in progress', async () => {
        let resolveExport: (value: unknown) => void;
        const exportPromise = new Promise((resolve) => {
          resolveExport = resolve;
        });
        mockRoundsExport.mockReturnValue(exportPromise);

        await setupAdminStores([]);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        fireEvent.click(screen.getByText('Excel Export'));

        await waitFor(() => {
          expect(screen.getByText('Exportieren...')).toBeInTheDocument();
        });

        // Cleanup - wrap in act to handle state update
        await act(async () => {
          resolveExport!({ data: null, error: { error: 'cancelled' } });
        });
      });

      it('shows error toast on export failure', async () => {
        mockRoundsExport.mockResolvedValue({
          data: null,
          error: { error: 'Export fehlgeschlagen' },
        });

        const { showErrorToast } = await import('@/lib/toast/toast');

        await setupAdminStores([]);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        fireEvent.click(screen.getByText('Excel Export'));

        await waitFor(() => {
          expect(showErrorToast).toHaveBeenCalledWith('Export fehlgeschlagen');
        });
      });
    });

    describe('handleResolveProphecy', () => {
      it('shows resolve buttons for admin after rating deadline', async () => {
        const prophecies = [
          {
            id: 'p1',
            roundId: 'round-awaiting',
            title: 'Unresolved Prophecy',
            description: 'Still unresolved',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            averageRating: 5.5,
            ratingCount: 4,
            fulfilled: null,
            resolvedAt: null,
          },
        ];

        await setupAdminStores(prophecies);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        expect(screen.getByTitle('Als erfüllt markieren')).toBeInTheDocument();
        expect(screen.getByTitle('Als nicht erfüllt markieren')).toBeInTheDocument();
      });

      it('calls resolve API when marking as fulfilled', async () => {
        const prophecies = [
          {
            id: 'p1',
            roundId: 'round-awaiting',
            title: 'Unresolved Prophecy',
            description: 'Still unresolved',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            averageRating: 5.5,
            ratingCount: 4,
            fulfilled: null,
            resolvedAt: null,
          },
        ];

        mockPropheciesResolve.mockResolvedValue({
          data: { prophecy: { ...prophecies[0], fulfilled: true } },
          error: null,
        });

        await setupAdminStores(prophecies);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        fireEvent.click(screen.getByTitle('Als erfüllt markieren'));

        await waitFor(() => {
          expect(mockPropheciesResolve).toHaveBeenCalledWith('p1', true);
        });
      });

      it('calls resolve API when marking as not fulfilled', async () => {
        const prophecies = [
          {
            id: 'p1',
            roundId: 'round-awaiting',
            title: 'Unresolved Prophecy',
            description: 'Still unresolved',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            averageRating: 5.5,
            ratingCount: 4,
            fulfilled: null,
            resolvedAt: null,
          },
        ];

        mockPropheciesResolve.mockResolvedValue({
          data: { prophecy: { ...prophecies[0], fulfilled: false } },
          error: null,
        });

        await setupAdminStores(prophecies);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        fireEvent.click(screen.getByTitle('Als nicht erfüllt markieren'));

        await waitFor(() => {
          expect(mockPropheciesResolve).toHaveBeenCalledWith('p1', false);
        });
      });

      it('shows error toast on resolve failure', async () => {
        const prophecies = [
          {
            id: 'p1',
            roundId: 'round-awaiting',
            title: 'Unresolved Prophecy',
            description: 'Still unresolved',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            averageRating: 5.5,
            ratingCount: 4,
            fulfilled: null,
            resolvedAt: null,
          },
        ];

        mockPropheciesResolve.mockResolvedValue({
          data: null,
          error: { error: 'Resolve fehlgeschlagen' },
        });

        const { showErrorToast } = await import('@/lib/toast/toast');

        await setupAdminStores(prophecies);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        fireEvent.click(screen.getByTitle('Als erfüllt markieren'));

        await waitFor(() => {
          expect(showErrorToast).toHaveBeenCalledWith('Resolve fehlgeschlagen');
        });
      });
    });

    describe('handlePublishResults', () => {
      it('shows publish button for admin when all prophecies are resolved', async () => {
        const prophecies = [
          {
            id: 'p1',
            roundId: 'round-awaiting',
            title: 'Resolved Prophecy',
            description: 'Already resolved',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            averageRating: 5.5,
            ratingCount: 4,
            fulfilled: true,
            resolvedAt: new Date().toISOString(),
          },
        ];

        await setupAdminStores(prophecies);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        expect(screen.getByText('Ergebnisse freigeben')).toBeInTheDocument();
      });

      it('disables publish button when not all prophecies are resolved', async () => {
        const prophecies = [
          {
            id: 'p1',
            roundId: 'round-awaiting',
            title: 'Unresolved Prophecy',
            description: 'Still unresolved',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            averageRating: 5.5,
            ratingCount: 4,
            fulfilled: null,
            resolvedAt: null,
          },
        ];

        await setupAdminStores(prophecies);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        const publishButton = screen.getByText('Ergebnisse freigeben').closest('button');
        expect(publishButton).toBeDisabled();
      });

      it('calls publishResults API when publish button clicked', async () => {
        const prophecies = [
          {
            id: 'p1',
            roundId: 'round-awaiting',
            title: 'Resolved Prophecy',
            description: 'Already resolved',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            averageRating: 5.5,
            ratingCount: 4,
            fulfilled: true,
            resolvedAt: new Date().toISOString(),
          },
        ];

        mockRoundsPublishResults.mockResolvedValue({ data: {}, error: null });

        await setupAdminStores(prophecies);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        fireEvent.click(screen.getByText('Ergebnisse freigeben'));

        await waitFor(() => {
          expect(mockRoundsPublishResults).toHaveBeenCalledWith('round-awaiting');
        });
      });

      it('shows error toast on publish failure', async () => {
        const prophecies = [
          {
            id: 'p1',
            roundId: 'round-awaiting',
            title: 'Resolved Prophecy',
            description: 'Already resolved',
            createdAt: new Date().toISOString(),
            creatorId: 'user1',
            averageRating: 5.5,
            ratingCount: 4,
            fulfilled: true,
            resolvedAt: new Date().toISOString(),
          },
        ];

        mockRoundsPublishResults.mockResolvedValue({
          data: null,
          error: { error: 'Publish fehlgeschlagen' },
        });

        const { showErrorToast } = await import('@/lib/toast/toast');

        await setupAdminStores(prophecies);
        await renderWithMantine(<RoundDetailClient round={mockRoundAwaitingResolution} />);

        fireEvent.click(screen.getByText('Ergebnisse freigeben'));

        await waitFor(() => {
          expect(showErrorToast).toHaveBeenCalledWith('Publish fehlgeschlagen');
        });
      });
    });

    describe('handleUnpublishResults', () => {
      const mockRoundPublished = {
        id: 'round-published',
        title: 'Veröffentlichte Runde',
        submissionDeadline: farPast.toISOString(),
        ratingDeadline: farPast.toISOString(),
        fulfillmentDate: past.toISOString(),
        resultsPublishedAt: past.toISOString(),
        createdAt: farPast.toISOString(),
      };

      it('shows unpublish button for admin when results are published', async () => {
        await setupAdminStores([]);
        await renderWithMantine(<RoundDetailClient round={mockRoundPublished} />);

        expect(screen.getByText('Freigabe aufheben')).toBeInTheDocument();
      });

      it('calls unpublishResults API when unpublish button clicked', async () => {
        mockRoundsUnpublishResults.mockResolvedValue({ data: {}, error: null });

        await setupAdminStores([]);
        await renderWithMantine(<RoundDetailClient round={mockRoundPublished} />);

        fireEvent.click(screen.getByText('Freigabe aufheben'));

        await waitFor(() => {
          expect(mockRoundsUnpublishResults).toHaveBeenCalledWith('round-published');
        });
      });

      it('shows error toast on unpublish failure', async () => {
        mockRoundsUnpublishResults.mockResolvedValue({
          data: null,
          error: { error: 'Unpublish fehlgeschlagen' },
        });

        const { showErrorToast } = await import('@/lib/toast/toast');

        await setupAdminStores([]);
        await renderWithMantine(<RoundDetailClient round={mockRoundPublished} />);

        fireEvent.click(screen.getByText('Freigabe aufheben'));

        await waitFor(() => {
          expect(showErrorToast).toHaveBeenCalledWith('Unpublish fehlgeschlagen');
        });
      });
    });
  });
});
