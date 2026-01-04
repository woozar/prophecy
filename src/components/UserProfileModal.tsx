'use client';

import { memo, useMemo } from 'react';

import { Tooltip } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import { BadgeTooltipContent } from '@/components/BadgeTooltipContent';
import { IconActionButton } from '@/components/IconActionButton';
import { Modal } from '@/components/Modal';
import { UserAvatar } from '@/components/UserAvatar';
import { UserStatsGrid } from '@/components/UserStatsGrid';
import { formatDate } from '@/lib/formatting/date';
import { type Badge, useBadgeStore } from '@/store/useBadgeStore';
import type { User } from '@/store/useUserStore';

interface UserProfileModalProps {
  user: User | null;
  opened: boolean;
  onClose: () => void;
}

interface BadgeWithEarnedAt {
  badge: Badge;
  earnedAt: string;
}

export const UserProfileModal = memo(function UserProfileModal({
  user,
  opened,
  onClose,
}: Readonly<UserProfileModalProps>) {
  const badges = useBadgeStore((state) => state.badges);
  const allUserBadges = useBadgeStore((state) => state.allUserBadges);

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
                      icon={badge.icon}
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
                    <span className="text-2xl">{badge.icon}</span>
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
      </div>
    </Modal>
  );
});
