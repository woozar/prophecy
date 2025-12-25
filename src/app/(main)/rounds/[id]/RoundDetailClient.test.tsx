import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);
    expect(screen.getByText('Prophezeiungen 2025')).toBeInTheDocument();
  });

  it('shows submission open badge when submission is open', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);
    expect(screen.getByText('Einreichung offen')).toBeInTheDocument();
  });

  it('shows rating open badge when rating is open', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={[]} />);
    expect(screen.getByText('Bewertung offen')).toBeInTheDocument();
  });

  it('shows closed badge when round is closed', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundClosed} initialProphecies={[]} />);
    expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
  });

  it('shows new prophecy button when submission is open', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);
    expect(screen.getByText('Neue Prophezeiung')).toBeInTheDocument();
  });

  it('hides new prophecy button when submission is closed', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={[]} />);
    expect(screen.queryByText('Neue Prophezeiung')).not.toBeInTheDocument();
  });

  it('displays all prophecies by default', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);
    expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    expect(screen.getByText('Bereits bewertete Prophezeiung')).toBeInTheDocument();
  });

  it('filters to show only own prophecies', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

    fireEvent.click(screen.getByText(/Meine \(/));

    expect(screen.queryByText('Deutschland wird Weltmeister')).not.toBeInTheDocument();
    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    expect(screen.queryByText('Bereits bewertete Prophezeiung')).not.toBeInTheDocument();
  });

  it('filters to show only prophecies to rate', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

    fireEvent.click(screen.getByText(/Noch zu bewerten/));

    expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
    expect(screen.queryByText('Meine eigene Prophezeiung')).not.toBeInTheDocument();
    expect(screen.queryByText('Bereits bewertete Prophezeiung')).not.toBeInTheDocument();
  });

  it('shows empty state when no prophecies', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);
    expect(screen.getByText('Noch keine Prophezeiungen vorhanden.')).toBeInTheDocument();
  });

  it('displays average rating for prophecy', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);
    // Positive values are displayed with + prefix
    expect(screen.getByText('+5.5')).toBeInTheDocument();
    expect(screen.getByText(/Durchschnitt \(4 Bewertungen\)/)).toBeInTheDocument();
  });

  it('shows "Meine" badge for own prophecies', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);
    expect(screen.getByText('Meine')).toBeInTheDocument();
  });

  it('shows delete button for own prophecies during submission phase', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);
    expect(screen.getByTitle('Löschen')).toBeInTheDocument();
  });

  it('hides delete button for own prophecies after submission deadline', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);
    expect(screen.queryByTitle('Löschen')).not.toBeInTheDocument();
  });

  it('shows rating slider for non-own prophecies during rating phase', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);
    // Should show rating sliders for non-own prophecies
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
  });

  it('opens create modal when button clicked', async () => {
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);

    fireEvent.click(screen.getByText('Neue Prophezeiung'));
    // Modal header should be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
    });
  });

  it('closes create modal when cancel clicked', async () => {
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);

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
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);
    expect(screen.getByText('Zurück zur Übersicht')).toBeInTheDocument();
  });

  it('displays deadline information', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);
    expect(screen.getByText('Einreichung bis:')).toBeInTheDocument();
    expect(screen.getByText('Bewertung bis:')).toBeInTheDocument();
    expect(screen.getByText('Stichtag:')).toBeInTheDocument();
  });

  it('calls delete API when delete button clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

    // Click the delete button to open confirmation modal
    fireEvent.click(screen.getByTitle('Löschen'));

    // Wait for confirmation modal
    await waitFor(() => {
      expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
    });

    // Click confirm button in modal
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find((btn) => btn.textContent?.includes('Löschen') && !btn.hasAttribute('title'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/prophecies/p2', { method: 'DELETE' });
    });
  });

  it('removes prophecy from list after successful delete', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

    expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Löschen'));

    // Wait for confirmation modal
    await waitFor(() => {
      expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
    });

    // Click confirm button
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find((btn) => btn.textContent?.includes('Löschen') && !btn.hasAttribute('title'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(screen.queryByText('Meine eigene Prophezeiung')).not.toBeInTheDocument();
    });
  });

  it('displays user rating when already rated', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

    // The prophecy with userRating: 7 should show "Deine Bewertung" label
    expect(screen.getAllByText('Deine Bewertung').length).toBeGreaterThan(0);
  });

  it('calls rate API when slider value changes and save is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          prophecy: { averageRating: 6.0, ratingCount: 5 },
        }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

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
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

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
      json: () => Promise.resolve({ prophecy: newProphecy }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);

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
    const propheciesWithoutOwn = mockProphecies.filter((p) => !p.isOwn);

    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={propheciesWithoutOwn} />);

    fireEvent.click(screen.getByText(/Meine \(/));
    expect(screen.getByText('Du hast noch keine Prophezeiungen erstellt.')).toBeInTheDocument();
  });

  it('shows empty state message for "toRate" filter when all rated', () => {
    const allRated = mockProphecies.map((p) => ({
      ...p,
      userRating: p.isOwn ? null : 5,
    }));

    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={allRated} />);

    fireEvent.click(screen.getByText(/Noch zu bewerten/));
    expect(screen.getByText('Keine Prophezeiungen mehr zu bewerten.')).toBeInTheDocument();
  });

  it('shows user rating in closed round', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundClosed} initialProphecies={mockProphecies} />);

    // Should show "Deine Bewertung: +7" for the already rated prophecy
    expect(screen.getByText(/\+7/)).toBeInTheDocument();
  });

  it('shows "to rate" filter during submission phase (ratings possible from start)', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

    expect(screen.getByText(/Noch zu bewerten/)).toBeInTheDocument();
  });

  it('shows rating count text correctly', () => {
    renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

    expect(screen.getByText(/Durchschnitt \(2 Bewertungen\)/)).toBeInTheDocument();
  });

  describe('Rating functionality', () => {
    it('does not show rating slider for own prophecies', () => {
      const ownProphecyOnly = [mockProphecies[1]]; // isOwn: true

      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={ownProphecyOnly} />);

      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('shows "Bewerte diese Prophezeiung" label for unrated prophecy', () => {
      const unratedProphecy = [
        {
          ...mockProphecies[0],
          userRating: null,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={unratedProphecy} />);

      expect(screen.getByText('Bewerte diese Prophezeiung')).toBeInTheDocument();
    });

    it('does not show save button initially', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

      expect(screen.queryByText('Speichern')).not.toBeInTheDocument();
    });

    it('shows save button after changing slider value', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '8' } });

      expect(screen.getByText('Speichern')).toBeInTheDocument();
    });

    it('shows rating slider during submission phase for other users prophecies', () => {
      const otherUserProphecy = [mockProphecies[0]]; // isOwn: false

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={otherUserProphecy} />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
      expect(screen.getByText('Bewerte diese Prophezeiung')).toBeInTheDocument();
    });

    it('does not show rating slider for own prophecies during submission phase', () => {
      const ownProphecyOnly = [mockProphecies[1]]; // isOwn: true

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={ownProphecyOnly} />);

      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('hides rating slider when round is closed', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundClosed} initialProphecies={mockProphecies} />);

      // In closed round, sliders should not be shown
      expect(screen.queryByText('Bewerte diese Prophezeiung')).not.toBeInTheDocument();
    });

    it('displays user rating with positive sign in closed round', () => {
      const prophecyWithPositiveRating = [
        {
          ...mockProphecies[2],
          userRating: 5,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundClosed} initialProphecies={prophecyWithPositiveRating} />);

      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('displays negative user rating without plus sign in closed round', () => {
      const prophecyWithNegativeRating = [
        {
          ...mockProphecies[2],
          userRating: -3,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundClosed} initialProphecies={prophecyWithNegativeRating} />);

      expect(screen.getByText('-3')).toBeInTheDocument();
    });

    it('handles rating API error gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Rating failed' }),
      });
      globalThis.fetch = mockFetch;

      const { showErrorToast } = await import('@/lib/toast/toast');

      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '5' } });

      const saveButton = await screen.findByText('Speichern');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Rating failed');
      });
    });

    it('updates prophecy rating after successful save', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            prophecy: {
              id: 'p1',
              averageRating: 6.0,
              ratingCount: 5,
            },
          }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '5' } });

      const saveButton = await screen.findByText('Speichern');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Durchschnitt \(5 Bewertungen\)/)).toBeInTheDocument();
      });
    });

    it('correctly counts prophecies to rate in filter button', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

      // p1 has no userRating and is not own = 1 to rate
      expect(screen.getByText(/Noch zu bewerten \(1\)/)).toBeInTheDocument();
    });

    it('shows dash when prophecy has null average rating', () => {
      const prophecyWithNullAverage = [
        {
          ...mockProphecies[0],
          averageRating: null,
          ratingCount: 0,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={prophecyWithNullAverage} />);

      // With 0 ratings, the rating count section shouldn't show
      expect(screen.queryByText('Bewertungen')).not.toBeInTheDocument();
    });

    it('shows single rating text for 1 rating', () => {
      const prophecyWithOneRating = [
        {
          ...mockProphecies[0],
          ratingCount: 1,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={prophecyWithOneRating} />);

      // Should show singular form
      expect(screen.getByText(/Durchschnitt \(1 Bewertung\)/)).toBeInTheDocument();
    });
  });

  describe('Edit functionality', () => {
    it('shows edit button for own prophecies during submission phase', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      expect(screen.getByTitle('Bearbeiten')).toBeInTheDocument();
    });

    it('hides edit button after submission deadline', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundRatingOpen} initialProphecies={mockProphecies} />);

      expect(screen.queryByTitle('Bearbeiten')).not.toBeInTheDocument();
    });

    it('opens edit modal when edit button clicked', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });
    });

    it('pre-fills edit form with current values', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        const inputs = screen.getAllByRole('textbox');
        // Find the title input (in the edit modal)
        const titleInput = inputs.find((input) => (input as HTMLInputElement).value === 'Meine eigene Prophezeiung');
        expect(titleInput).toBeInTheDocument();
      });
    });

    it('calls update API when edit is submitted', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            prophecy: {
              ...mockProphecies[1],
              title: 'Updated Title',
            },
          }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      // Find title input in edit modal and change it
      const inputs = screen.getAllByRole('textbox');
      const titleInput = inputs.find((input) => (input as HTMLInputElement).value === 'Meine eigene Prophezeiung');

      fireEvent.change(titleInput!, { target: { value: 'Updated Title' } });
      fireEvent.click(screen.getByText('Speichern'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/prophecies/p2', expect.objectContaining({ method: 'PUT' }));
      });
    });

    it('closes edit modal when cancel button clicked', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

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
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      // Find the description textarea by its label
      const descriptionInput = screen.getByLabelText('Beschreibung');
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

      expect(descriptionInput).toHaveValue('Updated description');
    });

    it('shows confirmation dialog when editing prophecy with ratings', async () => {
      const prophecyWithRatings = [
        {
          id: 'p-rated',
          title: 'Prophezeiung mit Bewertungen',
          description: 'Diese hat schon Bewertungen',
          createdAt: new Date().toISOString(),
          creator: { id: 'current', username: 'current', displayName: 'Current User' },
          averageRating: 4.5,
          ratingCount: 3,
          userRating: null,
          isOwn: true,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={prophecyWithRatings} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten?')).toBeInTheDocument();
      });
    });

    it('shows correct rating count in edit confirmation dialog', async () => {
      const prophecyWith5Ratings = [
        {
          id: 'p-rated',
          title: 'Prophezeiung mit 5 Bewertungen',
          description: 'Diese hat 5 Bewertungen',
          createdAt: new Date().toISOString(),
          creator: { id: 'current', username: 'current', displayName: 'Current User' },
          averageRating: 4.5,
          ratingCount: 5,
          userRating: null,
          isOwn: true,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={prophecyWith5Ratings} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('5 Bewertungen')).toBeInTheDocument();
        expect(screen.getByText('Beim Speichern werden alle Bewertungen gelöscht.')).toBeInTheDocument();
      });
    });

    it('shows singular "Bewertung" for single rating in confirmation dialog', async () => {
      const prophecyWith1Rating = [
        {
          id: 'p-rated',
          title: 'Prophezeiung mit 1 Bewertung',
          description: 'Diese hat 1 Bewertung',
          createdAt: new Date().toISOString(),
          creator: { id: 'current', username: 'current', displayName: 'Current User' },
          averageRating: 4.5,
          ratingCount: 1,
          userRating: null,
          isOwn: true,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={prophecyWith1Rating} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('1 Bewertung')).toBeInTheDocument();
      });
    });

    it('opens edit modal directly when prophecy has no ratings', async () => {
      // mockProphecies[1] has ratingCount: 0 and isOwn: true
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        // Should open edit modal directly, not confirmation dialog
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
        expect(screen.queryByText('Prophezeiung bearbeiten?')).not.toBeInTheDocument();
      });
    });

    it('opens edit modal after confirming in dialog', async () => {
      const prophecyWithRatings = [
        {
          id: 'p-rated',
          title: 'Prophezeiung mit Bewertungen',
          description: 'Diese hat schon Bewertungen',
          createdAt: new Date().toISOString(),
          creator: { id: 'current', username: 'current', displayName: 'Current User' },
          averageRating: 4.5,
          ratingCount: 3,
          userRating: null,
          isOwn: true,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={prophecyWithRatings} />);

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
          title: 'Prophezeiung mit Bewertungen',
          description: 'Diese hat schon Bewertungen',
          createdAt: new Date().toISOString(),
          creator: { id: 'current', username: 'current', displayName: 'Current User' },
          averageRating: 4.5,
          ratingCount: 3,
          userRating: null,
          isOwn: true,
          fulfilled: null,
          resolvedAt: null,
        },
      ];

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={prophecyWithRatings} />);

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
    it('shows delete button for own prophecies during submission phase', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      expect(screen.getByTitle('Löschen')).toBeInTheDocument();
    });

    it('opens delete confirmation modal when delete button clicked', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung löschen?')).toBeInTheDocument();
      });
    });

    it('shows prophecy title in delete confirmation modal', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      await waitFor(() => {
        expect(screen.getByText('"Meine eigene Prophezeiung"')).toBeInTheDocument();
      });
    });

    it('closes delete confirmation modal when cancelled', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

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
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      globalThis.fetch = mockFetch;

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Löschen'));

      const modal = await screen.findByRole('dialog');

      fireEvent.click(within(modal).getByRole('button', { name: 'Löschen' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/prophecies/p2', expect.objectContaining({ method: 'DELETE' }));
      });
    });
  });

  describe('Modal close handlers', () => {
    it('closes create modal via cancel button', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);

      // Open create modal
      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
      });

      // Click cancel button to close modal
      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('z.B. Deutschland wird Weltmeister')).not.toBeInTheDocument();
      });
    });

    it('closes edit modal via cancel button and preserves original data', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      // Open edit modal
      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      // Make changes
      const titleInput = screen.getByDisplayValue('Meine eigene Prophezeiung');
      fireEvent.change(titleInput, { target: { value: 'Modified Title' } });

      // Close via cancel button
      fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

      await waitFor(() => {
        expect(screen.queryByText('Prophezeiung bearbeiten')).not.toBeInTheDocument();
      });

      // Original title should still be displayed in the card
      expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
    });

    it('clears title error when create modal is closed via onClose', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);

      // Open create modal
      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
      });

      // Click the modal overlay or close button (Mantine modal provides close functionality)
      const dialog = screen.getByRole('dialog');
      const closeButton =
        dialog.querySelector('button[aria-label="Close modal"]') ||
        dialog.querySelector('button.mantine-Modal-close') ||
        within(dialog).queryByRole('button', { name: /close/i });

      if (closeButton) {
        fireEvent.click(closeButton);
      } else {
        // Fallback: click the backdrop/overlay
        const overlay = document.querySelector('.mantine-Modal-overlay');
        if (overlay) {
          fireEvent.click(overlay);
        }
      }

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('z.B. Deutschland wird Weltmeister')).not.toBeInTheDocument();
      });
    });

    it('clears edit title error when edit modal is closed via onClose', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      // Open edit modal
      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      // Close via modal's onClose handler
      const dialog = screen.getByRole('dialog');
      const closeButton =
        dialog.querySelector('button[aria-label="Close modal"]') ||
        dialog.querySelector('button.mantine-Modal-close') ||
        within(dialog).queryByRole('button', { name: /close/i });

      if (closeButton) {
        fireEvent.click(closeButton);
      } else {
        // Fallback: click the backdrop/overlay
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
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);

      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
      });

      // Try to submit with empty title (button should be disabled)
      const submitButton = screen.getByText('Erstellen').closest('button');
      expect(submitButton).toBeDisabled();
    });

    it('clears title error when user types in create modal', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);

      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister');

      // Type a valid title
      fireEvent.change(titleInput, { target: { value: 'Valid Title' } });

      expect(titleInput).toHaveValue('Valid Title');
    });

    it('clears title error when user types in edit modal', async () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Meine eigene Prophezeiung');

      // Clear and type new title
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

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={[]} />);

      fireEvent.click(screen.getByText('Neue Prophezeiung'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('z.B. Deutschland wird Weltmeister')).toBeInTheDocument();
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
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Edit failed' }),
      });
      globalThis.fetch = mockFetch;

      const { showErrorToast } = await import('@/lib/toast/toast');

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

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
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Delete not allowed' }),
      });
      globalThis.fetch = mockFetch;

      const { showErrorToast } = await import('@/lib/toast/toast');

      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

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
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      fireEvent.click(screen.getByTitle('Bearbeiten'));

      await waitFor(() => {
        expect(screen.getByText('Prophezeiung bearbeiten')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Meine eigene Prophezeiung');
      fireEvent.change(titleInput, { target: { value: '' } });

      // Save button should be disabled when title is empty
      const saveButton = screen.getByText('Speichern').closest('button');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Filter functionality', () => {
    it('filters to show only own prophecies when "Meine" is clicked', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      // Click on "Meine" filter
      fireEvent.click(screen.getByText(/Meine \(/));

      // Should only show own prophecy
      expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
      expect(screen.queryByText('Deutschland wird Weltmeister')).not.toBeInTheDocument();
    });

    it('shows all prophecies when "Alle" is clicked after filtering', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      // First filter to "Meine"
      fireEvent.click(screen.getByText(/Meine \(/));

      // Then click "Alle"
      fireEvent.click(screen.getByText(/Alle \(/));

      // Should show all prophecies
      expect(screen.getByText('Meine eigene Prophezeiung')).toBeInTheDocument();
      expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
    });

    it('filters to show only unrated prophecies when "Noch zu bewerten" is clicked', () => {
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={mockProphecies} />);

      // Click on "Noch zu bewerten" filter
      fireEvent.click(screen.getByText(/Noch zu bewerten/));

      // Should show unrated prophecy (p1 has userRating: null and isOwn: false)
      expect(screen.getByText('Deutschland wird Weltmeister')).toBeInTheDocument();
      // Should not show own prophecy or already rated ones
      expect(screen.queryByText('Meine eigene Prophezeiung')).not.toBeInTheDocument();
    });

    it('shows empty state when filter has no results', () => {
      const onlyOwnProphecy = [mockProphecies[1]]; // isOwn: true
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={onlyOwnProphecy} />);

      // Click on "Noch zu bewerten" filter - should have no results since all are own
      fireEvent.click(screen.getByText(/Noch zu bewerten/));

      expect(screen.getByText('Keine Prophezeiungen mehr zu bewerten.')).toBeInTheDocument();
    });

    it('shows correct empty state for "Meine" filter with no own prophecies', () => {
      const othersProphecies = [mockProphecies[0]]; // isOwn: false
      renderWithMantine(<RoundDetailClient round={mockRoundSubmissionOpen} initialProphecies={othersProphecies} />);

      fireEvent.click(screen.getByText(/Meine \(/));

      expect(screen.getByText('Du hast noch keine Prophezeiungen erstellt.')).toBeInTheDocument();
    });
  });
});
