'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';

import { IconDeviceFloppy, IconX } from '@tabler/icons-react';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { type AngularParticle } from '@/types/particle';

interface RatingSliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  savedValue?: number;
  onSave?: (value: number) => void;
}

const SLIDER_BURST_COLORS = ['#22d3ee', '#14b8a6', '#8b5cf6', '#a855f7'];

function getSliderColor(value: number): string {
  if (value <= -5) return '#ef4444'; // red
  if (value < 0) return '#f97316'; // orange
  if (value === 0) return '#eab308'; // yellow
  if (value <= 5) return '#22d3ee'; // cyan
  return '#14b8a6'; // teal
}

export const RatingSlider = memo(function RatingSlider({
  value: controlledValue,
  onChange,
  min = -10,
  max = 10,
  label,
  disabled = false,
  savedValue,
  onSave,
}: Readonly<RatingSliderProps>) {
  const reducedMotion = useReducedMotion();
  const [internalValue, setInternalValue] = useState(0);
  const [particles, setParticles] = useState<AngularParticle[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  const particleIdRef = useRef(0);
  const lastValueRef = useRef<number | null>(null);

  const value = controlledValue ?? internalValue;

  const hasUnsavedChanges = useMemo(
    () => savedValue !== undefined && value !== savedValue,
    [savedValue, value]
  );

  const handleSave = useCallback(() => {
    onSave?.(value);
  }, [onSave, value]);

  const handleReset = useCallback(() => {
    onChange?.(savedValue ?? 0);
  }, [onChange, savedValue]);

  const createBurst = useCallback((thumbX: number, thumbY: number) => {
    const newParticles: AngularParticle[] = [];
    const particleCount = 6;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      newParticles.push({
        id: particleIdRef.current++,
        x: thumbX,
        y: thumbY,
        angle,
        speed: 2 + Math.random() * 2,
        opacity: 1,
        size: 2 + Math.random() * 3,
        color: SLIDER_BURST_COLORS[Math.floor(Math.random() * SLIDER_BURST_COLORS.length)],
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);

    // Animate and remove particles
    const particleIds = new Set(newParticles.map((np) => np.id));
    const startTime = Date.now();
    const duration = 400;

    const updateParticle = (p: AngularParticle, progress: number): AngularParticle => ({
      ...p,
      x: p.x + Math.cos(p.angle) * p.speed,
      y: p.y + Math.sin(p.angle) * p.speed,
      opacity: 1 - progress,
      speed: p.speed * 0.95,
    });

    const updateParticles = (prev: AngularParticle[], progress: number) =>
      prev.map((p) => (particleIds.has(p.id) ? updateParticle(p, progress) : p));

    const removeParticles = (prev: AngularParticle[]) => prev.filter((p) => !particleIds.has(p.id));

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        setParticles((prev) => updateParticles(prev, progress));
        requestAnimationFrame(animate);
      } else {
        setParticles(removeParticles);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  const handleChange = useCallback(
    (newValue: number) => {
      // Only burst if value actually changed and reduced motion is not enabled
      if (
        !reducedMotion &&
        lastValueRef.current !== null &&
        lastValueRef.current !== newValue &&
        sliderRef.current
      ) {
        const rect = sliderRef.current.getBoundingClientRect();
        const percentage = (newValue - min) / (max - min);
        const thumbX = percentage * rect.width;
        const thumbY = rect.height / 2;
        createBurst(thumbX, thumbY);
      }
      lastValueRef.current = newValue;

      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [reducedMotion, min, max, createBurst, controlledValue, onChange]
  );

  const color = useMemo(() => getSliderColor(value), [value]);

  const valueStyle = useMemo(
    () => ({
      color,
      textShadow: `0 0 15px ${color}40`,
    }),
    [color]
  );

  const getMarkerPosition = useCallback(
    (value: number) => {
      const percentage = ((value - min) / (max - min)) * 100;
      // Track goes from 10px to calc(100% - 10px)
      return `calc(10px + ${percentage}% - ${percentage * 0.2}px)`;
    },
    [min, max]
  );

  const centerMarkerStyle = useMemo(
    () => ({
      left: getMarkerPosition(0),
      top: '50%',
      height: 14,
      width: 3,
      transform: 'translate(-50%, -50%)',
      background: 'rgba(255, 255, 255, 0.9)',
      boxShadow: `
      0 0 8px rgba(255, 255, 255, 1),
      0 0 16px rgba(255, 255, 255, 0.8),
      0 0 24px rgba(255, 255, 255, 0.5),
      0 0 32px rgba(200, 220, 255, 0.4)
    `,
      filter: 'blur(1px)',
      zIndex: 20,
      animation: 'center-glow-pulse 2s ease-in-out infinite',
    }),
    [getMarkerPosition]
  );

  const tickMarkers = useMemo(() => {
    const markers = [];
    // Only from min+1 to max-1 (skip endpoints and zero)
    for (let i = min + 1; i < max; i++) {
      if (i === 0) continue;
      markers.push({ value: i, left: getMarkerPosition(i) });
    }
    return markers;
  }, [min, max, getMarkerPosition]);

  const tickMarkerStyle = useMemo(
    () => ({
      top: '50%',
      height: 8,
      width: 2,
      transform: 'translate(-50%, -50%)',
      background: 'rgba(255, 255, 255, 0.5)',
      boxShadow: `
      0 0 4px rgba(255, 255, 255, 0.6),
      0 0 8px rgba(255, 255, 255, 0.3)
    `,
      filter: 'blur(0.5px)',
      zIndex: 20,
    }),
    []
  );

  const trackStyle = useMemo(
    () => ({
      left: 10,
      right: 10,
      top: '50%',
      height: 8,
      transform: 'translateY(-50%)',
      background: 'linear-gradient(90deg, #ef4444, #eab308 40%, #22d3ee 60%, #14b8a6)',
      borderRadius: 4,
      zIndex: 0,
    }),
    []
  );

  const focusIndicatorStyle = useMemo(
    () => ({
      left: 7,
      right: 7,
      top: '50%',
      height: 14,
      transform: 'translateY(-50%)',
      border: '2px solid rgba(6, 182, 212, 0.9)',
      borderRadius: 7,
      boxShadow: `
      0 0 8px rgba(6, 182, 212, 0.8),
      0 0 16px rgba(6, 182, 212, 0.5),
      0 0 24px rgba(6, 182, 212, 0.3)
    `,
      zIndex: 1,
    }),
    []
  );

  const saveButtonStyle = useMemo(
    () => ({
      visibility: hasUnsavedChanges ? 'visible' : 'hidden',
    }),
    [hasUnsavedChanges]
  ) as React.CSSProperties;

  const resetButtonStyle = useMemo(
    () => ({
      visibility: hasUnsavedChanges ? 'visible' : 'hidden',
    }),
    [hasUnsavedChanges]
  ) as React.CSSProperties;

  return (
    <div className={disabled ? 'opacity-50' : ''}>
      {label && <h3 className="text-sm font-medium mb-3 text-(--text-secondary)">{label}</h3>}
      {/* Zeile 1: Slider + Wert */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          {/* Custom track */}
          <div className="absolute pointer-events-none" style={trackStyle} />
          {/* Focus indicator */}
          {isFocused && (
            <div className="absolute pointer-events-none" style={focusIndicatorStyle} />
          )}
          {/* Tick markers for all values */}
          {tickMarkers.map((marker) => (
            <div
              key={marker.value}
              className="absolute pointer-events-none"
              style={{ ...tickMarkerStyle, left: marker.left }}
            />
          ))}
          {/* Center zero marker */}
          <div className="absolute pointer-events-none" style={centerMarkerStyle} />
          <input
            ref={sliderRef}
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="rating-slider w-full relative z-10"
            disabled={disabled}
          />
          {/* Burst particles */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                opacity: particle.opacity,
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
        <span
          className="text-lg font-bold w-10 text-right transition-colors duration-300"
          style={valueStyle}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      {/* Zeile 2: Labels + Button (unter dem Slider, nicht unter dem Wert) */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex-1 flex items-center justify-between">
          <span className="text-xs text-(--text-muted) w-16">Sicher</span>
          <div className="flex items-center gap-2">
            {/* Reset-Button (grau) */}
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled || !hasUnsavedChanges}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-500/20 hover:bg-gray-500/40 text-gray-400 transition-colors"
              style={resetButtonStyle}
              aria-label="Änderungen verwerfen"
            >
              <IconX size={20} />
            </button>
            {/* Speichern-Button (cyan) */}
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || !hasUnsavedChanges}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 transition-colors"
              style={saveButtonStyle}
              aria-label="Bewertung speichern"
            >
              <IconDeviceFloppy size={20} />
            </button>
          </div>
          <span className="text-xs text-(--text-muted) w-16 text-right">Unmöglich</span>
        </div>
        {/* Platzhalter für die Wert-Breite */}
        <span className="w-10" />
      </div>
    </div>
  );
});
