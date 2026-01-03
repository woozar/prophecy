'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/Card';
import { GlowBadge } from '@/components/GlowBadge';
import { type Passkey, PasskeyManager } from '@/components/PasskeyManager';
import { PasswordManagement } from '@/components/PasswordManagement';
import { ProfileAvatarSection } from '@/components/ProfileAvatarSection';
import { UserAvatar } from '@/components/UserAvatar';
import { useCurrentUser } from '@/hooks/useUser';
import { apiClient } from '@/lib/api-client/client';
import { useProphecyStore } from '@/store/useProphecyStore';
import { useRatingStore } from '@/store/useRatingStore';

export default function ProfilePage() {
  const currentUser = useCurrentUser();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(true);

  // Get prophecy count from store
  const prophecyCount = useProphecyStore(
    useCallback(
      (state) =>
        currentUser
          ? Object.values(state.prophecies).filter((p) => p.creatorId === currentUser.id).length
          : 0,
      [currentUser]
    )
  );

  // Get rating count from store
  const ratingCount = useRatingStore(
    useCallback(
      (state) =>
        currentUser
          ? Object.values(state.ratings).filter((r) => r.userId === currentUser.id).length
          : 0,
      [currentUser]
    )
  );

  // Load passkeys on mount
  useEffect(() => {
    async function loadPasskeys() {
      try {
        const { data } = await apiClient.user.passkeys.list();
        if (data?.passkeys) {
          setPasskeys(data.passkeys as Passkey[]);
        }
      } finally {
        setIsLoadingPasskeys(false);
      }
    }
    loadPasskeys();
  }, []);

  const avatarEffectColors = useMemo(() => {
    if (!currentUser?.avatarEffectColors) return [];
    if (Array.isArray(currentUser.avatarEffectColors)) return currentUser.avatarEffectColors;
    try {
      return JSON.parse(currentUser.avatarEffectColors as unknown as string);
    } catch {
      return [];
    }
  }, [currentUser?.avatarEffectColors]);

  const formattedCreatedAt = useMemo(() => {
    if (!currentUser?.createdAt) return '';
    const date = new Date(currentUser.createdAt);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [currentUser?.createdAt]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Profil</h1>

      {/* User Info */}
      <Card padding="p-6">
        <div className="flex items-center gap-4 mb-6">
          <UserAvatar userId={currentUser.id} size="xl" />
          <div>
            <h2 className="text-xl font-semibold text-white">
              {currentUser.displayName || currentUser.username}
            </h2>
            <p className="text-(--text-muted)">@{currentUser.username}</p>
            <div className="mt-1">
              <GlowBadge size="sm">
                {currentUser.role === 'ADMIN' ? 'Administrator' : 'Benutzer'}
              </GlowBadge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">{prophecyCount}</p>
            <p className="text-sm text-(--text-muted)">Prophezeiungen</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">{ratingCount}</p>
            <p className="text-sm text-(--text-muted)">Bewertungen</p>
          </div>
        </div>
      </Card>

      {/* Avatar Upload & Effects */}
      <ProfileAvatarSection
        username={currentUser.username}
        displayName={currentUser.displayName}
        avatarUrl={currentUser.avatarUrl}
        avatarEffect={currentUser.avatarEffect}
        avatarEffectColors={avatarEffectColors}
      />

      {/* Passkeys */}
      {!isLoadingPasskeys && <PasskeyManager initialPasskeys={passkeys} />}

      {/* Password Management */}
      <PasswordManagement hasPasskeys={passkeys.length > 0} />

      {/* Account Info */}
      <Card padding="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-(--text-muted)">Mitglied seit</span>
            <span className="text-(--text-secondary)">{formattedCreatedAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-(--text-muted)">Status</span>
            <span className="text-green-400">Aktiv</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
