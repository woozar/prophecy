import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FogBackground } from './FogBackground';

describe('FogBackground', () => {
  it('renders fog container', () => {
    const { container } = render(<FogBackground />);
    expect(container.querySelector('.fog-container')).toBeInTheDocument();
  });

  it('renders all five fog layers', () => {
    const { container } = render(<FogBackground />);
    expect(container.querySelector('.fog-layer-1')).toBeInTheDocument();
    expect(container.querySelector('.fog-layer-2')).toBeInTheDocument();
    expect(container.querySelector('.fog-layer-3')).toBeInTheDocument();
    expect(container.querySelector('.fog-layer-4')).toBeInTheDocument();
    expect(container.querySelector('.fog-layer-5')).toBeInTheDocument();
  });

  it('renders exactly 5 fog layer elements', () => {
    const { container } = render(<FogBackground />);
    const fogLayers = container.querySelectorAll('.fog-layer');
    expect(fogLayers).toHaveLength(5);
  });

  it('fog layers are children of fog container', () => {
    const { container } = render(<FogBackground />);
    const fogContainer = container.querySelector('.fog-container');
    expect(fogContainer?.children).toHaveLength(5);
  });
});
