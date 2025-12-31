import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuditLogEntry, AuditLogTimeline } from './AuditLogTimeline';

const createMockLog = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
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

describe('AuditLogTimeline', () => {
  describe('empty state', () => {
    it('shows empty message when no logs exist', () => {
      render(<AuditLogTimeline logs={[]} />);
      expect(screen.getByText('Keine Änderungen protokolliert.')).toBeInTheDocument();
    });
  });

  describe('prophecy actions', () => {
    it('displays prophecy creation', () => {
      render(<AuditLogTimeline logs={[createMockLog({ action: 'CREATE' })]} />);
      expect(screen.getByText('Test User hat die Prophezeiung erstellt')).toBeInTheDocument();
    });

    it('displays prophecy update', () => {
      render(<AuditLogTimeline logs={[createMockLog({ action: 'UPDATE' })]} />);
      expect(screen.getByText('Test User hat die Prophezeiung bearbeitet')).toBeInTheDocument();
    });

    it('displays prophecy deletion', () => {
      render(<AuditLogTimeline logs={[createMockLog({ action: 'DELETE' })]} />);
      expect(screen.getByText('Test User hat die Prophezeiung gelöscht')).toBeInTheDocument();
    });

    it('shows title change details', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              action: 'UPDATE',
              oldValue: '{"title":"Old Title","description":"Desc"}',
              newValue: '{"title":"New Title","description":"Desc"}',
            }),
          ]}
        />
      );
      expect(screen.getByText('Titel:')).toBeInTheDocument();
      expect(screen.getByText('Old Title')).toBeInTheDocument();
      expect(screen.getByText('New Title')).toBeInTheDocument();
    });

    it('shows description change details', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              action: 'UPDATE',
              oldValue: '{"title":"Title","description":"Old Desc"}',
              newValue: '{"title":"Title","description":"New Desc"}',
            }),
          ]}
        />
      );
      expect(screen.getByText('Beschreibung:')).toBeInTheDocument();
      expect(screen.getByText('Old Desc')).toBeInTheDocument();
      expect(screen.getByText('New Desc')).toBeInTheDocument();
    });

    it('shows both title and description changes', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              action: 'UPDATE',
              oldValue: '{"title":"Old Title","description":"Old Desc"}',
              newValue: '{"title":"New Title","description":"New Desc"}',
            }),
          ]}
        />
      );
      expect(screen.getByText('Titel:')).toBeInTheDocument();
      expect(screen.getByText('Beschreibung:')).toBeInTheDocument();
    });

    it('shows (leer) for empty values', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              action: 'UPDATE',
              oldValue: '{"title":"","description":"Desc"}',
              newValue: '{"title":"New Title","description":"Desc"}',
            }),
          ]}
        />
      );
      expect(screen.getByText('(leer)')).toBeInTheDocument();
    });
  });

  describe('rating actions', () => {
    it('displays rating creation with positive value', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              entityType: 'RATING',
              action: 'CREATE',
              newValue: '{"value":1}',
            }),
          ]}
        />
      );
      expect(screen.getByText('Test User hat mit +1 bewertet')).toBeInTheDocument();
    });

    it('displays rating creation with negative value', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              entityType: 'RATING',
              action: 'CREATE',
              newValue: '{"value":-1}',
            }),
          ]}
        />
      );
      expect(screen.getByText('Test User hat mit -1 bewertet')).toBeInTheDocument();
    });

    it('displays rating update', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              entityType: 'RATING',
              action: 'UPDATE',
              oldValue: '{"value":-1}',
              newValue: '{"value":1}',
            }),
          ]}
        />
      );
      expect(
        screen.getByText('Test User hat Bewertung von -1 auf +1 geändert')
      ).toBeInTheDocument();
    });

    it('displays rating deletion', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              entityType: 'RATING',
              action: 'DELETE',
            }),
          ]}
        />
      );
      expect(screen.getByText('Test User hat Bewertung entfernt')).toBeInTheDocument();
    });

    it('displays bulk delete for multiple ratings', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              entityType: 'RATING',
              action: 'BULK_DELETE',
              oldValue: '{"count":5}',
            }),
          ]}
        />
      );
      expect(screen.getByText('5 Bewertungen wurden zurückgesetzt')).toBeInTheDocument();
    });

    it('displays bulk delete for single rating', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              entityType: 'RATING',
              action: 'BULK_DELETE',
              oldValue: '{"count":1}',
            }),
          ]}
        />
      );
      expect(screen.getByText('1 Bewertung wurden zurückgesetzt')).toBeInTheDocument();
    });
  });

  describe('context display', () => {
    it('shows context when provided', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              context: 'Prophezeiung wurde bearbeitet - alle Bewertungen zurückgesetzt',
            }),
          ]}
        />
      );
      expect(
        screen.getByText('Prophezeiung wurde bearbeitet - alle Bewertungen zurückgesetzt')
      ).toBeInTheDocument();
    });
  });

  describe('user display', () => {
    it('uses displayName when available', () => {
      render(<AuditLogTimeline logs={[createMockLog()]} />);
      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });

    it('falls back to username when displayName is null', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              user: { id: 'user-1', username: 'testuser', displayName: null },
            }),
          ]}
        />
      );
      expect(screen.getByText(/testuser/)).toBeInTheDocument();
    });

    it('shows Unbekannt when user info is missing', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({
              user: undefined as unknown as AuditLogEntry['user'],
            }),
          ]}
        />
      );
      expect(screen.getByText(/Unbekannt/)).toBeInTheDocument();
    });
  });

  describe('multiple logs', () => {
    it('renders multiple log entries', () => {
      render(
        <AuditLogTimeline
          logs={[
            createMockLog({ id: 'audit-1', action: 'CREATE' }),
            createMockLog({ id: 'audit-2', action: 'UPDATE' }),
            createMockLog({
              id: 'audit-3',
              entityType: 'RATING',
              action: 'CREATE',
              newValue: '{"value":1}',
            }),
          ]}
        />
      );
      expect(screen.getByText('Test User hat die Prophezeiung erstellt')).toBeInTheDocument();
      expect(screen.getByText('Test User hat die Prophezeiung bearbeitet')).toBeInTheDocument();
      expect(screen.getByText('Test User hat mit +1 bewertet')).toBeInTheDocument();
    });
  });
});
