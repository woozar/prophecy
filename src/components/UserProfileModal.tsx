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
import { type TierGroup, groupBadgesByTier, isTierGroupAscending } from '@/lib/badges/badge-tiers';
import { formatDate } from '@/lib/formatting/date';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { type Badge, useBadgeStore } from '@/store/useBadgeStore';
import { selectProphecyCountByUserId, useProphecyStore } from '@/store/useProphecyStore';
import { selectRatingCountByUserId, useRatingStore } from '@/store/useRatingStore';
import { type User, useUserStore } from '@/store/useUserStore';

interface UserProfileModalProps {
  user: User | null;
  opened: boolean;
  onClose: () => void;
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
  const prophecyCount = useProphecyStore(selectProphecyCountByUserId(user?.id ?? ''));
  const ratingCount = useRatingStore(selectRatingCountByUserId(user?.id ?? ''));
  const [isAwarding, setIsAwarding] = useState<string | null>(null);

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    if (!currentUserId) return false;
    const currentUser = users[currentUserId];
    return currentUser?.role === 'ADMIN';
  }, [currentUserId, users]);

  // Get set of known badge keys (badges that have been awarded to at least one user)
  // Calculate from allUserBadges since awardedBadges store is not populated
  const knownBadgeKeys = useMemo(() => {
    const knownIds = new Set<string>();
    for (const userBadgeMap of Object.values(allUserBadges)) {
      for (const badgeId of Object.keys(userBadgeMap)) {
        knownIds.add(badgeId);
      }
    }
    // Convert badge IDs to badge keys
    const knownKeys = new Set<string>();
    for (const badgeId of knownIds) {
      const badge = badges[badgeId];
      if (badge) {
        knownKeys.add(badge.key);
      }
    }
    return knownKeys;
  }, [allUserBadges, badges]);

  // Get user's badges with earnedAt dates
  const userBadgesWithDates = useMemo((): Map<string, string> => {
    if (!user) return new Map();
    const userBadgeMap = allUserBadges[user.id] || {};
    const result = new Map<string, string>();
    for (const ub of Object.values(userBadgeMap)) {
      const badge = badges[ub.badgeId];
      if (badge) {
        result.set(badge.key, ub.earnedAt);
      }
    }
    return result;
  }, [user, badges, allUserBadges]);

  // Get user's badges as Badge array
  const userBadgesList = useMemo((): Badge[] => {
    if (!user) return [];
    const userBadgeMap = allUserBadges[user.id] || {};
    return Object.values(userBadgeMap)
      .map((ub) => badges[ub.badgeId])
      .filter((b): b is Badge => !!b);
  }, [user, badges, allUserBadges]);

  // Group badges by tier
  const groupedBadges = useMemo(() => {
    const allBadgesList = Object.values(badges);
    return groupBadgesByTier(userBadgesList, allBadgesList, knownBadgeKeys);
  }, [userBadgesList, badges, knownBadgeKeys]);

  // Create display items: tier groups show highest badge, standalone badges show as-is
  const displayItems = useMemo(() => {
    const items: Array<{ type: 'tier'; group: TierGroup } | { type: 'standalone'; badge: Badge }> =
      [];

    // Add tier groups
    for (const group of groupedBadges.tierGroups) {
      items.push({ type: 'tier', group });
    }

    // Add standalone badges
    for (const badge of groupedBadges.standaloneBadges) {
      items.push({ type: 'standalone', badge });
    }

    // Sort by most recently earned
    items.sort((a, b) => {
      const badgeA = a.type === 'tier' ? a.group.highestEarned : a.badge;
      const badgeB = b.type === 'tier' ? b.group.highestEarned : b.badge;
      const dateA = userBadgesWithDates.get(badgeA.key) ?? '';
      const dateB = userBadgesWithDates.get(badgeB.key) ?? '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return items;
  }, [groupedBadges, userBadgesWithDates]);

  // Total unique badge count (tier groups count as 1)
  const badgeCount = displayItems.length;

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
            <h2 className="text-xl font-bold text-cyan-400">{user.displayName || user.username}</h2>
            {user.createdAt && (
              <p className="text-sm text-white">Mitglied seit {formatDate(user.createdAt)}</p>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="shrink-0">
          <UserStatsGrid
            prophecyCount={prophecyCount}
            ratingCount={ratingCount}
            badgeCount={badgeCount}
          />
        </div>

        {/* Auszeichnungen */}
        <div className="flex flex-col min-h-0 flex-1">
          <h3 className="text-sm font-semibold text-white mb-3 shrink-0">
            Auszeichnungen ({badgeCount})
          </h3>
          {displayItems.length === 0 ? (
            <p className="text-sm text-(--text-muted)">Noch keine Auszeichnungen freigeschaltet.</p>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 overflow-y-auto pr-2">
              {displayItems.map((item) => {
                const badge = item.type === 'tier' ? item.group.highestEarned : item.badge;
                const earnedAt = userBadgesWithDates.get(badge.key) ?? '';

                // Build tier badges info for tooltip
                const tierBadges =
                  item.type === 'tier'
                    ? [
                        // Earned badges
                        ...item.group.earnedBadges.map((b) => ({
                          badge: b,
                          isEarned: true,
                          earnedAt: userBadgesWithDates.get(b.key),
                        })),
                        // Known unearned badges
                        ...item.group.knownUnearnedBadges.map((b) => ({
                          badge: b,
                          isEarned: false,
                        })),
                      ].sort((a, b) => {
                        // Sort best first: account for ascending groups (leaderboard position)
                        const thresholdA = a.badge.threshold ?? 0;
                        const thresholdB = b.badge.threshold ?? 0;
                        const sortAsc = isTierGroupAscending(item.group.prefix);
                        return sortAsc ? thresholdA - thresholdB : thresholdB - thresholdA;
                      })
                    : undefined;

                return (
                  <Tooltip
                    key={badge.id}
                    label={
                      <BadgeTooltipContent
                        badgeKey={badge.key}
                        name={badge.name}
                        description={badge.description}
                        requirement={badge.requirement}
                        earnedAt={earnedAt}
                        tierBadges={tierBadges}
                      />
                    }
                    multiline
                    position="top"
                    events={{ hover: true, focus: true, touch: true }}
                    classNames={{
                      tooltip: 'achievement-tooltip',
                    }}
                  >
                    <div className="flex items-center gap-3 p-3 badge-card cursor-default">
                      <BadgeIcon badgeKey={badge.key} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-violet-400 truncate">{badge.name}</p>
                        <p className="text-xs text-white">{formatDate(earnedAt)}</p>
                      </div>
                    </div>
                  </Tooltip>
                );
              })}
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
                    />
                  }
                  multiline
                  position="top"
                  events={{ hover: true, focus: true, touch: true }}
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
