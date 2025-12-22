import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { RoundsManager } from './RoundsManager';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';

// Mock matchMedia for Mantine
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
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

// Mock the store
const mockSetRounds = vi.fn();
let mockRounds: Array<{
  id: string;
  title: string;
  submissionDeadline: string;
  ratingDeadline: string;
  fulfillmentDate: string;
  _count?: { prophecies: number };
}> = [];

vi.mock('@/store/useRoundStore', () => ({
  useRoundStore: () => ({
    rounds: mockRounds,
    setRounds: mockSetRounds,
  }),
}));

// Mock toast
vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

function renderWithMantine(ui: React.ReactElement) {
  return render(
    <MantineProvider>
      <DatesProvider settings={{ locale: 'de' }}>
        {ui}
      </DatesProvider>
    </MantineProvider>
  );
}

describe('RoundsManager', () => {
  const now = new Date();
  const future = new Date(now.getTime() + 86400000 * 30); // 30 days ahead
  const farFuture = new Date(now.getTime() + 86400000 * 60); // 60 days ahead
  const veryFarFuture = new Date(now.getTime() + 86400000 * 90); // 90 days ahead

  const mockRoundsData = [
    {
      id: '1',
      title: 'Prophezeiungen 2025',
      submissionDeadline: future.toISOString(),
      ratingDeadline: farFuture.toISOString(),
      fulfillmentDate: veryFarFuture.toISOString(),
      _count: { prophecies: 5 },
    },
    {
      id: '2',
      title: 'Sommer-Vorhersagen',
      submissionDeadline: future.toISOString(),
      ratingDeadline: farFuture.toISOString(),
      fulfillmentDate: veryFarFuture.toISOString(),
      _count: { prophecies: 0 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRounds = [];
  });

  it('shows create button', () => {
    renderWithMantine(<RoundsManager initialRounds={[]} />);
    expect(screen.getByText('Neue Runde')).toBeInTheDocument();
  });

  it('shows round count', () => {
    mockRounds = mockRoundsData;
    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);
    expect(screen.getByText('2 Runden')).toBeInTheDocument();
  });

  it('shows singular for one round', () => {
    mockRounds = [mockRoundsData[0]];
    renderWithMantine(<RoundsManager initialRounds={[mockRoundsData[0]]} />);
    expect(screen.getByText('1 Runde')).toBeInTheDocument();
  });

  it('shows empty state when no rounds', () => {
    renderWithMantine(<RoundsManager initialRounds={[]} />);
    expect(screen.getByText(/Keine Runden vorhanden/)).toBeInTheDocument();
  });

  it('displays round titles', () => {
    mockRounds = mockRoundsData;
    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);
    expect(screen.getByText('Prophezeiungen 2025')).toBeInTheDocument();
    expect(screen.getByText('Sommer-Vorhersagen')).toBeInTheDocument();
  });

  it('displays prophecy count', () => {
    mockRounds = mockRoundsData;
    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);
    expect(screen.getByText('5 Prophezeiung(en)')).toBeInTheDocument();
    expect(screen.getByText('0 Prophezeiung(en)')).toBeInTheDocument();
  });

  it('displays status badges', () => {
    mockRounds = mockRoundsData;
    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);
    // Both rounds have future submission deadlines, so they should show "Einreichung offen"
    const badges = screen.getAllByText('Einreichung offen');
    expect(badges.length).toBe(2);
  });

  it('opens create modal when button clicked', async () => {
    renderWithMantine(<RoundsManager initialRounds={[]} />);
    fireEvent.click(screen.getByText('Neue Runde'));
    await waitFor(() => {
      expect(screen.getByText('Neue Runde erstellen')).toBeInTheDocument();
    });
  });

  it('shows form fields in create modal', async () => {
    renderWithMantine(<RoundsManager initialRounds={[]} />);
    fireEvent.click(screen.getByText('Neue Runde'));
    await waitFor(() => {
      expect(screen.getByText('Titel')).toBeInTheDocument();
    });
    expect(screen.getByText(/Einreichungs-Deadline/)).toBeInTheDocument();
    expect(screen.getByText(/Bewertungs-Deadline/)).toBeInTheDocument();
    expect(screen.getByText(/Stichtag/)).toBeInTheDocument();
  });

  it('closes modal when cancel clicked', async () => {
    renderWithMantine(<RoundsManager initialRounds={[]} />);
    fireEvent.click(screen.getByText('Neue Runde'));
    await waitFor(() => {
      expect(screen.getByText('Neue Runde erstellen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Abbrechen'));
    await waitFor(() => {
      expect(screen.queryByText('Neue Runde erstellen')).not.toBeInTheDocument();
    });
  });

  it('opens edit modal when edit button clicked', async () => {
    mockRounds = mockRoundsData;
    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);

    const editButtons = screen.getAllByTitle('Bearbeiten');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Runde bearbeiten')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Prophezeiungen 2025')).toBeInTheDocument();
  });

  it('opens delete confirmation when delete clicked', async () => {
    mockRounds = mockRoundsData;
    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);

    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Runde löschen?')).toBeInTheDocument();
    });
  });

  it('closes delete modal when cancel clicked', async () => {
    mockRounds = mockRoundsData;
    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);

    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Runde löschen?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Abbrechen'));
    await waitFor(() => {
      expect(screen.queryByText('Runde löschen?')).not.toBeInTheDocument();
    });
  });

  it('calls delete API when confirmed', async () => {
    mockRounds = mockRoundsData;
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);

    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    // Wait for modal and find confirm button
    await waitFor(() => {
      expect(screen.getByText('Runde löschen?')).toBeInTheDocument();
    });

    // Find the confirm button by role - it's the danger button in the modal
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(btn =>
      btn.textContent === 'Löschen' && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/rounds/1', { method: 'DELETE' });
    });
  });

  it('initializes store with provided rounds', () => {
    renderWithMantine(<RoundsManager initialRounds={mockRoundsData} />);
    expect(mockSetRounds).toHaveBeenCalledWith(mockRoundsData);
  });
});
