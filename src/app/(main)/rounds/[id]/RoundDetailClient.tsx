'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { TextInput } from '@/components/TextInput';
import { GlowBadge } from '@/components/GlowBadge';
import { RoundStatusBadge } from '@/components/RoundStatusBadge';
import { RatingSlider } from '@/components/RatingSlider';
import { GlassScaleBar } from '@/components/GlassScaleBar';
import { showSuccessToast, showErrorToast } from '@/lib/toast/toast';
import { createProphecySchema, updateProphecySchema } from '@/lib/schemas/prophecy';
import { IconPlus, IconTrash, IconEdit, IconFilter } from '@tabler/icons-react';
import { BackLink } from '@/components/BackLink';
import { EmptyState } from '@/components/EmptyState';
import { Textarea } from '@/components/Textarea';
import { IconActionButton } from '@/components/IconActionButton';
import { FilterButton } from '@/components/FilterButton';
import { UserAvatar } from '@/components/UserAvatar';
import { CountdownTimer } from '@/components/CountdownTimer';
import { formatDate } from '@/lib/formatting/date';
import { useUser, useCurrentUser } from '@/hooks/useUser';
import { useProphecyStore, type Prophecy } from '@/store/useProphecyStore';
import { useRatingStore, selectUserRatingForProphecy } from '@/store/useRatingStore';

interface Round {
  id: string;
  title: string;
  submissionDeadline: string;
  ratingDeadline: string;
  fulfillmentDate: string;
}

