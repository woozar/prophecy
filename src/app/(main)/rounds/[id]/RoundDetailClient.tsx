'use client';

import { memo, useCallback, useMemo, useState } from 'react';

import {
  IconChartBar,
  IconCheck,
  IconDownload,
  IconEdit,
  IconFilter,
  IconHistory,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';

import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CountdownTimer } from '@/components/CountdownTimer';
import { EmptyState } from '@/components/EmptyState';
import { FilterButton } from '@/components/FilterButton';
import { FormattedText } from '@/components/FormattedText';
import { GlowBadge } from '@/components/GlowBadge';
import { IconActionButton } from '@/components/IconActionButton';
import { type IndividualRating, IndividualRatingsBox } from '@/components/IndividualRatingsBox';
import { Modal } from '@/components/Modal';
import { ProphecyAuditModal } from '@/components/ProphecyAuditModal';
import { RatingDisplay } from '@/components/RatingDisplay';
import { RatingSlider } from '@/components/RatingSlider';
import { RoundStatusBadge } from '@/components/RoundStatusBadge';
import { TextInput } from '@/components/TextInput';
import { Textarea } from '@/components/Textarea';
import { UserAvatar } from '@/components/UserAvatar';
import { useExportRound } from '@/hooks/useExportRound';
import { useCurrentUser, useUser } from '@/hooks/useUser';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/formatting/date';
import { createProphecySchema, updateProphecySchema } from '@/lib/schemas/prophecy';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { type Prophecy, useProphecyStore } from '@/store/useProphecyStore';
import { type Rating, selectUserRatingForProphecy, useRatingStore } from '@/store/useRatingStore';
import { type Round } from '@/store/useRoundStore';
import { useUserStore } from '@/store/useUserStore';

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
  const [auditProphecyId, setAuditProphecyId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const submissionDeadline = useMemo(
    () => new Date(round.submissionDeadline),
    [round.submissionDeadline]
  );
  const ratingDeadline = useMemo(() => new Date(round.ratingDeadline), [round.ratingDeadline]);

  const isSubmissionOpen = now < submissionDeadline;
  const isRatingOpen = now >= submissionDeadline && now < ratingDeadline;
  const isRatingClosed = now >= ratingDeadline;
  const isAdmin = currentUser?.role === 'ADMIN';
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const { exportRound, isExporting } = useExportRound();

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
      const { data, error } = await apiClient.prophecies.create(parsed.data);

      if (error) {
        throw new Error((error as { error?: string }).error || 'Fehler beim Erstellen');
      }

      if (data.prophecy) {
        setProphecy(data.prophecy);
      }
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
      const { error } = await apiClient.prophecies.delete(id);

      if (error) {
        throw new Error((error as { error?: string }).error || 'Fehler beim Löschen');
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
    setEditDescription(prophecy.description ?? '');
    setEditTitleError(undefined);
  }, []);

  const handleStartEdit = useCallback(
    (prophecy: Prophecy) => {
      // Check if prophecy has ratings from the rating store
      const prophecyRatings = useRatingStore.getState().ratingsByProphecy[prophecy.id] || [];
      const hasRatings = prophecyRatings.some((r) => r.value !== 0);
      if (hasRatings) {
        setConfirmEditProphecy(prophecy);
      } else {
        openEditModal(prophecy);
      }
    },
    [openEditModal]
  );

  // Get rating count for the prophecy being confirmed for edit
  const confirmEditRatingCount = useMemo(() => {
    if (!confirmEditProphecy) return 0;
    const ratings = useRatingStore.getState().ratingsByProphecy[confirmEditProphecy.id] || [];
    return ratings.filter((r: Rating) => r.value !== 0).length;
  }, [confirmEditProphecy]);

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
      const { data, error } = await apiClient.prophecies.update(editingProphecy.id, parsed.data);

      if (error) {
        throw new Error((error as { error?: string }).error || 'Fehler beim Aktualisieren');
      }

      if (data.prophecy) {
        setProphecy(data.prophecy);
      }
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
        const { data, error } = await apiClient.prophecies.rate(prophecyId, value);

        if (error) {
          throw new Error((error as { error?: string }).error || 'Fehler beim Bewerten');
        }

        // Update prophecy in store if API returns it
        if (data.prophecy) {
          setProphecy(data.prophecy);
        }
        // Update rating in store
        if (data.rating) {
          setRating(data.rating);
        }
        showSuccessToast('Bewertung gespeichert');
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
      }
    },
    [setProphecy, setRating]
  );

  const handleResolveProphecy = useCallback(
    async (prophecyId: string, fulfilled: boolean) => {
      try {
        const { data, error } = await apiClient.prophecies.resolve(prophecyId, fulfilled);

        if (error) {
          throw new Error((error as { error?: string }).error || 'Fehler beim Auflösen');
        }

        if (data.prophecy) {
          setProphecy(data.prophecy);
        }
        showSuccessToast(fulfilled ? 'Als erfüllt markiert' : 'Als nicht erfüllt markiert');
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
      }
    },
    [setProphecy]
  );

  const handlePublishResults = useCallback(async () => {
    setIsPublishing(true);
    try {
      const { error } = await apiClient.rounds.publishResults(round.id);

      if (error) {
        throw new Error((error as { error?: string }).error || 'Fehler beim Veröffentlichen');
      }

      showSuccessToast('Ergebnisse veröffentlicht');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsPublishing(false);
    }
  }, [round.id]);

  const handleUnpublishResults = useCallback(async () => {
    setIsUnpublishing(true);
    try {
      const { error } = await apiClient.rounds.unpublishResults(round.id);

      if (error) {
        throw new Error((error as { error?: string }).error || 'Fehler beim Zurückziehen');
      }

      showSuccessToast('Freigabe aufgehoben');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsUnpublishing(false);
    }
  }, [round.id]);

  const handleShowAudit = useCallback((prophecyId: string) => {
    setAuditProphecyId(prophecyId);
  }, []);

  const handleCloseAudit = useCallback(() => {
    setAuditProphecyId(null);
  }, []);

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

  // Check if all prophecies are resolved
  const allResolved = useMemo(
    () => sortedProphecies.length > 0 && sortedProphecies.every((p) => p.fulfilled !== null),
    [sortedProphecies]
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

        <div className="flex flex-wrap gap-2 self-end sm:self-auto">
          {isSubmissionOpen && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <div className="flex flex-row gap-2 items-center">
                <IconPlus size={18} />
                <span>Neue Prophezeiung</span>
              </div>
            </Button>
          )}

          {/* Results Link - visible when results are published or for admins as preview */}
          {(round.resultsPublishedAt || (isAdmin && isRatingClosed)) && (
            <Button
              variant="outline"
              onClick={() => (globalThis.location.href = `/rounds/${round.id}/results`)}
            >
              <div className="flex flex-row gap-2 items-center">
                <IconChartBar size={18} />
                <span>{round.resultsPublishedAt ? 'Ergebnisse' : 'Vorschau'}</span>
              </div>
            </Button>
          )}

          {/* Publish Button - Admin only, after rating deadline */}
          {isAdmin && isRatingClosed && !round.resultsPublishedAt && (
            <Button
              onClick={handlePublishResults}
              disabled={isPublishing || !allResolved}
              title={allResolved ? undefined : 'Noch nicht alle Prophezeiungen ausgewertet'}
            >
              <div className="flex flex-row gap-2 items-center">
                <IconLockOpen size={18} />
                <span>{isPublishing ? 'Veröffentlichen...' : 'Ergebnisse freigeben'}</span>
              </div>
            </Button>
          )}

          {/* Unpublish Button - Admin only, when results are published */}
          {isAdmin && round.resultsPublishedAt && (
            <Button variant="outline" onClick={handleUnpublishResults} disabled={isUnpublishing}>
              <div className="flex flex-row gap-2 items-center">
                <IconLock size={18} />
                <span>{isUnpublishing ? 'Wird zurückgezogen...' : 'Freigabe aufheben'}</span>
              </div>
            </Button>
          )}

          {/* Export Button - Admin only */}
          {isAdmin && (
            <Button variant="outline" onClick={() => exportRound(round.id)} disabled={isExporting}>
              <div className="flex flex-row gap-2 items-center">
                <IconDownload size={18} />
                <span>
                  {isExporting ? (
                    'Exportieren...'
                  ) : (
                    <>
                      <span lang="en">Excel</span> Export
                    </>
                  )}
                </span>
              </div>
            </Button>
          )}
        </div>
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
              isRatingClosed={isRatingClosed}
              isAdmin={isAdmin}
              resultsPublished={!!round.resultsPublishedAt}
              onEdit={handleStartEdit}
              onDelete={handleConfirmDelete}
              onRate={handleRateProphecy}
              onResolve={handleResolveProphecy}
              onShowAudit={handleShowAudit}
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
          <p className="text-xs text-gray-400 mt-1">
            Formatierung: *fett*, _unterstrichen_, -durchgestrichen- · Zeilen mit * oder - am
            Anfang werden als Liste dargestellt
          </p>
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
        <p className="mb-2">
          {`Diese Prophezeiung hat bereits ${confirmEditRatingCount} ${confirmEditRatingCount === 1 ? 'Bewertung' : 'Bewertungen'} erhalten.`}
        </p>
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
          <p className="text-xs text-gray-400 mt-1">
            Formatierung: *fett*, _unterstrichen_, -durchgestrichen- · Zeilen mit * oder - am
            Anfang werden als Liste dargestellt
          </p>
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

      {/* Audit Log Modal */}
      <ProphecyAuditModal
        prophecyId={auditProphecyId}
        prophecyTitle={
          auditProphecyId
            ? sortedProphecies.find((p) => p.id === auditProphecyId)?.title
            : undefined
        }
        onClose={handleCloseAudit}
      />
    </div>
  );
});

