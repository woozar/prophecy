'use client';

import { memo, useCallback, useState } from 'react';

import { Switch } from '@mantine/core';

import { Card } from '@/components/Card';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { useUserStore } from '@/store/useUserStore';

interface UserPreferencesSectionProps {
  animationsEnabled: boolean;
}

export const UserPreferencesSection = memo(function UserPreferencesSection({
  animationsEnabled: initialAnimationsEnabled,
}: UserPreferencesSectionProps) {
  const [animationsEnabled, setAnimationsEnabled] = useState(initialAnimationsEnabled);
  const [isUpdating, setIsUpdating] = useState(false);
  const setUser = useUserStore((state) => state.setUser);
  const currentUserId = useUserStore((state) => state.currentUserId);
  const users = useUserStore((state) => state.users);

  const handleToggleAnimations = useCallback(async () => {
    const newValue = !animationsEnabled;
    setIsUpdating(true);

    try {
      const { data, error } = await apiClient.user.preferences.update({
        animationsEnabled: newValue,
      });

      if (error) {
        showErrorToast(
          (error as { error?: string }).error || 'Fehler beim Aktualisieren der Einstellungen'
        );
        return;
      }

      if (data) {
        setAnimationsEnabled(data.animationsEnabled);
        // Update the store with the new value
        if (currentUserId && users[currentUserId]) {
          setUser({
            ...users[currentUserId],
            animationsEnabled: data.animationsEnabled,
          });
        }
        showSuccessToast(
          data.animationsEnabled ? 'Animationen aktiviert' : 'Animationen deaktiviert'
        );
      }
    } catch {
      showErrorToast('Verbindungsfehler');
    } finally {
      setIsUpdating(false);
    }
  }, [animationsEnabled, currentUserId, setUser, users]);

  return (
    <Card padding="p-6">
      <h3 className="text-lg font-semibold text-cyan-400 mb-4">Einstellungen</h3>

      <div className="space-y-4">
        {/* Animations Toggle */}
        <Switch
          checked={animationsEnabled}
          onChange={handleToggleAnimations}
          disabled={isUpdating}
          label="Animationen"
          description="Deaktiviere Animationen für eine ruhigere Darstellung. Die Einstellung für reduzierte Bewegung deines Betriebssystems wird ebenfalls berücksichtigt."
          size="md"
          color="cyan"
        />
      </div>
    </Card>
  );
});
