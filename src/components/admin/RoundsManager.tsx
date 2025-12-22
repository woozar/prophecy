'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { TextInput } from '@/components/TextInput';
import { GlowBadge } from '@/components/GlowBadge';
import { useRoundStore, type Round } from '@/store/useRoundStore';
import { showSuccessToast, showErrorToast } from '@/lib/toast/toast';
import { createRoundSchema, updateRoundSchema } from '@/lib/schemas/round';
import { IconPlus, IconEdit, IconTrash, IconCalendar } from '@tabler/icons-react';
import { DateTimePicker } from '@/components/DateTimePicker';

interface RoundsManagerProps {
  initialRounds: Round[];
}

export const RoundsManager = memo(function RoundsManager({ initialRounds }: Readonly<RoundsManagerProps>) {
  const { rounds, setRounds } = useRoundStore();
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

  // Initialize store with server data
  useEffect(() => {
    setRounds(initialRounds);
  }, [initialRounds, setRounds]);

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

  const handleCreate = useCallback(async () => {
    const input = {
      title: title.trim(),
      submissionDeadline,
      ratingDeadline,
      fulfillmentDate,
    };

    const parsed = createRoundSchema.safeParse(input);
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
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      await res.json();
      showSuccessToast('Runde erstellt');
      closeModals();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, submissionDeadline, ratingDeadline, fulfillmentDate, closeModals]);

  const handleUpdate = useCallback(async () => {
    if (!editingRound) return;

    const input = {
      title: title.trim(),
      submissionDeadline,
      ratingDeadline,
      fulfillmentDate,
    };

    const parsed = updateRoundSchema.safeParse(input);
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
      const res = await fetch(`/api/rounds/${editingRound.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }

      await res.json();
      showSuccessToast('Runde aktualisiert');
      closeModals();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingRound, title, submissionDeadline, ratingDeadline, fulfillmentDate, closeModals]);

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

      showSuccessToast('Runde gelöscht');
      closeModals();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  }, [deletingRoundId, closeModals]);

  const submitButtonLabel = useMemo(() => {
    if (isSubmitting) return 'Speichern...';
    return editingRound ? 'Speichern' : 'Erstellen';
  }, [isSubmitting, editingRound]);

  const isFormValid = useMemo(() => {
    return title.trim() && submissionDeadline && ratingDeadline && fulfillmentDate;
  }, [title, submissionDeadline, ratingDeadline, fulfillmentDate]);

  const getRoundStatus = (round: Round) => {
    const now = new Date();
    const submission = new Date(round.submissionDeadline);
    const rating = new Date(round.ratingDeadline);
    const fulfillment = new Date(round.fulfillmentDate);

    if (now < submission) return { label: 'Einreichung offen', color: 'green' as const };
    if (now < rating) return { label: 'Bewertung offen', color: 'cyan' as const };
    if (now < fulfillment) return { label: 'Wartet auf Stichtag', color: 'yellow' as const };
    return { label: 'Abgeschlossen', color: 'gray' as const };
  };

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
          <div className='flex flex-row gap-2 items-center'>
            <IconPlus size={18} />
            <span>Neue Runde</span>
          </div>
        </Button>
      </div>

      {/* Rounds List */}
      <div className="space-y-4">
        {rounds.length === 0 ? (
          <Card padding="p-8">
            <p className="text-center text-(--text-muted)">Keine Runden vorhanden. Erstelle die erste Runde!</p>
          </Card>
        ) : (
          rounds.map((round) => {
            const status = getRoundStatus(round);
            return (
              <Card key={round.id} padding="p-5">
                <div className="flex flex-row items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">{round.title}</h3>
                      <GlowBadge size="sm" color={status.color} className="self-start">
                        {status.label}
                      </GlowBadge>
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

                    <p className="mt-2 text-sm text-(--text-muted)">{round._count?.prophecies || 0} Prophezeiung(en)</p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => openEditModal(round)}
                      className="p-2.5 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      title="Bearbeiten"
                    >
                      <IconEdit size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setDeletingRoundId(round.id)}
                      className="p-2.5 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-red-400 hover:border-red-400/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                      title="Löschen"
                    >
                      <IconTrash size={18} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
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
              if (formErrors.submissionDeadline) setFormErrors((prev) => ({ ...prev, submissionDeadline: undefined }));
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
              if (formErrors.ratingDeadline) setFormErrors((prev) => ({ ...prev, ratingDeadline: undefined }));
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
              if (formErrors.fulfillmentDate) setFormErrors((prev) => ({ ...prev, fulfillmentDate: undefined }));
            }}
            required
            error={formErrors.fulfillmentDate}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={closeModals} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={editingRound ? handleUpdate : handleCreate} disabled={isSubmitting || !isFormValid}>
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
          Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Prophezeiungen werden ebenfalls
          gelöscht.
        </p>
      </ConfirmModal>
    </>
  );
});
