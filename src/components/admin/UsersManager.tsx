'use client';

import { useState, useCallback, memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { GlowBadge } from '@/components/GlowBadge';
import { UserAvatar } from '@/components/UserAvatar';
import { useUserStore, type User } from '@/store/useUserStore';
import { showSuccessToast, showErrorToast } from '@/lib/toast/toast';
import {
  IconCheck,
  IconX,
  IconBan,
  IconShield,
  IconUser,
  IconTrash,
  IconKey,
} from '@tabler/icons-react';
import { Modal } from '@/components/Modal';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ausstehend',
  APPROVED: 'Freigegeben',
  REJECTED: 'Abgelehnt',
  SUSPENDED: 'Gesperrt',
};

const STATUS_COLORS: Record<string, 'yellow' | 'green' | 'red' | 'gray'> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
  SUSPENDED: 'gray',
};

interface ConfirmAction {
  userId: string;
  username: string;
  type: 'delete' | 'suspend' | 'demote';
}

interface PasswordResetResult {
  username: string;
  temporaryPassword: string;
}

export const UsersManager = memo(function UsersManager() {
  const users = useUserStore(useShallow((state) => Object.values(state.users)));
  const { setUser, removeUser } = useUserStore();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordResetResult, setPasswordResetResult] = useState<PasswordResetResult | null>(null);

  const handleStatusChange = useCallback(
    async (userId: string, status: string) => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Fehler beim Aktualisieren');
        }

        const { user } = await res.json();
        setUser(user);
        showSuccessToast(`Benutzer ${STATUS_LABELS[status].toLowerCase()}`);
        setConfirmAction(null);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
      } finally {
        setIsSubmitting(false);
      }
    },
    [setUser]
  );

  const handleRoleChange = useCallback(
    async (userId: string, role: string) => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Fehler beim Aktualisieren');
        }

        const { user } = await res.json();
        setUser(user);
        showSuccessToast(role === 'ADMIN' ? 'Zum Admin befördert' : 'Adminrechte entzogen');
        setConfirmAction(null);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
      } finally {
        setIsSubmitting(false);
      }
    },
    [setUser]
  );

  const handleDelete = useCallback(
    async (userId: string) => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Fehler beim Löschen');
        }

        removeUser(userId);
        showSuccessToast('Benutzer gelöscht');
        setConfirmAction(null);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
      } finally {
        setIsSubmitting(false);
      }
    },
    [removeUser]
  );

  const handleResetPassword = useCallback(async (userId: string, username: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Zurücksetzen');
      }

      const data = await res.json();
      setPasswordResetResult({
        username,
        temporaryPassword: data.newPassword,
      });
      showSuccessToast('Passwort wurde zurückgesetzt');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case 'delete':
        handleDelete(confirmAction.userId);
        break;
      case 'suspend':
        handleStatusChange(confirmAction.userId, 'SUSPENDED');
        break;
      case 'demote':
        handleRoleChange(confirmAction.userId, 'USER');
        break;
    }
  }, [confirmAction, handleDelete, handleStatusChange, handleRoleChange]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Group users by status
  const pendingUsers = useMemo(() => users.filter((u) => u.status === 'PENDING'), [users]);
  const activeUsers = useMemo(() => users.filter((u) => u.status === 'APPROVED'), [users]);
  const otherUsers = useMemo(
    () => users.filter((u) => u.status !== 'PENDING' && u.status !== 'APPROVED'),
    [users]
  );

  const modalContent = useMemo(() => {
    if (!confirmAction) return null;

    switch (confirmAction.type) {
      case 'delete':
        return {
          title: 'Benutzer löschen?',
          message: `Möchtest du "${confirmAction.username}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden. Alle Prophezeiungen und Bewertungen werden ebenfalls gelöscht.`,
          buttonText: 'Löschen',
          variant: 'danger' as const,
        };
      case 'suspend':
        return {
          title: 'Benutzer sperren?',
          message: `Möchtest du "${confirmAction.username}" wirklich sperren? Der Benutzer kann sich nicht mehr anmelden, bis er wieder freigeschaltet wird.`,
          buttonText: 'Sperren',
          variant: 'warning' as const,
        };
      case 'demote':
        return {
          title: 'Adminrechte entziehen?',
          message: `Möchtest du "${confirmAction.username}" wirklich die Adminrechte entziehen? Der Benutzer verliert alle Administratorberechtigungen.`,
          buttonText: 'Rechte entziehen',
          variant: 'violet' as const,
        };
    }
  }, [confirmAction]);

  return (
    <>
      {/* Pending Users Section */}
      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-yellow-400">
            Ausstehende Freigaben ({pendingUsers.length})
          </h2>
          {pendingUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onApprove={() => handleStatusChange(user.id, 'APPROVED')}
              onReject={() => handleStatusChange(user.id, 'REJECTED')}
              onDelete={() =>
                setConfirmAction({
                  userId: user.id,
                  username: user.displayName || user.username,
                  type: 'delete',
                })
              }
              isSubmitting={isSubmitting}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Active Users Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Aktive Benutzer ({activeUsers.length})</h2>
        {activeUsers.length === 0 ? (
          <Card padding="p-6">
            <p className="text-center text-(--text-muted)">Keine aktiven Benutzer vorhanden.</p>
          </Card>
        ) : (
          activeUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onSuspend={() =>
                setConfirmAction({
                  userId: user.id,
                  username: user.displayName || user.username,
                  type: 'suspend',
                })
              }
              onToggleAdmin={() => {
                if (user.role === 'ADMIN') {
                  setConfirmAction({
                    userId: user.id,
                    username: user.displayName || user.username,
                    type: 'demote',
                  });
                } else {
                  handleRoleChange(user.id, 'ADMIN');
                }
              }}
              onResetPassword={() =>
                handleResetPassword(user.id, user.displayName || user.username)
              }
              onDelete={() =>
                setConfirmAction({
                  userId: user.id,
                  username: user.displayName || user.username,
                  type: 'delete',
                })
              }
              isSubmitting={isSubmitting}
              formatDate={formatDate}
            />
          ))
        )}
      </div>

      {/* Other Users Section */}
      {otherUsers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-(--text-muted)">
            Sonstige ({otherUsers.length})
          </h2>
          {otherUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onReactivate={() => handleStatusChange(user.id, 'APPROVED')}
              onDelete={() =>
                setConfirmAction({
                  userId: user.id,
                  username: user.displayName || user.username,
                  type: 'delete',
                })
              }
              isSubmitting={isSubmitting}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {modalContent && (
        <ConfirmModal
          opened={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
          title={modalContent.title}
          confirmText={modalContent.buttonText}
          isSubmitting={isSubmitting}
          variant={modalContent.variant}
        >
          <p>{modalContent.message}</p>
        </ConfirmModal>
      )}

      {/* Password Reset Result Modal */}
      <Modal
        opened={!!passwordResetResult}
        onClose={() => setPasswordResetResult(null)}
        title="Passwort zurückgesetzt"
      >
        <div className="space-y-4">
          <p className="text-(--text-secondary)">
            Das Passwort für <strong className="text-white">{passwordResetResult?.username}</strong>{' '}
            wurde zurückgesetzt.
          </p>

          <div className="bg-[rgba(10,25,41,0.8)] p-4 rounded-lg border border-cyan-500/30">
            <p className="text-sm text-(--text-muted) mb-1">Temporäres Passwort:</p>
            <p className="text-lg font-mono text-cyan-400 select-all">
              {passwordResetResult?.temporaryPassword}
            </p>
          </div>

          <p className="text-yellow-400 text-sm">
            Der Benutzer muss dieses Passwort beim nächsten Login ändern.
          </p>

          <div className="flex justify-end">
            <Button onClick={() => setPasswordResetResult(null)}>Schließen</Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

interface UserCardProps {
  user: User;
  onApprove?: () => void;
  onReject?: () => void;
  onSuspend?: () => void;
  onReactivate?: () => void;
  onToggleAdmin?: () => void;
  onResetPassword?: () => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  formatDate: (date: string) => string;
}

const UserCard = memo(function UserCard({
  user,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onToggleAdmin,
  onResetPassword,
  onDelete,
  isSubmitting,
  formatDate,
}: Readonly<UserCardProps>) {
  return (
    <Card padding="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar user={user} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">
                {user.displayName || user.username}
              </h3>
              {user.role === 'ADMIN' && (
                <GlowBadge size="sm" color="violet">
                  Admin
                </GlowBadge>
              )}
              <GlowBadge size="sm" color={STATUS_COLORS[user.status]}>
                {STATUS_LABELS[user.status]}
              </GlowBadge>
            </div>
            <p className="text-sm text-(--text-muted) truncate">
              @{user.username}
              {user.createdAt && <> · Seit {formatDate(user.createdAt)}</>}
            </p>
            <p className="text-xs text-(--text-muted)">
              {user._count?.prophecies || 0} Prophezeiungen · {user._count?.ratings || 0}{' '}
              Bewertungen
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {onApprove && (
            <Button
              variant="ghost"
              onClick={onApprove}
              disabled={isSubmitting}
              className="p-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]"
              title="Freigeben"
            >
              <IconCheck size={18} />
            </Button>
          )}
          {onReject && (
            <Button
              variant="ghost"
              onClick={onReject}
              disabled={isSubmitting}
              className="p-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              title="Ablehnen"
            >
              <IconX size={18} />
            </Button>
          )}
          {onSuspend && (
            <Button
              variant="ghost"
              onClick={onSuspend}
              disabled={isSubmitting}
              className="p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-yellow-400 hover:border-yellow-400/50 hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]"
              title="Sperren"
            >
              <IconBan size={18} />
            </Button>
          )}
          {onReactivate && (
            <Button
              variant="ghost"
              onClick={onReactivate}
              disabled={isSubmitting}
              className="p-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]"
              title="Reaktivieren"
            >
              <IconCheck size={18} />
            </Button>
          )}
          {onToggleAdmin && (
            <Button
              variant="ghost"
              onClick={onToggleAdmin}
              disabled={isSubmitting}
              className="p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-violet-400 hover:border-violet-400/50 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]"
              title={user.role === 'ADMIN' ? 'Adminrechte entziehen' : 'Zum Admin machen'}
            >
              {user.role === 'ADMIN' ? <IconUser size={18} /> : <IconShield size={18} />}
            </Button>
          )}
          {onResetPassword && (
            <Button
              variant="ghost"
              onClick={onResetPassword}
              disabled={isSubmitting}
              className="p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              title="Passwort zurücksetzen"
            >
              <IconKey size={18} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              onClick={onDelete}
              disabled={isSubmitting}
              className="p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-red-400 hover:border-red-400/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              title="Löschen"
            >
              <IconTrash size={18} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});
