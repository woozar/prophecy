import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Prophecy, useProphecyStore } from '@/store/useProphecyStore';
import { type Rating, useRatingStore } from '@/store/useRatingStore';
import { useUserStore } from '@/store/useUserStore';

import { RoundDetailClient } from './RoundDetailClient';

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
    });
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

  it('displays average rating for prophecy', async () => {
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
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);
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

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

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
      expect(mockFetch).toHaveBeenCalledWith('/api/prophecies/p2', { method: 'DELETE' });
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

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

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

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          prophecy: { ...prophecies[0], averageRating: 6.0, ratingCount: 5 },
          rating: {
            id: 'r-new',
            prophecyId: 'p1',
            userId: currentUserId,
            value: 5,
            createdAt: new Date().toISOString(),
          },
        }),
    });
    globalThis.fetch = mockFetch;

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '5' } });

    const saveButton = await screen.findByText('Speichern');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/prophecies/p1/rate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
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

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ prophecy: newProphecy }),
    });
    globalThis.fetch = mockFetch;

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
      expect(mockFetch).toHaveBeenCalledWith('/api/prophecies', expect.any(Object));
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

  it('shows user rating in closed round', async () => {
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

    expect(screen.getByText(/\+7/)).toBeInTheDocument();
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

  it('shows rating count text correctly', async () => {
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

    await setupStores(prophecies);
    await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

    expect(screen.getByText(/Durchschnitt \(2 Bewertungen\)/)).toBeInTheDocument();
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
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      expect(screen.queryByText('Speichern')).not.toBeInTheDocument();
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
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '8' } });

      expect(screen.getByText('Speichern')).toBeInTheDocument();
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

    it('displays user rating with positive sign in closed round', async () => {
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

      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('displays negative user rating without plus sign in closed round', async () => {
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

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Rating failed' }),
      });
      globalThis.fetch = mockFetch;

      const { showErrorToast } = await import('@/lib/toast/toast');

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '5' } });

      const saveButton = await screen.findByText('Speichern');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Rating failed');
      });
    });

    it('updates prophecy rating after successful save', async () => {
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

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            prophecy: {
              ...prophecies[0],
              averageRating: 6.0,
              ratingCount: 5,
            },
            rating: {
              id: 'r-new',
              prophecyId: 'p1',
              userId: currentUserId,
              value: 5,
              createdAt: new Date().toISOString(),
            },
          }),
      });
      globalThis.fetch = mockFetch;

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '5' } });

      const saveButton = await screen.findByText('Speichern');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Durchschnitt \(5 Bewertungen\)/)).toBeInTheDocument();
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

    it('shows single rating text for 1 rating', async () => {
      const prophecyWithOneRating = [
        {
          id: 'p1',
          roundId: '2',
          title: 'Deutschland wird Weltmeister',
          description: 'Bei der nächsten WM wird Deutschland gewinnen',
          createdAt: new Date().toISOString(),
          creatorId: 'user1',
          averageRating: 5.5,
          ratingCount: 1,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecyWithOneRating);
      await renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} />);

      expect(screen.getByText(/Durchschnitt \(1 Bewertung\)/)).toBeInTheDocument();
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

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            prophecy: {
              ...prophecies[0],
              title: 'Updated Title',
            },
          }),
      });
      globalThis.fetch = mockFetch;

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
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/prophecies/p2',
          expect.objectContaining({ method: 'PUT' })
        );
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
          averageRating: 4.5,
          ratingCount: 3,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecyWithRatings);
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
          averageRating: 4.5,
          ratingCount: 5,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecyWith5Ratings);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('5 Bewertungen')).toBeInTheDocument();
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
          averageRating: 4.5,
          ratingCount: 1,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecyWith1Rating);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('1 Bewertung')).toBeInTheDocument();
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
          averageRating: 4.5,
          ratingCount: 3,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecyWithRatings);
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
          averageRating: 4.5,
          ratingCount: 3,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      await setupStores(prophecyWithRatings);
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

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      globalThis.fetch = mockFetch;

      await setupStores(prophecies);
      await renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      const modal = await screen.findByRole('dialog');

      fireEvent.click(within(modal).getByRole('button', { name: 'Löschen' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/prophecies/p2',
          expect.objectContaining({ method: 'DELETE' })
        );
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
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Specific API error' }),
      });
      globalThis.fetch = mockFetch;

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

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Edit failed' }),
      });
      globalThis.fetch = mockFetch;

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

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Delete not allowed' }),
      });
      globalThis.fetch = mockFetch;

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
});
