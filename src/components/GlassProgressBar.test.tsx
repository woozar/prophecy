import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GlassProgressBar } from './GlassProgressBar';

describe('GlassProgressBar', () => {
  it('renders without crashing', () => {
    render(<GlassProgressBar value={50} />);
    // Component renders a div with progress bar
    expect(document.querySelector('.rounded-full')).toBeInTheDocument();
  });

  it('clamps value to minimum of 0', () => {
    const { container } = render(<GlassProgressBar value={-20} />);
    const fillElement = container.querySelector('.transition-all');
    expect(fillElement).toHaveStyle({ width: '0%' });
  });

  it('clamps value to maximum of 100', () => {
    const { container } = render(<GlassProgressBar value={150} />);
    const fillElement = container.querySelector('.transition-all');
    expect(fillElement).toHaveStyle({ width: '100%' });
  });

  it('applies correct fill width for horizontal orientation', () => {
    const { container } = render(<GlassProgressBar value={75} orientation="horizontal" />);
    const fillElement = container.querySelector('.transition-all');
    expect(fillElement).toHaveStyle({ width: '75%', height: '100%' });
  });

  it('applies correct fill height for vertical orientation', () => {
    const { container } = render(<GlassProgressBar value={60} orientation="vertical" />);
    const fillElement = container.querySelector('.transition-all');
    expect(fillElement).toHaveStyle({ height: '60%', width: '100%' });
  });

  it('uses default thickness of 24px', () => {
    const { container } = render(<GlassProgressBar value={50} />);
    const containerElement = container.firstChild;
    expect(containerElement).toHaveStyle({ height: '24px' });
  });

  it('applies custom thickness', () => {
    const { container } = render(<GlassProgressBar value={50} thickness={32} />);
    const containerElement = container.firstChild;
    expect(containerElement).toHaveStyle({ height: '32px' });
  });

  it('applies custom length', () => {
    const { container } = render(<GlassProgressBar value={50} length={200} />);
    const containerElement = container.firstChild;
    expect(containerElement).toHaveStyle({ width: '200px' });
  });

  it('shows edge glow when value is between 0 and 100', () => {
    const { container } = render(<GlassProgressBar value={50} />);
    // There should be multiple absolute positioned elements including the edge glow
    const absoluteElements = container.querySelectorAll('.absolute');
    expect(absoluteElements.length).toBeGreaterThan(3);
  });

  it('does not show edge glow when value is 0', () => {
    const { container } = render(<GlassProgressBar value={0} />);
    const valueAtZero = container.querySelectorAll('.absolute').length;
    const { container: container50 } = render(<GlassProgressBar value={50} />);
    const valueAt50 = container50.querySelectorAll('.absolute').length;
    // Edge glow only shows between 0 and 100, so at 0 there should be fewer elements
    expect(valueAtZero).toBeLessThan(valueAt50);
  });

  it('does not show edge glow when value is 100', () => {
    const { container } = render(<GlassProgressBar value={100} />);
    const valueAt100 = container.querySelectorAll('.absolute').length;
    const { container: container50 } = render(<GlassProgressBar value={50} />);
    const valueAt50 = container50.querySelectorAll('.absolute').length;
    // Edge glow only shows between 0 and 100, so at 100 there should be fewer elements
    expect(valueAt100).toBeLessThan(valueAt50);
  });

  it('applies vertical orientation styles correctly', () => {
    const { container } = render(
      <GlassProgressBar value={50} orientation="vertical" thickness={20} length={200} />
    );
    const containerElement = container.firstChild;
    expect(containerElement).toHaveStyle({ width: '20px', height: '200px' });
  });
});
