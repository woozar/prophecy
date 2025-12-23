'use client';

import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { onProphecyRated, type ProphecyRatedEvent } from '@/hooks/useSSE';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { TextInput } from '@/components/TextInput';
import { GlowBadge } from '@/components/GlowBadge';
import { RoundStatusBadge } from '@/components/RoundStatusBadge';
import { RatingSlider } from '@/components/RatingSlider';
import { showSuccessToast, showErrorToast } from '@/lib/toast/toast';
import { createProphecySchema, updateProphecySchema } from '@/lib/schemas/prophecy';
import { IconPlus, IconTrash, IconEdit, IconFilter } from '@tabler/icons-react';
import { BackLink } from '@/components/BackLink';
import { EmptyState } from '@/components/EmptyState';
import { Textarea } from '@/components/Textarea';
import { IconActionButton } from '@/components/IconActionButton';
import { FilterButton } from '@/components/FilterButton';
import { UserAvatar } from '@/components/UserAvatar';
import { formatDate } from '@/lib/formatting/date';

interface Creator {
  id: string;
  username: string;
  displayName: string | null;
}

interface Prophecy {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  creator: Creator;
  averageRating: number | null;
  ratingCount: number;
  userRating: number | null;
  isOwn: boolean;
  fulfilled: boolean | null;
  resolvedAt: string | null;
}

interface Round {
  id: string;
  title: string;
  submissionDeadline: string;
  ratingDeadline: string;
  fulfillmentDate: string;
}

interface RoundDetailClientProps {
  round: Round;
  initialProphecies: Prophecy[];
}

type FilterType = 'all' | 'mine' | 'toRate';

function getEmptyStateMessage(filter: FilterType): string {
  if (filter === 'mine') {
    return 'Du hast noch keine Prophezeiungen erstellt.';
  }
  if (filter === 'toRate') {
    return 'Keine Prophezeiungen mehr zu bewerten.';
  }
  return 'Noch keine Prophezeiungen vorhanden.';
}

