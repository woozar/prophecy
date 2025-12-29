import { describe, expect, it } from 'vitest';

import {
  BURST_COLORS,
  MYSTICAL_COLORS,
  type VelocityParticle,
  isParticleActive,
  updateVelocityParticle,
} from './particle';

describe('particle utilities', () => {
  describe('updateVelocityParticle', () => {
    it('updates particle position based on velocity', () => {
      const particle: VelocityParticle = {
        id: 1,
        x: 100,
        y: 100,
        vx: 5,
        vy: -3,
        size: 4,
        color: '#22d3ee',
        opacity: 1,
      };

      const updated = updateVelocityParticle(particle);

      expect(updated.x).toBe(105); // x + vx
      expect(updated.y).toBe(97); // y + vy
    });

    it('applies gravity to vertical velocity', () => {
      const particle: VelocityParticle = {
        id: 1,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        color: '#22d3ee',
        opacity: 1,
      };

      const updated = updateVelocityParticle(particle);

      expect(updated.vy).toBe(0.15); // vy + 0.15 gravity
    });

    it('decreases opacity over time', () => {
      const particle: VelocityParticle = {
        id: 1,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        color: '#22d3ee',
        opacity: 1,
      };

      const updated = updateVelocityParticle(particle);

      expect(updated.opacity).toBe(0.975); // opacity - 0.025
    });

    it('preserves other particle properties', () => {
      const particle: VelocityParticle = {
        id: 42,
        x: 0,
        y: 0,
        vx: 1,
        vy: 1,
        size: 8,
        color: '#14b8a6',
        opacity: 0.5,
      };

      const updated = updateVelocityParticle(particle);

      expect(updated.id).toBe(42);
      expect(updated.size).toBe(8);
      expect(updated.color).toBe('#14b8a6');
      expect(updated.vx).toBe(1); // vx stays unchanged
    });

    it('accumulates gravity over multiple updates', () => {
      let particle: VelocityParticle = {
        id: 1,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 4,
        color: '#22d3ee',
        opacity: 1,
      };

      // Simulate 10 frames
      for (let i = 0; i < 10; i++) {
        particle = updateVelocityParticle(particle);
      }

      // vy should have increased by 0.15 * 10 = 1.5
      expect(particle.vy).toBeCloseTo(1.5, 5);
      // opacity should have decreased by 0.025 * 10 = 0.25
      expect(particle.opacity).toBeCloseTo(0.75, 5);
    });
  });

  describe('isParticleActive', () => {
    it('returns true when opacity is positive', () => {
      expect(isParticleActive({ opacity: 1 })).toBe(true);
      expect(isParticleActive({ opacity: 0.5 })).toBe(true);
      expect(isParticleActive({ opacity: 0.001 })).toBe(true);
    });

    it('returns false when opacity is zero', () => {
      expect(isParticleActive({ opacity: 0 })).toBe(false);
    });

    it('returns false when opacity is negative', () => {
      expect(isParticleActive({ opacity: -0.1 })).toBe(false);
    });
  });

  describe('color constants', () => {
    it('BURST_COLORS contains expected colors', () => {
      expect(BURST_COLORS).toContain('#22d3ee');
      expect(BURST_COLORS).toContain('#14b8a6');
      expect(BURST_COLORS).toContain('#06b6d4');
      expect(BURST_COLORS).toContain('#2dd4bf');
      expect(BURST_COLORS.length).toBe(4);
    });

    it('MYSTICAL_COLORS contains expected colors', () => {
      expect(MYSTICAL_COLORS).toContain('#22d3ee'); // cyan-400
      expect(MYSTICAL_COLORS).toContain('#14b8a6'); // teal-500
      expect(MYSTICAL_COLORS).toContain('#8b5cf6'); // violet-500
      expect(MYSTICAL_COLORS).toContain('#a855f7'); // purple-500
      expect(MYSTICAL_COLORS.length).toBe(7);
    });

    it('all colors are valid hex colors', () => {
      const hexColorRegex = /^#[0-9a-f]{6}$/i;

      for (const color of BURST_COLORS) {
        expect(color).toMatch(hexColorRegex);
      }

      for (const color of MYSTICAL_COLORS) {
        expect(color).toMatch(hexColorRegex);
      }
    });
  });
});
