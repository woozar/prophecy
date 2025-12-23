/**
 * Particle with velocity vectors (vx, vy).
 * Used in AiButton, Button, Link components.
 */
export interface VelocityParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

/**
 * Particle with angle-based movement.
 * Used in RatingSlider and ParticleBurst components.
 */
export interface AngularParticle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
  opacity: number;
  wobble?: number;
}

export const BURST_COLORS = ["#22d3ee", "#14b8a6", "#06b6d4", "#2dd4bf"];

export const MYSTICAL_COLORS = [
  "#22d3ee", // cyan-400
  "#14b8a6", // teal-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#6366f1", // indigo-500
];

/**
 * Updates velocity particle position and opacity for animation frame.
 */
export function updateVelocityParticle(p: VelocityParticle): VelocityParticle {
  return {
    ...p,
    x: p.x + p.vx,
    y: p.y + p.vy,
    vy: p.vy + 0.15,
    opacity: p.opacity - 0.025,
  };
}

/**
 * Checks if particle should still be rendered.
 */
export function isParticleActive(p: { opacity: number }): boolean {
  return p.opacity > 0;
}