export const RoundDetailClient = memo(function RoundDetailClient({
  round,
  initialProphecies,
}: Readonly<RoundDetailClientProps>) {
  const [prophecies, setProphecies] = useState<Prophecy[]>(initialProphecies);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteProphecy, setConfirmDeleteProphecy] = useState<Prophecy | null>(null);
  const [editingProphecy, setEditingProphecy] = useState<Prophecy | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTitleError, setEditTitleError] = useState<string | undefined>(undefined);

  // Subscribe to real-time rating updates from other users
  const handleProphecyRated = useCallback((event: ProphecyRatedEvent) => {
    if (event.roundId !== round.id) return;

    setProphecies((prev) =>
      prev.map((p) =>
        p.id === event.id
          ? { ...p, averageRating: event.averageRating, ratingCount: event.ratingCount }
          : p
      )
    );
  }, [round.id]);

  useEffect(() => {
    const unsubscribe = onProphecyRated(handleProphecyRated);
    return unsubscribe;
  }, [handleProphecyRated]);

  const now = useMemo(() => new Date(), []);
  const submissionDeadline = useMemo(() => new Date(round.submissionDeadline), [round.submissionDeadline]);
  const ratingDeadline = useMemo(() => new Date(round.ratingDeadline), [round.ratingDeadline]);

  const isSubmissionOpen = now < submissionDeadline;
  const isRatingOpen = now >= submissionDeadline && now < ratingDeadline;

  const filteredProphecies = useMemo(() => {
    switch (filter) {
      case 'mine':
        return prophecies.filter((p) => p.isOwn);
      case 'toRate':
        return prophecies.filter((p) => !p.isOwn && p.userRating === null);
      default:
        return prophecies;
    }
  }, [prophecies, filter]);


  const handleCreateProphecy = useCallback(async () => {
    const input = {
      roundId: round.id,
      title: newTitle.trim(),
      description: newDescription.trim(),
    };

    const parsed = createProphecySchema.safeParse(input);
    if (!parsed.success) {
      const titleErr = parsed.error.errors.find((e) => e.path[0] === 'title');
      setTitleError(titleErr?.message);
      return;
    }

    setTitleError(undefined);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/prophecies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      const { prophecy } = await res.json();
      setProphecies((prev) => [prophecy, ...prev]);
      showSuccessToast('Prophezeiung erstellt');
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setTitleError(undefined);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  }, [round.id, newTitle, newDescription]);

  const handleDeleteProphecy = useCallback(async () => {
    if (!confirmDeleteProphecy) return;

    const id = confirmDeleteProphecy.id;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/prophecies/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      setProphecies((prev) => prev.filter((p) => p.id !== id));
      showSuccessToast('Prophezeiung gelöscht');
      setConfirmDeleteProphecy(null);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setDeletingId(null);
    }
  }, [confirmDeleteProphecy]);

  const handleConfirmDelete = useCallback((id: string) => {
    const prophecy = prophecies.find((p) => p.id === id);
    if (prophecy) {
      setConfirmDeleteProphecy(prophecy);
    }
  }, [prophecies]);

  const handleStartEdit = useCallback((prophecy: Prophecy) => {
    setEditingProphecy(prophecy);
    setEditTitle(prophecy.title);
    setEditDescription(prophecy.description);
    setEditTitleError(undefined);
  }, []);

  const handleEditProphecy = useCallback(async () => {
    if (!editingProphecy) return;

    const input = {
      title: editTitle.trim(),
      description: editDescription.trim(),
    };

    const parsed = updateProphecySchema.safeParse(input);
    if (!parsed.success) {
      const titleErr = parsed.error.errors.find((e) => e.path[0] === 'title');
      setEditTitleError(titleErr?.message);
      return;
    }

    setEditTitleError(undefined);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/prophecies/${editingProphecy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }

      const { prophecy } = await res.json();
      setProphecies((prev) =>
        prev.map((p) => (p.id === editingProphecy.id ? { ...p, ...prophecy } : p))
      );
      showSuccessToast('Prophezeiung aktualisiert');
      setEditingProphecy(null);
      setEditTitle('');
      setEditDescription('');
      setEditTitleError(undefined);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingProphecy, editTitle, editDescription]);

  const handleRateProphecy = useCallback(async (prophecyId: string, value: number) => {
    try {
      const res = await fetch(`/api/prophecies/${prophecyId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Bewerten');
      }

      const { prophecy } = await res.json();
      setProphecies((prev) =>
        prev.map((p) =>
          p.id === prophecyId
            ? {
                ...p,
                averageRating: prophecy.averageRating,
                ratingCount: prophecy.ratingCount,
                userRating: value,
              }
            : p
        )
      );
      showSuccessToast('Bewertung gespeichert');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  }, []);

  const toRateCount = useMemo(() => prophecies.filter((p) => !p.isOwn && p.userRating === null).length, [prophecies]);

  const myCount = useMemo(() => prophecies.filter((p) => p.isOwn).length, [prophecies]);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <BackLink href="/">Zurück zur Übersicht</BackLink>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{round.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <RoundStatusBadge round={round} variant="full" />
          </div>
        </div>

        {isSubmissionOpen && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <div className="flex flex-row gap-2 items-center">
              <IconPlus size={18} />
              <span>Neue Prophezeiung</span>
            </div>
          </Button>
        )}
      </div>

      {/* Deadlines Info */}
      <Card padding="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-(--text-muted)">Einreichung bis:</span>
            <p className="text-white font-medium">{formatDate(round.submissionDeadline)}</p>
          </div>
          <div>
            <span className="text-(--text-muted)">Bewertung bis:</span>
            <p className="text-white font-medium">{formatDate(round.ratingDeadline)}</p>
          </div>
          <div>
            <span className="text-(--text-muted)">Stichtag:</span>
            <p className="text-white font-medium">{formatDate(round.fulfillmentDate)}</p>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <IconFilter size={18} className="text-(--text-muted)" />
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          Alle ({prophecies.length})
        </FilterButton>
        <FilterButton active={filter === 'mine'} onClick={() => setFilter('mine')}>
          Meine ({myCount})
        </FilterButton>
        {isRatingOpen && (
          <FilterButton active={filter === 'toRate'} onClick={() => setFilter('toRate')}>
            Noch zu bewerten ({toRateCount})
          </FilterButton>
        )}
      </div>

      {/* Prophecies List */}
      <div className="space-y-4">
        {filteredProphecies.length === 0 ? (
          <EmptyState message={getEmptyStateMessage(filter)} />
        ) : (
          filteredProphecies.map((prophecy) => (
            <ProphecyCard
              key={prophecy.id}
              prophecy={prophecy}
              isSubmissionOpen={isSubmissionOpen}
              isRatingOpen={isRatingOpen}
              onEdit={handleStartEdit}
              onDelete={handleConfirmDelete}
              onRate={handleRateProphecy}
              isDeleting={deletingId === prophecy.id}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      <Modal
        opened={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTitleError(undefined);
        }}
        title="Neue Prophezeiung"
        size="lg"
      >
        <div className="space-y-4">
          <TextInput
            label="Titel"
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value);
              if (titleError) setTitleError(undefined);
            }}
            placeholder="z.B. Deutschland wird Weltmeister"
            required
            error={titleError}
          />
          <Textarea
            id="prophecy-description"
            label="Beschreibung"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Beschreibe deine Prophezeiung genauer..."
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setIsCreateModalOpen(false);
              setTitleError(undefined);
            }}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button onClick={handleCreateProphecy} disabled={isSubmitting || !newTitle.trim()}>
            {isSubmitting ? 'Erstellen...' : 'Erstellen'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        opened={!!confirmDeleteProphecy}
        onClose={() => setConfirmDeleteProphecy(null)}
        onConfirm={handleDeleteProphecy}
        title="Prophezeiung löschen?"
        confirmText="Löschen"
        confirmingText="Löschen..."
        isSubmitting={deletingId !== null}
        variant="danger"
      >
        <p className="mb-2">Möchtest du diese Prophezeiung wirklich löschen?</p>
        {confirmDeleteProphecy && (
          <p className="text-white font-medium mb-4">
            &quot;{confirmDeleteProphecy.title}&quot;
          </p>
        )}
        <p className="text-sm">Diese Aktion kann nicht rückgängig gemacht werden.</p>
      </ConfirmModal>

      {/* Edit Modal */}
      <Modal
        opened={!!editingProphecy}
        onClose={() => {
          setEditingProphecy(null);
          setEditTitleError(undefined);
        }}
        title="Prophezeiung bearbeiten"
        size="lg"
      >
        <div className="space-y-4">
          <TextInput
            label="Titel"
            value={editTitle}
            onChange={(e) => {
              setEditTitle(e.target.value);
              if (editTitleError) setEditTitleError(undefined);
            }}
            placeholder="z.B. Deutschland wird Weltmeister"
            required
            error={editTitleError}
          />
          <Textarea
            id="edit-prophecy-description"
            label="Beschreibung"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Beschreibe deine Prophezeiung genauer..."
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setEditingProphecy(null);
              setEditTitleError(undefined);
            }}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button onClick={handleEditProphecy} disabled={isSubmitting || !editTitle.trim()}>
            {isSubmitting ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </Modal>
    </div>
  );
});

interface ProphecyCardProps {
  prophecy: Prophecy;
  isSubmissionOpen: boolean;
  isRatingOpen: boolean;
  onEdit: (prophecy: Prophecy) => void;
  onDelete: (id: string) => void;
  onRate: (id: string, value: number) => void;
  isDeleting: boolean;
}

const ProphecyCard = memo(function ProphecyCard({
  prophecy,
  isSubmissionOpen,
  isRatingOpen,
  onEdit,
  onDelete,
  onRate,
  isDeleting,
}: Readonly<ProphecyCardProps>) {
  const [localRating, setLocalRating] = useState<number>(prophecy.userRating ?? 0);
  const [hasChanged, setHasChanged] = useState(false);

  const handleRatingChange = useCallback((value: number) => {
    setLocalRating(value);
    setHasChanged(true);
  }, []);

  const handleSaveRating = useCallback(() => {
    onRate(prophecy.id, localRating);
    setHasChanged(false);
  }, [onRate, prophecy.id, localRating]);

  const creatorName = prophecy.creator.displayName || prophecy.creator.username;

  return (
    <Card padding="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-semibold text-white">{prophecy.title}</h3>
            {prophecy.isOwn && (
              <GlowBadge size="sm" color="violet">
                Meine
              </GlowBadge>
            )}
          </div>
          <p className="text-sm text-(--text-secondary) mb-3">{prophecy.description}</p>
          <div className="flex items-center gap-4 text-xs text-(--text-muted)">
            <span className="flex items-center gap-1.5">
              <UserAvatar
                username={prophecy.creator.username}
                displayName={prophecy.creator.displayName}
                size="sm"
              />
              <span>von {creatorName}</span>
            </span>
            <span>{formatDate(prophecy.createdAt, 'date')}</span>
            {prophecy.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-cyan-400">
                  {prophecy.averageRating === null ? '—' : prophecy.averageRating.toFixed(1)}
                </span>
                <span>({prophecy.ratingCount} Bewertungen)</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {prophecy.isOwn && isSubmissionOpen && (
            <>
              <IconActionButton
                variant="edit"
                icon={<IconEdit size={18} />}
                onClick={() => onEdit(prophecy)}
                title="Bearbeiten"
              />
              <IconActionButton
                variant="delete"
                icon={<IconTrash size={18} />}
                onClick={() => onDelete(prophecy.id)}
                disabled={isDeleting}
                title="Löschen"
              />
            </>
          )}
        </div>
      </div>

      {/* Rating Section */}
      {isRatingOpen && !prophecy.isOwn && (
        <div className="mt-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
            <div className="flex-1">
              <RatingSlider
                value={localRating}
                onChange={handleRatingChange}
                label={prophecy.userRating === null ? 'Bewerte diese Prophezeiung' : 'Deine Bewertung'}
                min={-10}
                max={10}
              />
            </div>
            {hasChanged && (
              <Button onClick={handleSaveRating} className="text-sm px-3 py-1.5 md:mb-1 w-full md:w-auto">
                Speichern
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Show user's rating when rating is closed */}
      {!isRatingOpen && prophecy.userRating !== null && (
        <div className="mt-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <p className="text-sm text-(--text-muted)">
            Deine Bewertung:{' '}
            <span className="text-cyan-400 font-medium">
              {prophecy.userRating > 0 ? `+${prophecy.userRating}` : prophecy.userRating}
            </span>
          </p>
        </div>
      )}
    </Card>
  );
});