interface RoundDetailClientProps {
  round: Round;
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
}: Readonly<RoundDetailClientProps>) {
  const currentUser = useCurrentUser();
  const currentUserId = currentUser?.id;

  // Get prophecies for this round from store
  const prophecies = useProphecyStore(
    useShallow((state) => Object.values(state.prophecies).filter((p) => p.roundId === round.id))
  );

  // Sort prophecies by createdAt descending
  const sortedProphecies = useMemo(
    () =>
      [...prophecies].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [prophecies]
  );

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
  const [confirmEditProphecy, setConfirmEditProphecy] = useState<Prophecy | null>(null);

  const now = useMemo(() => new Date(), []);
  const submissionDeadline = useMemo(
    () => new Date(round.submissionDeadline),
    [round.submissionDeadline]
  );
  const ratingDeadline = useMemo(() => new Date(round.ratingDeadline), [round.ratingDeadline]);

  const isSubmissionOpen = now < submissionDeadline;
  const isRatingOpen = now >= submissionDeadline && now < ratingDeadline;

  // Get user's ratings from store
  const getUserRating = useCallback(
    (prophecyId: string) => {
      if (!currentUserId) return null;
      const rating = useRatingStore
        .getState()
        .ratingsByProphecy[prophecyId]?.find((r) => r.userId === currentUserId);
      return rating?.value ?? null;
    },
    [currentUserId]
  );

  const filteredProphecies = useMemo(() => {
    switch (filter) {
      case 'mine':
        return sortedProphecies.filter((p) => p.creatorId === currentUserId);
      case 'toRate':
        return sortedProphecies.filter(
          (p) => p.creatorId !== currentUserId && getUserRating(p.id) === null
        );
      default:
        return sortedProphecies;
    }
  }, [sortedProphecies, filter, currentUserId, getUserRating]);

  const { setProphecy, removeProphecy } = useProphecyStore();
  const { setRating } = useRatingStore();

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
      setProphecy(prophecy);
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
  }, [round.id, newTitle, newDescription, setProphecy]);

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

      removeProphecy(id);
      showSuccessToast('Prophezeiung gelöscht');
      setConfirmDeleteProphecy(null);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setDeletingId(null);
    }
  }, [confirmDeleteProphecy, removeProphecy]);

  const handleConfirmDelete = useCallback(
    (id: string) => {
      const prophecy = sortedProphecies.find((p) => p.id === id);
      if (prophecy) {
        setConfirmDeleteProphecy(prophecy);
      }
    },
    [sortedProphecies]
  );

  const openEditModal = useCallback((prophecy: Prophecy) => {
    setEditingProphecy(prophecy);
    setEditTitle(prophecy.title);
    setEditDescription(prophecy.description);
    setEditTitleError(undefined);
  }, []);

  const handleStartEdit = useCallback(
    (prophecy: Prophecy) => {
      if (prophecy.ratingCount > 0) {
        setConfirmEditProphecy(prophecy);
      } else {
        openEditModal(prophecy);
      }
    },
    [openEditModal]
  );

  const handleConfirmEdit = useCallback(() => {
    if (confirmEditProphecy) {
      openEditModal(confirmEditProphecy);
      setConfirmEditProphecy(null);
    }
  }, [confirmEditProphecy, openEditModal]);

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
      setProphecy(prophecy);
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
  }, [editingProphecy, editTitle, editDescription, setProphecy]);

  const handleRateProphecy = useCallback(
    async (prophecyId: string, value: number) => {
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

        const { prophecy, rating } = await res.json();
        // Update prophecy with new average
        setProphecy(prophecy);
        // Update rating in store
        if (rating) {
          setRating(rating);
        }
        showSuccessToast('Bewertung gespeichert');
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
      }
    },
    [setProphecy, setRating]
  );

  const toRateCount = useMemo(
    () =>
      sortedProphecies.filter((p) => p.creatorId !== currentUserId && getUserRating(p.id) === null)
        .length,
    [sortedProphecies, currentUserId, getUserRating]
  );

  const myCount = useMemo(
    () => sortedProphecies.filter((p) => p.creatorId === currentUserId).length,
    [sortedProphecies, currentUserId]
  );

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
            <CountdownTimer deadline={round.submissionDeadline} />
          </div>
          <div>
            <span className="text-(--text-muted)">Bewertung bis:</span>
            <p className="text-white font-medium">{formatDate(round.ratingDeadline)}</p>
            <CountdownTimer deadline={round.ratingDeadline} />
          </div>
          <div>
            <span className="text-(--text-muted)">Stichtag:</span>
            <p className="text-white font-medium">{formatDate(round.fulfillmentDate)}</p>
            <CountdownTimer deadline={round.fulfillmentDate} />
          </div>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <IconFilter size={18} className="text-(--text-muted)" />
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          Alle ({sortedProphecies.length})
        </FilterButton>
        <FilterButton active={filter === 'mine'} onClick={() => setFilter('mine')}>
          Meine ({myCount})
        </FilterButton>
        {(isSubmissionOpen || isRatingOpen) && (
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
              currentUserId={currentUserId}
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
          <p className="text-white font-medium mb-4">&quot;{confirmDeleteProphecy.title}&quot;</p>
        )}
        <p className="text-sm">Diese Aktion kann nicht rückgängig gemacht werden.</p>
      </ConfirmModal>

      {/* Edit Confirmation Modal (only shown when prophecy has ratings) */}
      <ConfirmModal
        opened={!!confirmEditProphecy}
        onClose={() => setConfirmEditProphecy(null)}
        onConfirm={handleConfirmEdit}
        title="Prophezeiung bearbeiten?"
        confirmText="Trotzdem bearbeiten"
        variant="warning"
      >
        <p className="mb-2">Diese Prophezeiung hat bereits Bewertungen erhalten.</p>
        {confirmEditProphecy && (
          <p className="text-white font-medium mb-4">
            {confirmEditProphecy.ratingCount}{' '}
            {confirmEditProphecy.ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}
          </p>
        )}
        <p className="text-sm">Beim Speichern werden alle Bewertungen gelöscht.</p>
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
  currentUserId: string | undefined;
  isSubmissionOpen: boolean;
  isRatingOpen: boolean;
  onEdit: (prophecy: Prophecy) => void;
  onDelete: (id: string) => void;
  onRate: (id: string, value: number) => void;
  isDeleting: boolean;
}

