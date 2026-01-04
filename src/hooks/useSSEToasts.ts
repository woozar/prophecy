'use client';

import { useCallback } from 'react';

import { showInfoToast, showSuccessToast } from '@/lib/toast/toast';
import { type UserBadge } from '@/store/useBadgeStore';
import { type Prophecy, useProphecyStore } from '@/store/useProphecyStore';
import { type Rating } from '@/store/useRatingStore';
import { type Round, useRoundStore } from '@/store/useRoundStore';
import { type User, selectCurrentUser, useUserStore } from '@/store/useUserStore';

// Callback types for SSE events
export interface SSEEventCallbacks {
  onProphecyCreated?: (prophecy: Prophecy) => void;
  onRatingCreated?: (rating: Rating) => void;
  onRoundCreated?: (round: Round) => void;
  onRoundUpdated?: (round: Round, previousRound: Round | undefined) => void;
  onUserUpdated?: (user: User, previousUser: User | undefined) => void;
  onBadgeAwarded?: (userBadge: UserBadge) => void;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get display name for a user, falling back to username or "Jemand"
 */
function getUserDisplayName(user: User | undefined): string {
  if (!user) return 'Jemand';
  return user.displayName || user.username || 'Jemand';
}

/**
 * Hook that provides toast notification handlers for SSE events.
 * Only shows toasts for actions performed by OTHER users.
 */
export function useSSEToasts(): SSEEventCallbacks {
  const currentUserId = useUserStore((state) => state.currentUserId);
  const users = useUserStore((state) => state.users);
  const prophecies = useProphecyStore((state) => state.prophecies);
  const rounds = useRoundStore((state) => state.rounds);
  const currentUser = useUserStore(selectCurrentUser);

  /**
   * Show toast when someone else creates a prophecy
   */
  const handleProphecyCreated = useCallback(
    (prophecy: Prophecy) => {
      // Don't show toast for own actions
      if (prophecy.creatorId === currentUserId) return;

      const creator = users[prophecy.creatorId];
      const displayName = getUserDisplayName(creator);
      const round = rounds[prophecy.roundId];

      showInfoToast(
        `${displayName} hat eine neue Prophezeiung erstellt`,
        round ? `${truncateText(prophecy.title)} (${round.title})` : truncateText(prophecy.title)
      );
    },
    [currentUserId, users, rounds]
  );

  /**
   * Show toast when someone rates your prophecy
   */
  const handleRatingCreated = useCallback(
    (rating: Rating) => {
      // Don't show toast for own ratings
      if (rating.userId === currentUserId) return;

      // Only show if it's a rating on MY prophecy
      const prophecy = prophecies[rating.prophecyId];
      if (prophecy?.creatorId !== currentUserId) return;

      const rater = users[rating.userId];
      const displayName = getUserDisplayName(rater);

      showInfoToast(`${displayName} hat deine Prophezeiung bewertet`, truncateText(prophecy.title));
    },
    [currentUserId, users, prophecies]
  );

  /**
   * Show toast when a new round is created
   */
  const handleRoundCreated = useCallback((round: Round) => {
    showInfoToast('Neue Runde erstellt', round.title);
  }, []);

  /**
   * Show toast when round results are published
   */
  const handleRoundUpdated = useCallback((round: Round, previousRound: Round | undefined) => {
    // Check if results were just published
    if (round.resultsPublishedAt && !previousRound?.resultsPublishedAt) {
      showInfoToast('Ergebnisse veröffentlicht', round.title);
    }
  }, []);

  /**
   * Show toast when a user is approved (admin only)
   */
  const handleUserUpdated = useCallback(
    (user: User, previousUser: User | undefined) => {
      // Only admins see user approval toasts
      if (currentUser?.role !== 'ADMIN') return;

      // Check if user was just approved
      if (user.status === 'APPROVED' && previousUser?.status !== 'APPROVED') {
        const displayName = getUserDisplayName(user);
        showInfoToast('Neuer Benutzer freigeschaltet', displayName);
      }
    },
    [currentUser?.role]
  );

  /**
   * Show toast when the current user earns a new badge
   */
  const handleBadgeAwarded = useCallback(
    (userBadge: UserBadge) => {
      // Only show toast for own badges
      if (userBadge.userId !== currentUserId) return;

      showSuccessToast(
        `${userBadge.badge.icon} Neues Badge erhalten!`,
        `${userBadge.badge.name}: ${userBadge.badge.description}`
      );
    },
    [currentUserId]
  );

  return {
    onProphecyCreated: handleProphecyCreated,
    onRatingCreated: handleRatingCreated,
    onRoundCreated: handleRoundCreated,
    onRoundUpdated: handleRoundUpdated,
    onUserUpdated: handleUserUpdated,
    onBadgeAwarded: handleBadgeAwarded,
  };
}
