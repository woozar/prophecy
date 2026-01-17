'use client';

import { memo } from 'react';

import { useReducedMotion } from '@/hooks/useReducedMotion';

export const FogBackground = memo(function FogBackground() {
  const reducedMotion = useReducedMotion();

  // Don't render animated fog when reduced motion is preferred
  if (reducedMotion) {
    return null;
  }

  return (
    <div className="fog-container">
      <div className="fog-layer fog-layer-1" />
      <div className="fog-layer fog-layer-2" />
      <div className="fog-layer fog-layer-3" />
      <div className="fog-layer fog-layer-4" />
      <div className="fog-layer fog-layer-5" />
    </div>
  );
});
