'use client';

import { memo } from 'react';

export const FogBackground = memo(function FogBackground() {
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