interface ProphecyCardProps {
  prophecy: Prophecy;
  currentUserId: string | undefined;
  isSubmissionOpen: boolean;
  isRatingOpen: boolean;
  isRatingClosed: boolean;
  isAdmin: boolean;
  resultsPublished: boolean;
  onEdit: (prophecy: Prophecy) => void;
  onDelete: (id: string) => void;
  onRate: (id: string, value: number) => void;
  onResolve: (id: string, fulfilled: boolean) => void;
  onShowAudit: (id: string) => void;
  isDeleting: boolean;
}

const ProphecyCard = memo(function ProphecyCard({
  prophecy,
  currentUserId,
  isSubmissionOpen,
  isRatingOpen,
  isRatingClosed,
  isAdmin,
  resultsPublished,
  onEdit,
  onDelete,
  onRate,
  onResolve,
  onShowAudit,
  isDeleting,
}: Readonly<ProphecyCardProps>) {
  // Get user's rating for this prophecy from store
  const userRatingSelector = useMemo(
    () =>
      currentUserId ? selectUserRatingForProphecy(prophecy.id, currentUserId) : () => undefined,
    [prophecy.id, currentUserId]
  );
  const userRating = useRatingStore(userRatingSelector);

  // Get all ratings for this prophecy (for individual ratings display)
  const allRatings = useRatingStore(
    useShallow((state) => state.ratingsByProphecy[prophecy.id] || [])
  );

  // Get all users for mapping ratings to user data
  const users = useUserStore(useShallow((state) => state.users));

  // Calculate rating count and average from ratings (excluding zero values and bots)
  const { ratingCount, averageRating } = useMemo(() => {
    const nonZeroRatings = allRatings.filter((r) => r.value !== 0);
    const humanRatings = nonZeroRatings.filter((r) => !users[r.userId]?.isBot);
    const count = nonZeroRatings.length;
    const avg =
      humanRatings.length > 0
        ? humanRatings.reduce((sum, r) => sum + r.value, 0) / humanRatings.length
        : null;
    return { ratingCount: count, averageRating: avg };
  }, [allRatings, users]);

  const [localRating, setLocalRating] = useState<number | null>(null);

  // Compute displayed rating: use local if changed, otherwise store value
  const displayedRating = localRating ?? userRating?.value ?? 0;

  const handleRatingChange = useCallback((value: number) => {
    setLocalRating(value);
  }, []);

  const handleSaveRating = useCallback(
    (value: number) => {
      onRate(prophecy.id, value);
    },
    [onRate, prophecy.id]
  );

  // Get creator from user store
  const creator = useUser(prophecy.creatorId);
  const creatorName = creator?.displayName || creator?.username || 'Unbekannt';

  const isOwn = prophecy.creatorId === currentUserId;

  // Visibility: Author always sees average, others only after rating period
  const showAverage = isOwn || isRatingClosed;

  // Build individual ratings list for display (only when rating is closed)
  const individualRatings: IndividualRating[] = useMemo(() => {
    if (!isRatingClosed) return [];

    return allRatings
      .filter((r) => r.value !== 0) // Filter out zero ratings (unrated)
      .map((rating) => {
        const user = users[rating.userId];
        return {
          id: rating.id,
          userId: rating.userId,
          value: rating.value,
          username: user?.username || 'Unbekannt',
          displayName: user?.displayName || null,
          avatarUrl: user?.avatarUrl,
          isBot: user?.isBot || false,
        };
      });
  }, [isRatingClosed, allRatings, users]);

  return (
    <Card padding="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-semibold text-cyan-400">{prophecy.title}</h3>
            {isOwn && (
              <GlowBadge size="sm" color="violet">
                Meine
              </GlowBadge>
            )}
            {prophecy.fulfilled === true && (
              <GlowBadge size="sm" color="cyan">
                Erfüllt
              </GlowBadge>
            )}
            {prophecy.fulfilled === false && (
              <GlowBadge size="sm" color="red">
                Nicht erfüllt
              </GlowBadge>
            )}
          </div>
          {prophecy.description && (
            <FormattedText
              text={prophecy.description}
              className="text-sm text-(--text-secondary) mb-3"
            />
          )}
          <div className="flex items-center gap-4 text-xs text-(--text-muted)">
            <span className="flex items-center gap-1.5">
              <UserAvatar userId={prophecy.creatorId} size="sm" clickable />
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
          {isAdmin && isRatingClosed && !resultsPublished && (
            <div className="flex gap-1">
              <button
                onClick={() => onResolve(prophecy.id, true)}
                className={`p-1.5 rounded-md transition-all ${
                  prophecy.fulfilled === true
                    ? 'bg-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                    : 'bg-white/5 text-(--text-muted) hover:bg-cyan-500/20 hover:text-cyan-400'
                }`}
                title="Als erfüllt markieren"
              >
                <IconCheck size={18} />
              </button>
              <button
                onClick={() => onResolve(prophecy.id, false)}
                className={`p-1.5 rounded-md transition-all ${
                  prophecy.fulfilled === false
                    ? 'bg-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                    : 'bg-white/5 text-(--text-muted) hover:bg-red-500/20 hover:text-red-400'
                }`}
                title="Als nicht erfüllt markieren"
              >
                <IconX size={18} />
              </button>
            </div>
          )}
          <IconActionButton
            variant="default"
            icon={<IconHistory size={18} />}
            onClick={() => onShowAudit(prophecy.id)}
            title="Änderungsverlauf anzeigen"
          />
        </div>
      </div>

      {/* Rating Count and Average Display */}
      {ratingCount > 0 && (
        <div className="mt-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <RatingDisplay
            value={averageRating ?? 0}
            ratingCount={ratingCount}
            showAverage={showAverage}
          />
          {/* Individual ratings (only visible after rating period) */}
          {isRatingClosed && individualRatings.length > 0 && (
            <IndividualRatingsBox ratings={individualRatings} currentUserId={currentUserId} />
          )}
        </div>
      )}

      {/* Rating Section */}
      {(isSubmissionOpen || isRatingOpen) && !isOwn && (
        <div className="mt-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <RatingSlider
            value={displayedRating}
            onChange={handleRatingChange}
            label={userRating ? 'Deine Bewertung' : 'Bewerte diese Prophezeiung'}
            min={-10}
            max={10}
            savedValue={userRating?.value ?? 0}
            onSave={handleSaveRating}
          />
        </div>
      )}
    </Card>
  );
});
