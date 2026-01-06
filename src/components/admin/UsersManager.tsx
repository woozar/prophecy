'use client';

import { memo, useCallback, useMemo, useState } from 'react';

import {
  IconBan,
  IconCheck,
  IconKey,
  IconLoader2,
  IconShield,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { GlowBadge } from '@/components/GlowBadge';
import { Modal } from '@/components/Modal';
import { UserAvatar } from '@/components/UserAvatar';
import { useUserProfileModal } from '@/contexts/UserProfileModalContext';
import { apiClient } from '@/lib/api-client/client';
import { formatDate } from '@/lib/formatting/date';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { type Badge, useBadgeStore } from '@/store/useBadgeStore';
import { type User, useUserStore } from '@/store/useUserStore';

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
  // Get users from store (SSE keeps them up-to-date)
  const users = useUserStore(useShallow((state) => Object.values(state.users)));
  const setUser = useUserStore((state) => state.setUser);
  const removeUserFromStore = useUserStore((state) => state.removeUser);
  const isLoading = useUserStore((state) => !state.isInitialized);

  // Get badges from badge store
  const badges = useBadgeStore((state) => state.badges);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordResetResult, setPasswordResetResult] = useState<PasswordResetResult | null>(null);
  const { openUserProfile } = useUserProfileModal();

  const handleStatusChange = useCallback(
    async (userId: string, status: string) => {
      setIsSubmitting(true);
      try {
        const { data, error } = await apiClient.admin.users.update(userId, {
          status: status as 'PENDING' | 'APPROVED' | 'SUSPENDED',
        });

        if (error || !data) {
          throw new Error((error as { error?: string })?.error || 'Fehler beim Aktualisieren');
        }

        setUser(data.user as User);
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
        const { data, error } = await apiClient.admin.users.update(userId, {
          role: role as 'USER' | 'ADMIN',
        });

        if (error || !data) {
          throw new Error((error as { error?: string })?.error || 'Fehler beim Aktualisieren');
        }

        setUser(data.user as User);
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
        const { error } = await apiClient.admin.users.delete(userId);

        if (error) {
          throw new Error((error as { error?: string })?.error || 'Fehler beim Löschen');
        }

        removeUserFromStore(userId);
        showSuccessToast('Benutzer gelöscht');
        setConfirmAction(null);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
      } finally {
        setIsSubmitting(false);
      }
    },
    [removeUserFromStore]
  );

  const handleResetPassword = useCallback(async (userId: string, username: string) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await apiClient.admin.users.resetPassword(userId);

      if (error || !data) {
        throw new Error((error as { error?: string })?.error || 'Fehler beim Zurücksetzen');
      }

      setPasswordResetResult({
        username,
        temporaryPassword: data.temporaryPassword,
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

  // Sort function for alphabetical ordering by display name or username
  const sortAlphabetically = useCallback(
    (a: User, b: User) =>
      (a.displayName || a.username).localeCompare(b.displayName || b.username, 'de'),
    []
  );

  // Group users by status and sort alphabetically
  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === 'PENDING').sort(sortAlphabetically),
    [users, sortAlphabetically]
  );
  const activeUsers = useMemo(
    () => users.filter((u) => u.status === 'APPROVED').sort(sortAlphabetically),
    [users, sortAlphabetically]
  );
  const otherUsers = useMemo(
    () =>
      users
        .filter((u) => u.status !== 'PENDING' && u.status !== 'APPROVED')
        .sort(sortAlphabetically),
    [users, sortAlphabetically]
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

  if (isLoading) {
    return (
      <Card padding="p-6">
        <div className="flex items-center justify-center gap-2 text-(--text-muted)">
          <IconLoader2 size={20} className="animate-spin" />
          <span>Benutzer werden geladen...</span>
        </div>
      </Card>
    );
  }

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
              badges={badges}
              onClick={() => openUserProfile(user)}
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
              badges={badges}
              onClick={() => openUserProfile(user)}
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
              badges={badges}
              onClick={() => openUserProfile(user)}
              onReactivate={() => handleStatusChange(user.id, 'APPROVED')}
              onDelete={() =>
                setConfirmAction({
                  userId: user.id,
                  username: user.displayName || user.username,
                  type: 'delete',
                })
              }
              isSubmitting={isSubmitting}
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
  badges: Record<string, Badge>;
  onClick: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onSuspend?: () => void;
  onReactivate?: () => void;
  onToggleAdmin?: () => void;
  onResetPassword?: () => void;
  onDelete?: () => void;
  isSubmitting: boolean;
}

const UserCard = memo(function UserCard({
  user,
  badges,
  onClick,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  onToggleAdmin,
  onResetPassword,
  onDelete,
  isSubmitting,
}: Readonly<UserCardProps>) {
  // Count badges by rarity
  const badgeRarityCounts = useMemo(() => {
    if (!user.badgeIds || user.badgeIds.length === 0) return null;

    const counts = { LEGENDARY: 0, GOLD: 0, SILVER: 0, BRONZE: 0 };
    for (const id of user.badgeIds) {
      const badge = badges[id];
      if (badge) {
        counts[badge.rarity]++;
      }
    }
    return counts;
  }, [user.badgeIds, badges]);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Only trigger if clicking on the card itself, not the action buttons
      if ((e.target as HTMLElement).closest('[data-action-buttons]')) return;
      onClick();
    },
    [onClick]
  );

  return (
    <Card padding="p-4" onClick={handleCardClick} className="cursor-pointer">
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
              {user.isBot && (
                <GlowBadge size="sm" color="cyan">
                  Bot
                </GlowBadge>
              )}
              {!user.isBot && user.status !== 'APPROVED' && (
                <GlowBadge size="sm" color={STATUS_COLORS[user.status]}>
                  {STATUS_LABELS[user.status]}
                </GlowBadge>
              )}
            </div>
            <p className="text-sm text-(--text-muted) truncate">
              @{user.username}
              {user.createdAt && <> · Seit {formatDate(user.createdAt)}</>}
            </p>
            <p className="text-xs text-(--text-muted)">
              {!user.isBot && <>{user._count?.prophecies || 0} Prophezeiungen · </>}
              {user._count?.ratings || 0} Bewertungen
            </p>
            {badgeRarityCounts && (
              <div className="flex gap-2 mt-1 text-xs">
                {badgeRarityCounts.LEGENDARY > 0 && (
                  <span className="text-purple-400" title="Legendäre Badges">
                    💎 {badgeRarityCounts.LEGENDARY}
                  </span>
                )}
                {badgeRarityCounts.GOLD > 0 && (
                  <span className="text-yellow-400" title="Gold Badges">
                    🥇 {badgeRarityCounts.GOLD}
                  </span>
                )}
                {badgeRarityCounts.SILVER > 0 && (
                  <span className="text-gray-300" title="Silber Badges">
                    🥈 {badgeRarityCounts.SILVER}
                  </span>
                )}
                {badgeRarityCounts.BRONZE > 0 && (
                  <span className="text-amber-600" title="Bronze Badges">
                    🥉 {badgeRarityCounts.BRONZE}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {!user.isBot && (
          <div className="flex gap-2 shrink-0" data-action-buttons>
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
        )}
      </div>
    </Card>
  );
});
