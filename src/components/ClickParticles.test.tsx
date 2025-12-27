import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClickParticles } from './ClickParticles';
import { type VelocityParticle } from '@/types/particle';

describe('ClickParticles', () => {
  const mockParticles: VelocityParticle[] = [
    { id: 1, x: 100, y: 200, size: 8, color: '#06b6d4', opacity: 1, vx: 1, vy: 1 },
    { id: 2, x: 150, y: 250, size: 6, color: '#14b8a6', opacity: 0.8, vx: -1, vy: 1 },
  ];

  it('renders nothing when particles array is empty', () => {
    render(<ClickParticles particles={[]} />);
    // Check that no particles are rendered to body
    const particles = document.body.querySelectorAll('.fixed.rounded-full');
    expect(particles.length).toBe(0);
  });

  it('renders particles when array has items', () => {
    render(<ClickParticles particles={mockParticles} />);
    // Particles are rendered via portal to document.body
    const particles = document.body.querySelectorAll('.fixed.rounded-full');
    expect(particles.length).toBe(2);
  });

  it('positions particles correctly', () => {
    render(<ClickParticles particles={mockParticles} />);
    const particles = document.body.querySelectorAll('.fixed.rounded-full');

    const firstParticle = particles[0] as HTMLElement;
    expect(firstParticle.style.left).toBe('100px');
    expect(firstParticle.style.top).toBe('200px');
  });

  it('applies size correctly', () => {
    render(<ClickParticles particles={mockParticles} />);
    const particles = document.body.querySelectorAll('.fixed.rounded-full');

    const firstParticle = particles[0] as HTMLElement;
    expect(firstParticle.style.width).toBe('8px');
    expect(firstParticle.style.height).toBe('8px');
  });

  it('applies color correctly', () => {
    render(<ClickParticles particles={mockParticles} />);
    const particles = document.body.querySelectorAll('.fixed.rounded-full');

    const firstParticle = particles[0] as HTMLElement;
    expect(firstParticle.style.backgroundColor).toBe('rgb(6, 182, 212)');
  });

  it('applies opacity correctly', () => {
    render(<ClickParticles particles={mockParticles} />);
    const particles = document.body.querySelectorAll('.fixed.rounded-full');

    const secondParticle = particles[1] as HTMLElement;
    expect(secondParticle.style.opacity).toBe('0.8');
  });

  it('has pointer-events-none class', () => {
    render(<ClickParticles particles={mockParticles} />);
    const particles = document.body.querySelectorAll('.pointer-events-none');
    expect(particles.length).toBe(2);
  });

  it('has high z-index for visibility', () => {
    render(<ClickParticles particles={mockParticles} />);
    const particles = document.body.querySelectorAll('.fixed.rounded-full');
    const particle = particles[0] as HTMLElement;
    expect(particle).toHaveClass('z-[9999]');
  });
});
