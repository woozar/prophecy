'use client';

import { memo, useCallback, useMemo, useState } from 'react';

import { IconChevronDown, IconRobot } from '@tabler/icons-react';

import { UserAvatar } from './UserAvatar';

export interface IndividualRating {
  id: string;
  userId: string;
  value: number;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  isBot: boolean;
}

interface IndividualRatingsBoxProps {
  ratings: IndividualRating[];
  currentUserId?: string;
}

function formatRatingValue(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function getRatingColor(value: number): string {
  if (value > 0) return 'text-cyan-400';
  if (value < 0) return 'text-violet-400';
  return 'text-gray-400';
}

const RatingItem = memo(function RatingItem({
  rating,
  isCurrentUser,
}: {
  rating: IndividualRating;
  isCurrentUser: boolean;
}) {
  const valueColorClass = useMemo(() => getRatingColor(rating.value), [rating.value]);
  const formattedValue = useMemo(() => formatRatingValue(rating.value), [rating.value]);

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
      <UserAvatar userId={rating.userId} size="sm" clickable />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm text-(--text-secondary) truncate">
          {rating.displayName || rating.username}
        </span>
        {isCurrentUser && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-cyan-400 bg-cyan-400/10 rounded">
            Meine
          </span>
        )}
        {rating.isBot && (
          <span
            className="inline-flex items-center text-xs text-(--text-muted)"
            title="Bot - wird im Durchschnitt nicht berücksichtigt"
          >
            <IconRobot size={14} className="text-violet-400" />
          </span>
        )}
      </div>
      <span className={`text-sm font-medium tabular-nums ${valueColorClass}`}>
        {formattedValue}
      </span>
    </div>
  );
});

export const IndividualRatingsBox = memo(function IndividualRatingsBox({
  ratings,
  currentUserId,
}: Readonly<IndividualRatingsBoxProps>) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const sortedRatings = useMemo(() => {
    return [...ratings].sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      const nameA = (a.displayName || a.username).toLowerCase();
      const nameB = (b.displayName || b.username).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [ratings]);

  const hasBotsInList = useMemo(() => ratings.some((r) => r.isBot), [ratings]);

  const chevronStyle = useMemo(
    () => ({
      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease-in-out',
    }),
    [isExpanded]
  );

  const contentStyle = useMemo(
    () => ({
      maxHeight: isExpanded ? '500px' : '0px',
      opacity: isExpanded ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out',
    }),
    [isExpanded]
  );

  if (ratings.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex items-center gap-2 text-sm text-(--text-muted) hover:text-(--text-secondary) transition-colors w-full"
      >
        <IconChevronDown size={16} style={chevronStyle} />
        <span>Einzelbewertungen anzeigen</span>
      </button>

      <div style={contentStyle}>
        <div className="mt-2 space-y-1">
          {sortedRatings.map((rating) => (
            <RatingItem
              key={rating.id}
              rating={rating}
              isCurrentUser={rating.userId === currentUserId}
            />
          ))}
        </div>

        {hasBotsInList && (
          <p className="mt-2 text-xs text-(--text-muted) flex items-center gap-1">
            <IconRobot size={12} className="text-violet-400" />
            <span>Bot-Bewertungen werden im Durchschnitt nicht berücksichtigt</span>
          </p>
        )}
      </div>
    </div>
  );
});
