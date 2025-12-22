import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { RoundDetailClient } from './RoundDetailClient';

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
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
  };

  const mockRoundRatingOpen = {
    id: '2',
    title: 'Bewertungsrunde',
    submissionDeadline: past.toISOString(),
    ratingDeadline: future.toISOString(),
    fulfillmentDate: farFuture.toISOString(),
  };

  const mockRoundClosed = {
    id: '3',
    title: 'Abgeschlossene Runde',
    submissionDeadline: farPast.toISOString(),
    ratingDeadline: farPast.toISOString(),
    fulfillmentDate: past.toISOString(),
  };

  const mockProphecies = [
    {
      id: 'p1',
      title: 'Deutschland wird Weltmeister',
      description: 'Bei der nächsten WM wird Deutschland gewinnen',
      createdAt: new Date().toISOString(),
      creator: { id: 'user1', username: 'testuser', displayName: 'Test User' },
      averageRating: 5.5,
      ratingCount: 4,
      userRating: null,
      isOwn: false,
      fulfilled: null,
      resolvedAt: null,
    },
    {
      id: 'p2',
      title: 'Meine eigene Prophezeiung',
      description: 'Das ist meine eigene Prophezeiung',
      createdAt: new Date().toISOString(),
      creator: { id: 'current', username: 'current', displayName: 'Current User' },
      averageRating: null,
      ratingCount: 0,
      userRating: null,
      isOwn: true,
      fulfilled: null,
      resolvedAt: null,
    },
    {
      id: 'p3',
      title: 'Bereits bewertete Prophezeiung',
      description: 'Diese habe ich schon bewertet',
      createdAt: new Date().toISOString(),
      creator: { id: 'user2', username: 'other', displayName: 'Other User' },
      averageRating: 3.0,
      ratingCount: 2,
      userRating: 7,
      isOwn: false,
      fulfilled: null,
      resolvedAt: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays round title', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Prophezeiungen 2025')).toBeInTheDocument();
  });

  it('shows submission open badge when submission is open', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Einreichung offen')).toBeInTheDocument();
  });

  it('shows rating open badge when rating is open', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Bewertung offen')).toBeInTheDocument();
  });

  it('shows closed badge when round is closed', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundClosed}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
  });

  it('shows new prophecy button when submission is open', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Neue Prophezeiung')).toBeInTheDocument();
  });

  it('hides new prophecy button when submission is closed', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.queryByText('Neue Prophezeiung')).not.toBeInTheDocument();
  });

  it('displays all prophecies by default', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    expect(screen.getByText('Bereits bewertete Prophezeiung')).toBeInTheDocument();
  });

  it('filters to show only own prophecies', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    fireEvent.click(screen.getByText(/Meine \(/));

    expect(screen.queryByText('Deutschland wird Weltmeister')).not.toBeInTheDocument();
    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    expect(screen.queryByText('Bereits bewertete Prophezeiung')).not.toBeInTheDocument();
  });

  it('filters to show only prophecies to rate', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    fireEvent.click(screen.getByText(/Noch zu bewerten/));

    expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
    expect(screen.queryByText('Meine eigene Prophezeiung')).not.toBeInTheDocument();
    expect(screen.queryByText('Bereits bewertete Prophezeiung')).not.toBeInTheDocument();
  });

  it('shows empty state when no prophecies', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Noch keine Prophezeiungen vorhanden.')).toBeInTheDocument();
  });

  it('displays average rating for prophecy', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );
    expect(screen.getByText('5.5')).toBeInTheDocument();
    expect(screen.getByText('(4 Bewertungen)')).toBeInTheDocument();
  });

  it('shows "Meine" badge for own prophecies', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Meine')).toBeInTheDocument();
  });

  it('shows delete button for own prophecies during submission phase', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );
    expect(screen.getByTitle('Löschen')).toBeInTheDocument();
  });

  it('hides delete button for own prophecies after submission deadline', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );
    expect(screen.queryByTitle('Löschen')).not.toBeInTheDocument();
  });

  it('shows rating slider for non-own prophecies during rating phase', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );
    // Should show rating sliders for non-own prophecies
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
  });

  it('opens create modal when button clicked', async () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );

    fireEvent.click(screen.getByText('Neue Prophezeiung'));
    // Modal header should be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
    });
  });

  it('closes create modal when cancel clicked', async () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );

    fireEvent.click(screen.getByText('Neue Prophezeiung'));
    await waitFor(() => {
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Abbrechen'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('z.B. Deutschland wird Weltmeister')).not.toBeInTheDocument();
    });
  });

  it('shows back link', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Zurück zur Übersicht')).toBeInTheDocument();
  });

  it('displays deadline information', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );
    expect(screen.getByText('Einreichung bis:')).toBeInTheDocument();
    expect(screen.getByText('Bewertung bis:')).toBeInTheDocument();
    expect(screen.getByText('Stichtag:')).toBeInTheDocument();
  });

  it('calls delete API when delete button clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    // Click the delete button to open confirmation modal
    fireEvent.click(screen.getByTitle('Löschen'));

    // Wait for confirmation modal
    await waitFor(() => {
      expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
    });

    // Click confirm button in modal
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(btn =>
      btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/prophecies/p2', { method: 'DELETE' });
    });
  });

  it('removes prophecy from list after successful delete', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Löschen'));

    // Wait for confirmation modal
    await waitFor(() => {
      expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
    });

    // Click confirm button
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(btn =>
      btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(screen.queryByText('Meine eigene Prophezeiung')).not.toBeInTheDocument();
    });
  });

  it('displays user rating when already rated', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    // The prophecy with userRating: 7 should show "Deine Bewertung" label
    expect(screen.getAllByText('Deine Bewertung').length).toBeGreaterThan(0);
  });

  it('calls rate API when slider value changes and save is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        prophecy: { averageRating: 6.0, ratingCount: 5 }
      })
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    // Find a slider and change its value
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '5' } });

    // The save button should appear
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

  it('shows creator name for each prophecy', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    expect(screen.getByText('von Test User')).toBeInTheDocument();
    expect(screen.getByText('von Other User')).toBeInTheDocument();
  });

  it('creates prophecy and adds to list', async () => {
    const newProphecy = {
      id: 'new',
      title: 'Neue Prophezeiung',
      description: 'Beschreibung',
      createdAt: new Date().toISOString(),
      creator: { id: 'current', username: 'current', displayName: 'Current User' },
      averageRating: null,
      ratingCount: 0,
      userRating: null,
      isOwn: true,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ prophecy: newProphecy })
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={[]}
        currentUserId="current"
      />
    );

    fireEvent.click(screen.getByText('Neue Prophezeiung'));

    // Wait for modal to open
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

  it('shows empty state message for "mine" filter when no own prophecies', () => {
    const propheciesWithoutOwn = mockProphecies.filter(p => !p.isOwn);

    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={propheciesWithoutOwn}
        currentUserId="current"
      />
    );

    fireEvent.click(screen.getByText(/Meine \(/));
    expect(screen.getByText('Du hast noch keine Prophezeiungen erstellt.')).toBeInTheDocument();
  });

  it('shows empty state message for "toRate" filter when all rated', () => {
    const allRated = mockProphecies.map(p => ({
      ...p,
      userRating: p.isOwn ? null : 5,
    }));

    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={allRated}
        currentUserId="current"
      />
    );

    fireEvent.click(screen.getByText(/Noch zu bewerten/));
    expect(screen.getByText('Keine Prophezeiungen mehr zu bewerten.')).toBeInTheDocument();
  });

  it('shows user rating in closed round', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundClosed}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    // Should show "Deine Bewertung: +7" for the already rated prophecy
    expect(screen.getByText(/\+7/)).toBeInTheDocument();
  });

  it('hides "to rate" filter when submission is open', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundSubmissionOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    expect(screen.queryByText(/Noch zu bewerten/)).not.toBeInTheDocument();
  });

  it('shows rating count text correctly', () => {
    renderWithMantine(
      <RoundDetailClient
        round={mockRoundRatingOpen}
        initialProphecies={mockProphecies}
        currentUserId="current"
      />
    );

    expect(screen.getByText('(2 Bewertungen)')).toBeInTheDocument();
  });
});
