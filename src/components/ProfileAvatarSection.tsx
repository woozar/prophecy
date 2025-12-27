'use client';

import { memo, useState, useCallback } from 'react';
import { Card } from '@/components/Card';
import { AvatarUpload } from '@/components/AvatarUpload';
import { AvatarEffectSelector } from '@/components/AvatarEffectSelector';

interface ProfileAvatarSectionProps {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatarEffect?: string | null;
  avatarEffectColors?: string[];
}

export const ProfileAvatarSection = memo(function ProfileAvatarSection({
  username,
  displayName,
  avatarUrl: initialAvatarUrl,
  avatarEffect: initialAvatarEffect,
  avatarEffectColors: initialAvatarEffectColors = [],
}: Readonly<ProfileAvatarSectionProps>) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarEffect, setAvatarEffect] = useState(initialAvatarEffect);
  const [avatarEffectColors, setAvatarEffectColors] = useState(initialAvatarEffectColors);

  const handleAvatarChange = useCallback((url: string | null) => {
    setAvatarUrl(url);
  }, []);

  const handleEffectChange = useCallback((effect: string | null, colors: string[]) => {
    setAvatarEffect(effect);
    setAvatarEffectColors(colors);
  }, []);

  return (
    <Card padding="p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Avatar & Effekte</h3>

      <div className="space-y-8">
        {/* Avatar Upload */}
        <div>
          <h4 className="text-sm font-medium text-(--text-secondary) mb-4">Profilbild</h4>
          <AvatarUpload
            username={username}
            displayName={displayName}
            avatarUrl={avatarUrl}
            avatarEffect={avatarEffect}
            avatarEffectColors={avatarEffectColors}
            onAvatarChange={handleAvatarChange}
          />
        </div>

        <div className="border-t border-[rgba(98,125,152,0.2)]" />

        {/* Effect Selector */}
        <AvatarEffectSelector
          username={username}
          displayName={displayName}
          avatarUrl={avatarUrl}
          currentEffect={avatarEffect}
          currentColors={avatarEffectColors}
          onEffectChange={handleEffectChange}
        />
      </div>
    </Card>
  );
});
