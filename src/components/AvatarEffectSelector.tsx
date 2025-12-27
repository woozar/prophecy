'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/Button';
import { AvatarPreview } from '@/components/UserAvatar';
import { showSuccessToast, showErrorToast } from '@/lib/toast/toast';
import { IconSparkles, IconBolt, IconCircleDot, IconCircleOff } from '@tabler/icons-react';

type AvatarEffect = 'glow' | 'particles' | 'lightning' | 'none';

interface AvatarEffectSelectorProps {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  currentEffect?: string | null;
  currentColors?: string[];
  onEffectChange: (effect: string | null, colors: string[]) => void;
}

const EFFECTS: { value: AvatarEffect; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'Kein Effekt', icon: <IconCircleOff size={18} /> },
  { value: 'glow', label: 'Glow', icon: <IconSparkles size={18} /> },
  { value: 'particles', label: 'Partikel', icon: <IconCircleDot size={18} /> },
  { value: 'lightning', label: 'Blitze', icon: <IconBolt size={18} /> },
];

const COLORS = [
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'blue', label: 'Blau', class: 'bg-blue-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
];

export const AvatarEffectSelector = memo(function AvatarEffectSelector({
  username,
  displayName,
  avatarUrl,
  currentEffect,
  currentColors = [],
  onEffectChange,
}: Readonly<AvatarEffectSelectorProps>) {
  const [selectedEffect, setSelectedEffect] = useState<AvatarEffect>(
    (currentEffect as AvatarEffect) || 'none'
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(
    currentColors.length > 0 ? currentColors : ['cyan']
  );
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(() => {
    const effectChanged = selectedEffect !== (currentEffect || 'none');
    const sortedSelected = selectedColors.toSorted((a, b) => a.localeCompare(b));
    const sortedCurrent = (currentColors || []).toSorted((a, b) => a.localeCompare(b));
    const colorsChanged = JSON.stringify(sortedSelected) !== JSON.stringify(sortedCurrent);
    return effectChanged || colorsChanged;
  }, [selectedEffect, selectedColors, currentEffect, currentColors]);

  const handleEffectChange = useCallback((effect: AvatarEffect) => {
    setSelectedEffect(effect);
  }, []);

  const handleColorToggle = useCallback((color: string) => {
    setSelectedColors((prev) => {
      if (prev.includes(color)) {
        // Don't allow removing the last color
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== color);
      }
      return [...prev, color];
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/users/me/avatar-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarEffect: selectedEffect,
          avatarEffectColors: selectedColors,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Speichern fehlgeschlagen');
      }

      onEffectChange(selectedEffect === 'none' ? null : selectedEffect, selectedColors);
      showSuccessToast('Effekte gespeichert');
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Speichern fehlgeschlagen');
    } finally {
      setIsSaving(false);
    }
  }, [selectedEffect, selectedColors, onEffectChange]);

  const effectButtonStyle = useCallback(
    (effect: AvatarEffect) => {
      const isSelected = selectedEffect === effect;
      return `flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        isSelected
          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
          : 'bg-[rgba(10,25,41,0.6)] border-[rgba(98,125,152,0.3)] text-(--text-secondary) hover:border-cyan-500/30'
      }`;
    },
    [selectedEffect]
  );

  const colorButtonStyle = useCallback(
    (color: string) => {
      const isSelected = selectedColors.includes(color);
      return `w-8 h-8 rounded-full border-2 transition-all ${
        isSelected
          ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-110'
          : 'border-transparent opacity-60 hover:opacity-100'
      }`;
    },
    [selectedColors]
  );

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex justify-center">
        <AvatarPreview
          username={username}
          displayName={displayName}
          avatarUrl={avatarUrl}
          avatarEffect={selectedEffect === 'none' ? null : selectedEffect}
          avatarEffectColors={selectedColors}
          size="xl"
        />
      </div>

      {/* Effect Selection */}
      <div>
        <h4 className="text-sm font-medium text-(--text-secondary) mb-3">Effekt wählen</h4>
        <div className="grid grid-cols-2 gap-2">
          {EFFECTS.map((effect) => (
            <button
              key={effect.value}
              onClick={() => handleEffectChange(effect.value)}
              className={effectButtonStyle(effect.value)}
            >
              {effect.icon}
              <span className="text-sm">{effect.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection (only show when effect is not 'none') */}
      {selectedEffect !== 'none' && (
        <div>
          <h4 className="text-sm font-medium text-(--text-secondary) mb-3">
            Farben wählen (Mehrfachauswahl)
          </h4>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorToggle(color.value)}
                className={`${colorButtonStyle(color.value)} ${color.class}`}
                title={color.label}
              />
            ))}
          </div>
          <p className="text-xs text-(--text-muted) mt-2">
            Die Animation wählt zufällig aus den ausgewählten Farben.
          </p>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <Button variant="primary" onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? 'Wird gespeichert...' : 'Effekte speichern'}
        </Button>
      )}
    </div>
  );
});
