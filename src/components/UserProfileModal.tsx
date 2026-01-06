'use client';

import { memo, useCallback, useMemo, useState } from 'react';

import { Tooltip } from '@mantine/core';
import { IconMinus, IconPlus, IconX } from '@tabler/icons-react';

import { BadgeIcon } from '@/components/BadgeIcon';
import { BadgeTooltipContent } from '@/components/BadgeTooltipContent';
import { IconActionButton } from '@/components/IconActionButton';
import { Modal } from '@/components/Modal';
import { UserAvatar } from '@/components/UserAvatar';
import { UserStatsGrid } from '@/components/UserStatsGrid';
import { apiClient } from '@/lib/api-client/client';
import { formatDate } from '@/lib/formatting/date';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { type Badge, useBadgeStore } from '@/store/useBadgeStore';
import { type User, useUserStore } from '@/store/useUserStore';

interface UserProfileModalProps {
  user: User | null;
  opened: boolean;
  onClose: () => void;
}

interface BadgeWithEarnedAt {
  badge: Badge;
  earnedAt: string;
}

// Badge keys that can be manually awarded/revoked by admins
const MANUAL_BADGE_KEYS = ['hidden_bug_hunter', 'hidden_beta_tester'];

export const UserProfileModal = memo(function UserProfileModal({
  user,
  opened,
  onClose,
}: Readonly<UserProfileModalProps>) {
  const badges = useBadgeStore((state) => state.badges);
  const allUserBadges = useBadgeStore((state) => state.allUserBadges);
  const currentUserId = useUserStore((state) => state.currentUserId);
  const users = useUserStore((state) => state.users);
  const [isAwarding, setIsAwarding] = useState<string | null>(null);

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    if (!currentUserId) return false;
    const currentUser = users[currentUserId];
    return currentUser?.role === 'ADMIN';
  }, [currentUserId, users]);

  // Get user's badges with earnedAt dates
  const userBadges = useMemo((): BadgeWithEarnedAt[] => {
    if (!user) return [];
    const userBadgeMap = allUserBadges[user.id] || {};
    return Object.values(userBadgeMap)
      .map((ub) => ({
        badge: badges[ub.badgeId],
        earnedAt: ub.earnedAt,
      }))
      .filter((b): b is BadgeWithEarnedAt => !!b.badge)
      .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());
  }, [user, badges, allUserBadges]);

  // Get manually awardable badges with their current status for this user
  const manualBadges = useMemo(() => {
    if (!user) return [];
    const userBadgeMap = allUserBadges[user.id] || {};
    return MANUAL_BADGE_KEYS.map((key) => {
      const badge = Object.values(badges).find((b) => b.key === key);
      if (!badge) return null;
      const userBadge = userBadgeMap[badge.id];
      return {
        badge,
        hasIt: !!userBadge,
        earnedAt: userBadge?.earnedAt,
      };
    }).filter((b): b is NonNullable<typeof b> => b !== null);
  }, [user, badges, allUserBadges]);

  const handleToggleBadge = useCallback(
    async (badgeKey: string, hasIt: boolean) => {
      if (!user) return;
      setIsAwarding(badgeKey);
      try {
        const { error } = hasIt
          ? await apiClient.admin.badges.revoke(user.id, badgeKey)
          : await apiClient.admin.badges.award(user.id, badgeKey);

        if (error) {
          showErrorToast(error.error || (hasIt ? 'Fehler beim Entfernen' : 'Fehler beim Vergeben'));
        } else {
          showSuccessToast(hasIt ? 'Badge entfernt' : 'Badge vergeben');
        }
      } catch {
        showErrorToast(
          hasIt ? 'Fehler beim Entfernen des Badges' : 'Fehler beim Vergeben des Badges'
        );
      } finally {
        setIsAwarding(null);
      }
    },
    [user]
  );

  if (!user) return null;

  return (
    <Modal opened={opened} onClose={onClose} size="lg">
      <div className="space-y-6 relative flex flex-col max-h-[80vh]">
        {/* Close Button */}
        <div className="absolute -top-2 -right-2">
          <IconActionButton
            icon={<IconX size={18} />}
            onClick={onClose}
            title="Schließen"
            size="sm"
          />
        </div>

        {/* User Info Header */}
        <div className="flex items-center gap-4 shrink-0">
          <UserAvatar user={user} size="xl" />
          <div>
            <h2 className="text-xl font-bold text-white">{user.displayName || user.username}</h2>
            <p className="text-sm text-(--text-muted)">@{user.username}</p>
            {user.createdAt && (
              <p className="text-xs text-(--text-muted)">
                Mitglied seit {formatDate(user.createdAt)}
              </p>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="shrink-0">
          <UserStatsGrid
            prophecyCount={user._count?.prophecies || 0}
            ratingCount={user._count?.ratings || 0}
            badgeCount={userBadges.length}
          />
        </div>

        {/* Achievements */}
        <div className="flex flex-col min-h-0 flex-1">
          <h3 className="text-sm font-semibold text-(--text-muted) mb-3 shrink-0">
            Achievements ({userBadges.length})
          </h3>
          {userBadges.length === 0 ? (
            <p className="text-sm text-(--text-muted)">Noch keine Achievements freigeschaltet.</p>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 overflow-y-auto pr-2">
              {userBadges.map(({ badge, earnedAt }) => (
                <Tooltip
                  key={badge.id}
                  label={
                    <BadgeTooltipContent
                      badgeKey={badge.key}
                      name={badge.name}
                      description={badge.description}
                      requirement={badge.requirement}
                      rarity={badge.rarity}
                      earnedAt={earnedAt}
                    />
                  }
                  multiline
                  position="top"
                  classNames={{
                    tooltip: 'achievement-tooltip',
                  }}
                >
                  <div className="flex items-center gap-3 p-3 badge-card cursor-default">
                    <BadgeIcon badgeKey={badge.key} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{badge.name}</p>
                      <p className="text-xs text-(--text-muted)">{formatDate(earnedAt)}</p>
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          )}
        </div>

        {/* Admin Badge Management */}
        {isAdmin && manualBadges.length > 0 && (
          <div className="shrink-0 pt-4 border-t border-[rgba(98,125,152,0.3)]">
            <h3 className="text-sm font-semibold text-violet-400 mb-3">Admin: Badges verwalten</h3>
            <div className="flex flex-wrap gap-2">
              {manualBadges.map(({ badge, hasIt }) => (
                <Tooltip
                  key={badge.id}
                  label={
                    <BadgeTooltipContent
                      badgeKey={badge.key}
                      name={badge.name}
                      description={badge.description}
                      requirement={badge.requirement}
                      rarity={badge.rarity}
                    />
                  }
                  multiline
                  position="top"
                  classNames={{
                    tooltip: 'achievement-tooltip',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleBadge(badge.key, hasIt)}
                    disabled={isAwarding === badge.key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      hasIt
                        ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400'
                        : 'bg-[rgba(10,25,41,0.6)] border-[rgba(98,125,152,0.3)] text-(--text-muted) hover:border-green-500/50 hover:text-green-400'
                    } ${isAwarding === badge.key ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                  >
                    <BadgeIcon badgeKey={badge.key} size="sm" className="w-8 h-8" />
                    <span className="text-sm font-medium">{badge.name}</span>
                    {hasIt ? (
                      <IconMinus size={16} className="text-red-400" />
                    ) : (
                      <IconPlus size={16} className="text-green-400" />
                    )}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});
