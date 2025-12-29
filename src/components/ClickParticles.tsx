'use client';

import { memo } from 'react';

import { createPortal } from 'react-dom';

import { type VelocityParticle } from '@/types/particle';

interface ClickParticlesProps {
  particles: VelocityParticle[];
}

/**
 * Renders click particles in a portal to escape overflow:hidden containers.
 */
export const ClickParticles = memo(function ClickParticles({
  particles,
}: Readonly<ClickParticlesProps>) {
  if (particles.length === 0 || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="fixed rounded-full pointer-events-none z-[9999]"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </>,
    document.body
  );
});
