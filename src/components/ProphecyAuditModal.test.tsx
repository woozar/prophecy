import type { ReactNode } from 'react';

import { MantineProvider } from '@mantine/core';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuditLogEntry } from './AuditLogTimeline';
import { ProphecyAuditModal } from './ProphecyAuditModal';

const renderWithMantine = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

const mockGetAuditLogs = vi.fn();

vi.mock('@/lib/api-client/client', () => ({
  apiClient: {
    prophecies: {
      getAuditLogs: (...args: unknown[]) => mockGetAuditLogs(...args),
    },
  },
}));

// Mock EventSource for SSE
class MockEventSource {
  static instances: MockEventSource[] = [];
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  close() {
    // Cleanup
  }

  // Helper to simulate events in tests
  simulateEvent(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    this.listeners[type]?.forEach((listener) => listener(event));
  }

  static reset() {
    MockEventSource.instances = [];
  }
}

// @ts-expect-error - Mocking EventSource
globalThis.EventSource = MockEventSource;

const createMockAuditLog = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id: 'audit-1',
  entityType: 'PROPHECY',
  entityId: 'prophecy-1',
  action: 'CREATE',
  prophecyId: 'prophecy-1',
  userId: 'user-1',
  oldValue: null,
  newValue: null,
  context: null,
  createdAt: '2025-01-15T10:00:00.000Z',
  user: {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
  },
  ...overrides,
});

describe('ProphecyAuditModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.reset();
  });

  it('does not render when prophecyId is null', () => {
    renderWithMantine(<ProphecyAuditModal prophecyId={null} onClose={mockOnClose} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal with default title when prophecyTitle is not provided', async () => {
    mockGetAuditLogs.mockResolvedValue({ data: { auditLogs: [] } });

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Änderungsverlauf')).toBeInTheDocument();
    });
  });

  it('renders modal with prophecy title when provided', async () => {
    mockGetAuditLogs.mockResolvedValue({ data: { auditLogs: [] } });

    renderWithMantine(
      <ProphecyAuditModal
        prophecyId="prophecy-1"
        prophecyTitle="Meine Prophezeiung"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Verlauf: Meine Prophezeiung')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGetAuditLogs.mockReturnValue(promise);

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    expect(screen.getByText('Laden...')).toBeInTheDocument();

    resolvePromise!({ data: { auditLogs: [] } });

    await waitFor(() => {
      expect(screen.queryByText('Laden...')).not.toBeInTheDocument();
    });
  });

  it('displays audit logs after successful fetch', async () => {
    const mockLogs = [
      createMockAuditLog({ id: 'audit-1', action: 'CREATE' }),
      createMockAuditLog({ id: 'audit-2', action: 'UPDATE' }),
    ];
    mockGetAuditLogs.mockResolvedValue({ data: { auditLogs: mockLogs } });

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Test User hat die Prophezeiung erstellt')).toBeInTheDocument();
      expect(screen.getByText('Test User hat die Prophezeiung bearbeitet')).toBeInTheDocument();
    });
  });

  it('shows error message when API returns error', async () => {
    mockGetAuditLogs.mockResolvedValue({ error: { message: 'Server error' } });

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden des Verlaufs')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch throws', async () => {
    mockGetAuditLogs.mockRejectedValue(new Error('Network error'));

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden des Verlaufs')).toBeInTheDocument();
    });
  });

  it('shows empty state when no logs exist', async () => {
    mockGetAuditLogs.mockResolvedValue({ data: { auditLogs: [] } });

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Keine Änderungen protokolliert.')).toBeInTheDocument();
    });
  });

  it('refetches when prophecyId changes', async () => {
    mockGetAuditLogs.mockResolvedValue({ data: { auditLogs: [] } });

    const { rerender } = renderWithMantine(
      <ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith('prophecy-1');
    });

    rerender(
      <MantineProvider>
        <ProphecyAuditModal prophecyId="prophecy-2" onClose={mockOnClose} />
      </MantineProvider>
    );

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith('prophecy-2');
    });
  });

  it('creates EventSource connection when prophecyId is provided', async () => {
    mockGetAuditLogs.mockResolvedValue({ data: { auditLogs: [] } });

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.instances[0].url).toBe('/api/sse');
    });
  });

  it('refetches logs when SSE auditLog:created event is received for this prophecy', async () => {
    mockGetAuditLogs.mockResolvedValue({ data: { auditLogs: [] } });

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledTimes(1);
    });

    // Simulate SSE event for this prophecy
    act(() => {
      MockEventSource.instances[0].simulateEvent('auditLog:created', { prophecyId: 'prophecy-1' });
    });

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledTimes(2);
    });
  });

  it('does not refetch when SSE event is for different prophecy', async () => {
    mockGetAuditLogs.mockResolvedValue({ data: { auditLogs: [] } });

    renderWithMantine(<ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledTimes(1);
    });

    // Simulate SSE event for different prophecy
    act(() => {
      MockEventSource.instances[0].simulateEvent('auditLog:created', { prophecyId: 'prophecy-2' });
    });

    // Should still be 1 call
    expect(mockGetAuditLogs).toHaveBeenCalledTimes(1);
  });

  it('clears logs when prophecyId becomes null', async () => {
    mockGetAuditLogs.mockResolvedValue({
      data: { auditLogs: [createMockAuditLog()] },
    });

    const { rerender } = renderWithMantine(
      <ProphecyAuditModal prophecyId="prophecy-1" onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test User hat die Prophezeiung erstellt')).toBeInTheDocument();
    });

    rerender(
      <MantineProvider>
        <ProphecyAuditModal prophecyId={null} onClose={mockOnClose} />
      </MantineProvider>
    );

    // Modal should be closed
    expect(screen.queryByText('Test User hat die Prophezeiung erstellt')).not.toBeInTheDocument();
  });
});