const ProphecyCard = memo(function ProphecyCard({
  prophecy,
  currentUserId,
  isSubmissionOpen,
  isRatingOpen,
  onEdit,
  onDelete,
  onRate,
  isDeleting,
}: Readonly<ProphecyCardProps>) {
  // Get user's rating for this prophecy from store
  const userRatingSelector = useMemo(
    () =>
      currentUserId ? selectUserRatingForProphecy(prophecy.id, currentUserId) : () => undefined,
    [prophecy.id, currentUserId]
  );
  const userRating = useRatingStore(userRatingSelector);

  const [localRating, setLocalRating] = useState<number | null>(null);

  // Compute displayed rating: use local if changed, otherwise store value
  const displayedRating = localRating ?? userRating?.value ?? 0;
  const hasChanged = localRating !== null && localRating !== (userRating?.value ?? 0);

  const handleRatingChange = useCallback((value: number) => {
    setLocalRating(value);
  }, []);

  const handleSaveRating = useCallback(() => {
    if (localRating !== null) {
      onRate(prophecy.id, localRating);
      setLocalRating(null); // Reset to sync with store
    }
  }, [onRate, prophecy.id, localRating]);

  // Get creator from user store
  const creator = useUser(prophecy.creatorId);
  const creatorName = creator?.displayName || creator?.username || 'Unbekannt';

  const isOwn = prophecy.creatorId === currentUserId;

  return (
    <Card padding="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-semibold text-white">{prophecy.title}</h3>
            {isOwn && (
              <GlowBadge size="sm" color="violet">
                Meine
              </GlowBadge>
            )}
          </div>
          <p className="text-sm text-(--text-secondary) mb-3">{prophecy.description}</p>
          <div className="flex items-center gap-4 text-xs text-(--text-muted)">
            <span className="flex items-center gap-1.5">
              <UserAvatar userId={prophecy.creatorId} size="sm" />
              <span>von {creatorName}</span>
            </span>
            <span>{formatDate(prophecy.createdAt, 'date')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {isOwn && isSubmissionOpen && (
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

      {/* Average Rating Display */}
      {prophecy.ratingCount > 0 && prophecy.averageRating !== null && (
        <div className="mt-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-3 text-(--text-secondary)">
                Durchschnitt ({prophecy.ratingCount}{' '}
                {prophecy.ratingCount === 1 ? 'Bewertung' : 'Bewertungen'})
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-(--text-muted) w-6">-10</span>
                <div className="relative flex-1">
                  <GlassScaleBar value={prophecy.averageRating} thickness={16} />
                </div>
                <span className="text-xs text-(--text-muted) w-6">+10</span>
                <span
                  className="text-lg font-bold w-10 text-right"
                  style={{
                    color: prophecy.averageRating >= 0 ? '#22d3ee' : '#a855f7',
                    textShadow: `0 0 15px ${prophecy.averageRating >= 0 ? '#22d3ee40' : '#a855f740'}`,
                  }}
                >
                  {prophecy.averageRating > 0 ? '+' : ''}
                  {prophecy.averageRating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Section */}
      {(isSubmissionOpen || isRatingOpen) && !isOwn && (
        <div className="mt-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
            <div className="flex-1">
              <RatingSlider
                value={displayedRating}
                onChange={handleRatingChange}
                label={userRating ? 'Deine Bewertung' : 'Bewerte diese Prophezeiung'}
                min={-10}
                max={10}
              />
            </div>
            {hasChanged && (
              <Button
                onClick={handleSaveRating}
                className="text-sm px-3 py-1.5 md:mb-1 w-full md:w-auto"
              >
                Speichern
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Show user's rating when rating is closed */}
      {!isSubmissionOpen && !isRatingOpen && userRating && (
        <div className="mt-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <p className="text-sm text-(--text-muted)">
            Deine Bewertung:{' '}
            <span className="text-cyan-400 font-medium">
              {userRating.value > 0 ? `+${userRating.value}` : userRating.value}
            </span>
          </p>
        </div>
      )}
    </Card>
  );
});
