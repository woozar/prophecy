'use client';

import { memo, useCallback, useState } from 'react';

import { notifications } from '@mantine/notifications';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { startRegistration } from '@simplewebauthn/browser';
import { IconEdit, IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react';

import { apiClient } from '@/lib/api-client';
import { errorToast, successToast } from '@/lib/toast/toast-styles';

import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';

export interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  credentialDeviceType: string;
}

interface PasskeyManagerProps {
  initialPasskeys: Passkey[];
}

export const PasskeyManager = memo(function PasskeyManager({
  initialPasskeys,
}: Readonly<PasskeyManagerProps>) {
  const [passkeys, setPasskeys] = useState<Passkey[]>(initialPasskeys);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Passkey | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [editingPasskey, setEditingPasskey] = useState<Passkey | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddPasskey = useCallback(async () => {
    setIsAdding(true);
    try {
      // Step 1: Get registration options
      const { data: optionsData, error: optionsError } = await apiClient.user.passkeys.getOptions();

      if (optionsError || !optionsData) {
        throw new Error(
          (optionsError as { error?: string })?.error || 'Fehler beim Abrufen der Optionen'
        );
      }

      const { options } = optionsData;

      // Step 2: Start WebAuthn registration
      const credential = await startRegistration({
        optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
      });

      // Step 3: Verify and store with custom name
      const { data: verifyData, error: verifyError } = await apiClient.user.passkeys.verify(
        credential,
        newPasskeyName.trim() || undefined
      );

      if (verifyError || !verifyData) {
        throw new Error(
          (verifyError as { error?: string })?.error || 'Verifizierung fehlgeschlagen'
        );
      }

      // API returns partial passkey data, we add missing fields for display
      const { passkey } = verifyData;
      setPasskeys((prev) => [
        {
          id: passkey.id,
          name: passkey.name,
          createdAt: passkey.createdAt,
          lastUsedAt: null,
          credentialDeviceType: 'singleDevice',
        },
        ...prev,
      ]);
      notifications.show(successToast('Passkey hinzugefügt', passkey.name));
      setShowAddModal(false);
      setNewPasskeyName('');
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        notifications.show(errorToast('Abgebrochen', 'Passkey-Registrierung wurde abgebrochen'));
      } else {
        notifications.show(
          errorToast('Fehler', error instanceof Error ? error.message : 'Unbekannter Fehler')
        );
      }
    } finally {
      setIsAdding(false);
    }
  }, [newPasskeyName]);

  const handleRenamePasskey = useCallback(async () => {
    if (!editingPasskey || !editName.trim()) return;

    try {
      const { error } = await apiClient.user.passkeys.rename(editingPasskey.id, editName.trim());

      if (error) {
        throw new Error((error as { error?: string })?.error || 'Umbenennen fehlgeschlagen');
      }

      setPasskeys((prev) =>
        prev.map((p) => (p.id === editingPasskey.id ? { ...p, name: editName.trim() } : p))
      );
      notifications.show(successToast('Passkey umbenannt'));
      setEditingPasskey(null);
      setEditName('');
    } catch (error) {
      notifications.show(
        errorToast('Fehler', error instanceof Error ? error.message : 'Unbekannter Fehler')
      );
    }
  }, [editingPasskey, editName]);

  const handleDeletePasskey = useCallback(async () => {
    if (!confirmDelete) return;

    setDeletingId(confirmDelete.id);
    try {
      const { error } = await apiClient.user.passkeys.delete(confirmDelete.id);

      if (error) {
        throw new Error((error as { error?: string })?.error || 'Löschen fehlgeschlagen');
      }

      setPasskeys((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      notifications.show(successToast('Passkey gelöscht'));
      setConfirmDelete(null);
    } catch (error) {
      notifications.show(
        errorToast('Fehler', error instanceof Error ? error.message : 'Unbekannter Fehler')
      );
    } finally {
      setDeletingId(null);
    }
  }, [confirmDelete]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <>
      <Card padding="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-cyan-400">Passkeys</h3>
          <Button
            variant="ghost"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-400/50 rounded-lg hover:bg-cyan-400/10 hover:border-cyan-400"
          >
            <IconPlus size={16} />
            <span className="min-[400px]:hidden">Passkey</span>
            <span className="hidden min-[400px]:inline">Passkey hinzufügen</span>
          </Button>
        </div>

        {passkeys.length === 0 ? (
          <p className="text-(--text-muted) text-sm">Keine Passkeys registriert.</p>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="list-item-glow flex items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-2 min-[400px]:gap-4 min-w-0">
                  <div className="hidden min-[400px]:flex shrink-0 w-11 h-11 rounded-xl bg-[rgba(10,25,41,0.8)] border border-cyan-400/50 items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3),inset_0_0_10px_rgba(6,182,212,0.1)]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                    >
                      <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
                      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] truncate flex items-center gap-1.5">
                      <span className="min-[400px]:hidden shrink-0 w-7 h-7 rounded-lg bg-[rgba(10,25,41,0.8)] border border-cyan-400/50 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-cyan-400"
                        >
                          <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
                          <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
                        </svg>
                      </span>
                      {passkey.name}
                    </p>
                    <p className="text-xs text-[#9fb3c8]">
                      Erstellt am {formatDate(passkey.createdAt)}
                    </p>
                    {passkey.lastUsedAt && (
                      <p className="text-xs text-[#9fb3c8]">
                        Zuletzt verwendet: {formatDate(passkey.lastUsedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col min-[450px]:flex-row gap-2 shrink-0">
                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingPasskey(passkey);
                      setEditName(passkey.name);
                    }}
                    title="Umbenennen"
                    className="p-2.5 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    <IconEdit size={18} />
                  </Button>
                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmDelete(passkey)}
                    disabled={deletingId === passkey.id}
                    title="Löschen"
                    className="p-2.5 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-red-400 hover:border-red-400/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                  >
                    {deletingId === passkey.id ? (
                      <IconLoader2 size={18} className="animate-spin" />
                    ) : (
                      <IconTrash size={18} />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Passkey Modal */}
      <Modal
        opened={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewPasskeyName('');
        }}
        withCloseButton={false}
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[rgba(6,182,212,0.15)] flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-cyan-400"
          >
            <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
            <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white text-center mb-2">Neuer Passkey</h3>
        <p className="text-sm text-(--text-secondary) text-center mb-4">
          Gib deinem Passkey einen Namen, um ihn später wiederzuerkennen.
        </p>
        <input
          type="text"
          value={newPasskeyName}
          onChange={(e) => setNewPasskeyName(e.target.value)}
          placeholder="z.B. MacBook Pro, iPhone..."
          className="w-full px-4 py-3 mb-4 rounded-lg bg-[rgba(10,25,41,0.8)] border border-[rgba(98,125,152,0.3)] text-white placeholder:text-(--text-muted) focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"
        />
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowAddModal(false);
              setNewPasskeyName('');
            }}
            className="flex-1"
          >
            Abbrechen
          </Button>
          <Button onClick={handleAddPasskey} disabled={isAdding} className="flex-1">
            {isAdding ? 'Wird registriert...' : 'Passkey erstellen'}
          </Button>
        </div>
      </Modal>

      {/* Edit Passkey Modal */}
      <Modal
        opened={!!editingPasskey}
        onClose={() => {
          setEditingPasskey(null);
          setEditName('');
        }}
        withCloseButton={false}
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[rgba(6,182,212,0.15)] flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-cyan-400"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white text-center mb-2">Passkey umbenennen</h3>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Neuer Name"
          className="w-full px-4 py-3 mb-4 rounded-lg bg-[rgba(10,25,41,0.8)] border border-[rgba(98,125,152,0.3)] text-white placeholder:text-(--text-muted) focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"
        />
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setEditingPasskey(null);
              setEditName('');
            }}
            className="flex-1"
          >
            Abbrechen
          </Button>
          <Button onClick={handleRenamePasskey} disabled={!editName.trim()} className="flex-1">
            Speichern
          </Button>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        opened={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        variant="danger"
        withCloseButton={false}
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-400"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white text-center mb-2">Passkey löschen?</h3>
        <p className="text-sm text-(--text-secondary) text-center mb-6">
          Möchtest du den Passkey{' '}
          <span className="text-white font-medium">&quot;{confirmDelete?.name}&quot;</span> wirklich
          löschen? Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1">
            Abbrechen
          </Button>
          <Button
            variant="danger"
            onClick={handleDeletePasskey}
            disabled={deletingId !== null}
            className="flex-1"
          >
            {deletingId ? 'Wird gelöscht...' : 'Löschen'}
          </Button>
        </div>
      </Modal>
    </>
  );
});
