'use client';

import { memo, useMemo, useState } from 'react';

import type { BadgeRarity } from '@prisma/client';
import { IconLoader2 } from '@tabler/icons-react';

import { BadgeIcon } from '@/components/BadgeIcon';
import { Card } from '@/components/Card';
import { Link } from '@/components/Link';
import { Modal } from '@/components/Modal';
import { UserAvatar } from '@/components/UserAvatar';
import { formatDate } from '@/lib/formatting/date';
import { useBadgeStore } from '@/store/useBadgeStore';
import { useUserStore } from '@/store/useUserStore';

interface AwardedBadgeInfo {
  badgeId: string;
  badgeKey: string;
  name: string;
  description: string;
  requirement: string;
  rarity: BadgeRarity;
  firstAchieverId: string;
  firstAchievedAt: string;
  totalAchievers: number;
}

interface BadgeAchiever {
  userId: string;
  earnedAt: string;
}

export default function BadgesPage() {
  const badges = useBadgeStore((state) => state.badges);
  const allUserBadges = useBadgeStore((state) => state.allUserBadges);
  const isInitialized = useBadgeStore((state) => state.isInitialized);
  const users = useUserStore((state) => state.users);

  const [selectedBadge, setSelectedBadge] = useState<AwardedBadgeInfo | null>(null);

  // TEMPORARY: Show ALL badges for preview
  const awardedBadges = useMemo((): AwardedBadgeInfo[] => {
    // Get stats for badges that have been awarded
    const badgeStats: Record<
      string,
      { firstAchieverId: string; firstAchievedAt: string; count: number }
    > = {};

    for (const userId of Object.keys(allUserBadges)) {
      const userBadgeMap = allUserBadges[userId];
      for (const badgeId of Object.keys(userBadgeMap)) {
        const ub = userBadgeMap[badgeId];
        if (badgeStats[badgeId]) {
          badgeStats[badgeId].count++;
          if (new Date(ub.earnedAt) < new Date(badgeStats[badgeId].firstAchievedAt)) {
            badgeStats[badgeId].firstAchieverId = userId;
            badgeStats[badgeId].firstAchievedAt = ub.earnedAt;
          }
        } else {
          badgeStats[badgeId] = {
            firstAchieverId: userId,
            firstAchievedAt: ub.earnedAt,
            count: 1,
          };
        }
      }
    }

    // Only show badges that have been awarded to at least one user
    return Object.values(badges)
      .filter((badge) => badgeStats[badge.id])
      .map((badge) => {
        const stats = badgeStats[badge.id];
        return {
          badgeId: badge.id,
          badgeKey: badge.key,
          name: badge.name,
          description: badge.description,
          requirement: badge.requirement,
          rarity: badge.rarity,
          firstAchieverId: stats.firstAchieverId,
          firstAchievedAt: stats.firstAchievedAt,
          totalAchievers: stats.count,
        };
      })
      .toSorted((a, b) => {
        // Sort by rarity (descending): LEGENDARY > GOLD > SILVER > BRONZE
        const rarityOrder = { LEGENDARY: 0, GOLD: 1, SILVER: 2, BRONZE: 3 };
        const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
        if (rarityDiff !== 0) return rarityDiff;
        // Then by name
        return a.name.localeCompare(b.name, 'de');
      });
  }, [badges, allUserBadges]);

  // Get all achievers for the selected badge
  const selectedBadgeAchievers = useMemo((): BadgeAchiever[] => {
    if (!selectedBadge) return [];
    const achievers: BadgeAchiever[] = [];
    for (const userId of Object.keys(allUserBadges)) {
      const userBadgeMap = allUserBadges[userId];
      const ub = userBadgeMap[selectedBadge.badgeId];
      if (ub) {
        achievers.push({ userId, earnedAt: ub.earnedAt });
      }
    }
    return achievers.sort(
      (a, b) => new Date(a.earnedAt).getTime() - new Date(b.earnedAt).getTime()
    );
  }, [selectedBadge, allUserBadges]);

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <Card padding="p-6">
          <div className="flex items-center justify-center gap-2 text-(--text-muted)">
            <IconLoader2 size={20} className="animate-spin" />
            <span>Achievements werden geladen...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <Link href="/users" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Zurück zu Benutzer
        </Link>
      </div>

      <p className="text-(--text-muted)">
        Alle Achievements, die bereits freigeschaltet wurden. Sortiert nach dem Datum der ersten
        Freischaltung.
      </p>

      {awardedBadges.length === 0 ? (
        <Card padding="p-6">
          <p className="text-center text-(--text-muted)">Noch keine Achievements freigeschaltet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {awardedBadges.map((badge) => {
            const firstAchiever = users[badge.firstAchieverId];
            return (
              <BadgeCard
                key={badge.badgeId}
                badge={badge}
                firstAchiever={firstAchiever}
                onClick={() => setSelectedBadge(badge)}
              />
            );
          })}
        </div>
      )}

      {/* Badge Detail Modal */}
      <Modal opened={!!selectedBadge} onClose={() => setSelectedBadge(null)} size="md">
        {selectedBadge && (
          <div className="flex flex-col max-h-[80vh]">
            {/* Fixed header */}
            <div className="space-y-4 shrink-0">
              <div className="flex flex-col items-center gap-2">
                <BadgeIcon badgeKey={selectedBadge.badgeKey} size="2xl" />
                <h2 className="text-xl font-bold text-violet-400 text-center">
                  {selectedBadge.name}
                </h2>
              </div>
              <p className="text-white italic text-center">{selectedBadge.description}</p>
              <p className="text-sm font-medium text-cyan-400 text-center">
                {selectedBadge.requirement}
              </p>

              <div className="text-sm text-white">
                {selectedBadgeAchievers.length}{' '}
                {selectedBadgeAchievers.length === 1 ? 'Benutzer hat' : 'Benutzer haben'} dieses
                Achievement
              </div>

              <h3 className="text-sm font-semibold text-white">Erreicht von:</h3>
            </div>

            {/* Scrollable achievers list */}
            <div className="space-y-2 overflow-y-auto min-h-0 mt-2">
              {selectedBadgeAchievers.map(({ userId, earnedAt }, index) => {
                const user = users[userId];
                if (!user) return null;
                return (
                  <div
                    key={`${userId}-${index}`}
                    className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(10,25,41,0.4)]"
                  >
                    {index === 0 && <span className="text-yellow-400">🥇</span>}
                    {index === 1 && <span className="text-gray-300">🥈</span>}
                    {index === 2 && <span className="text-amber-600">🥉</span>}
                    {index > 2 && (
                      <span className="w-5 text-center text-xs text-(--text-muted)">
                        {index + 1}
                      </span>
                    )}
                    <UserAvatar userId={userId} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cyan-400 truncate">
                        {user.displayName || user.username}
                      </p>
                    </div>
                    <span className="text-xs text-(--text-muted)">{formatDate(earnedAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface BadgeCardProps {
  badge: AwardedBadgeInfo;
  firstAchiever?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl?: string | null;
    avatarEffect?: string | null;
    avatarEffectColors?: string[];
  };
  onClick: () => void;
}

const BadgeCard = memo(function BadgeCard({
  badge,
  firstAchiever,
  onClick,
}: Readonly<BadgeCardProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 badge-card cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <BadgeIcon badgeKey={badge.badgeKey} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-violet-400">{badge.name}</h3>
          <p className="text-sm text-white line-clamp-2">{badge.description}</p>

          <div className="mt-3 flex items-center gap-2">
            {firstAchiever && (
              <>
                <UserAvatar userId={firstAchiever.id} size="sm" />
                <span className="text-xs text-(--text-muted)">
                  Zuerst erreicht von{' '}
                  <span className="text-cyan-400">
                    {firstAchiever.displayName || firstAchiever.username}
                  </span>
                </span>
              </>
            )}
          </div>

          <div className="mt-1 text-xs text-(--text-muted)">{badge.totalAchievers} Besitzer</div>
        </div>
      </div>
    </button>
  );
});
