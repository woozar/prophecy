'use client';

import { memo, useCallback, useMemo, useState } from 'react';

import { IconCalendar, IconDownload, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { DateTimePicker } from '@/components/DateTimePicker';
import { IconActionButton } from '@/components/IconActionButton';
import { Modal } from '@/components/Modal';
import { RoundStatusBadge } from '@/components/RoundStatusBadge';
import { TextInput } from '@/components/TextInput';
import { useExportRound } from '@/hooks/useExportRound';
import { createRoundSchema, updateRoundSchema } from '@/lib/schemas/round';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { useProphecyStore } from '@/store/useProphecyStore';
import { type Round, useRoundStore } from '@/store/useRoundStore';

export const RoundsManager = memo(function RoundsManager() {
  const rounds = useRoundStore(
    useShallow((state) =>
      Object.values(state.rounds).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    )
  );
  const prophecies = useProphecyStore(useShallow((state) => state.prophecies));
  const { removeRound } = useRoundStore();

  const getProphecyCount = useCallback(
    (roundId: string) => Object.values(prophecies).filter((p) => p.roundId === roundId).length,
    [prophecies]
  );
  const { exportRound, exportingRoundId } = useExportRound();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState<Date | null>(null);
  const [ratingDeadline, setRatingDeadline] = useState<Date | null>(null);
  const [fulfillmentDate, setFulfillmentDate] = useState<Date | null>(null);

  // Form errors
  interface FormErrors {
    title?: string;
    submissionDeadline?: string;
    ratingDeadline?: string;
    fulfillmentDate?: string;
  }
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const resetForm = useCallback(() => {
    setTitle('');
    setSubmissionDeadline(null);
    setRatingDeadline(null);
    setFulfillmentDate(null);
    setFormErrors({});
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsCreateModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((round: Round) => {
    setTitle(round.title);
    setSubmissionDeadline(new Date(round.submissionDeadline));
    setRatingDeadline(new Date(round.ratingDeadline));
    setFulfillmentDate(new Date(round.fulfillmentDate));
    setEditingRound(round);
  }, []);

  const closeModals = useCallback(() => {
    setIsCreateModalOpen(false);
    setEditingRound(null);
    setDeletingRoundId(null);
    resetForm();
  }, [resetForm]);

  const validateAndSubmit = useCallback(
    async (
      schema: typeof createRoundSchema | typeof updateRoundSchema,
      url: string,
      method: 'POST' | 'PUT',
      successMessage: string,
      errorMessage: string
    ) => {
      const input = {
        title: title.trim(),
        submissionDeadline,
        ratingDeadline,
        fulfillmentDate,
      };

      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        const errors: FormErrors = {};
        for (const err of parsed.error.errors) {
          const field = err.path[0] as keyof FormErrors;
          if (!errors[field]) errors[field] = err.message;
        }
        setFormErrors(errors);
        return;
      }

      setFormErrors({});
      setIsSubmitting(true);
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || errorMessage);
        }

        await res.json();
        showSuccessToast(successMessage);
        closeModals();
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, submissionDeadline, ratingDeadline, fulfillmentDate, closeModals]
  );

  const handleCreate = useCallback(() => {
    return validateAndSubmit(
      createRoundSchema,
      '/api/rounds',
      'POST',
      'Runde erstellt',
      'Fehler beim Erstellen'
    );
  }, [validateAndSubmit]);

  const handleUpdate = useCallback(() => {
    if (!editingRound) return;
    return validateAndSubmit(
      updateRoundSchema,
      `/api/rounds/${editingRound.id}`,
      'PUT',
      'Runde aktualisiert',
      'Fehler beim Aktualisieren'
    );
  }, [editingRound, validateAndSubmit]);

  const handleDelete = useCallback(async () => {
    if (!deletingRoundId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rounds/${deletingRoundId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      removeRound(deletingRoundId);
      showSuccessToast('Runde gelöscht');
      closeModals();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  }, [deletingRoundId, closeModals, removeRound]);

  const submitButtonLabel = useMemo(() => {
    if (isSubmitting) return 'Speichern...';
    return editingRound ? 'Speichern' : 'Erstellen';
  }, [isSubmitting, editingRound]);

  const isFormValid = useMemo(() => {
    return title.trim() && submissionDeadline && ratingDeadline && fulfillmentDate;
  }, [title, submissionDeadline, ratingDeadline, fulfillmentDate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <p className="text-(--text-muted)">
          {rounds.length} Runde{rounds.length === 1 ? '' : 'n'}
        </p>
        <Button onClick={openCreateModal}>
          <div className="flex flex-row gap-2 items-center">
            <IconPlus size={18} />
            <span>Neue Runde</span>
          </div>
        </Button>
      </div>

      {/* Rounds List */}
      <div className="space-y-4">
        {rounds.length === 0 ? (
          <Card padding="p-8">
            <p className="text-center text-(--text-muted)">
              Keine Runden vorhanden. Erstelle die erste Runde!
            </p>
          </Card>
        ) : (
          rounds.map((round) => (
            <Card key={round.id} padding="p-5">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white truncate">{round.title}</h3>
                  <RoundStatusBadge round={round} variant="full" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-(--text-muted)">
                    <IconCalendar size={14} className="text-cyan-400 shrink-0" />
                    <span>Einreichung: {formatDate(round.submissionDeadline)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-(--text-muted)">
                    <IconCalendar size={14} className="text-teal-400 shrink-0" />
                    <span>Bewertung: {formatDate(round.ratingDeadline)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-(--text-muted)">
                    <IconCalendar size={14} className="text-violet-400 shrink-0" />
                    <span>Stichtag: {formatDate(round.fulfillmentDate)}</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-(--text-muted)">
                    {getProphecyCount(round.id)} Prophezeiung(en)
                  </p>
                  <div className="flex flex-row gap-1.5">
                    <IconActionButton
                      variant="export"
                      size="sm"
                      onClick={() => exportRound(round.id)}
                      disabled={exportingRoundId === round.id}
                      title="Excel Export"
                      icon={<IconDownload size={14} />}
                    />
                    <IconActionButton
                      variant="edit"
                      size="sm"
                      onClick={() => openEditModal(round)}
                      title="Bearbeiten"
                      icon={<IconEdit size={14} />}
                    />
                    <IconActionButton
                      variant="delete"
                      size="sm"
                      onClick={() => setDeletingRoundId(round.id)}
                      title="Löschen"
                      icon={<IconTrash size={14} />}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        opened={isCreateModalOpen || !!editingRound}
        onClose={closeModals}
        title={editingRound ? 'Runde bearbeiten' : 'Neue Runde erstellen'}
      >
        <div className="space-y-4">
          <TextInput
            label="Titel"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: undefined }));
            }}
            placeholder="z.B. Prophezeiungen 2025"
            required
            error={formErrors.title}
          />
          <DateTimePicker
            label="Einreichungs-Deadline"
            placeholder="Datum und Zeit wählen"
            value={submissionDeadline}
            onChange={(v: Date | null) => {
              setSubmissionDeadline(v);
              if (formErrors.submissionDeadline)
                setFormErrors((prev) => ({ ...prev, submissionDeadline: undefined }));
            }}
            required
            error={formErrors.submissionDeadline}
          />
          <DateTimePicker
            label="Bewertungs-Deadline"
            placeholder="Datum und Zeit wählen"
            value={ratingDeadline}
            onChange={(v: Date | null) => {
              setRatingDeadline(v);
              if (formErrors.ratingDeadline)
                setFormErrors((prev) => ({ ...prev, ratingDeadline: undefined }));
            }}
            required
            error={formErrors.ratingDeadline}
          />
          <DateTimePicker
            label="Stichtag"
            placeholder="Datum und Zeit wählen"
            value={fulfillmentDate}
            onChange={(v: Date | null) => {
              setFulfillmentDate(v);
              if (formErrors.fulfillmentDate)
                setFormErrors((prev) => ({ ...prev, fulfillmentDate: undefined }));
            }}
            required
            error={formErrors.fulfillmentDate}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={closeModals} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            onClick={editingRound ? handleUpdate : handleCreate}
            disabled={isSubmitting || !isFormValid}
          >
            {submitButtonLabel}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        opened={!!deletingRoundId}
        onClose={closeModals}
        onConfirm={handleDelete}
        title="Runde löschen?"
        confirmText="Löschen"
        confirmingText="Löschen..."
        isSubmitting={isSubmitting}
        variant="danger"
      >
        <p>
          Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Prophezeiungen werden
          ebenfalls gelöscht.
        </p>
      </ConfirmModal>
    </>
  );
});
