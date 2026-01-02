import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SSEStatusIndicator } from './SSEStatusIndicator';

// Mock user store
let mockConnectionStatus: 'connected' | 'connecting' | 'disconnected' = 'connected';

vi.mock('@/store/useUserStore', () => ({
  useUserStore: (
    selector?: (state: { connectionStatus: typeof mockConnectionStatus }) => unknown
  ) => {
    const state = { connectionStatus: mockConnectionStatus };
    return selector ? selector(state) : state;
  },
}));

describe('SSEStatusIndicator', () => {
  beforeEach(() => {
    mockConnectionStatus = 'connected';
  });

  it('renders indicator element', () => {
    render(<SSEStatusIndicator />);
    expect(screen.getByTitle('SSE: Verbunden')).toBeInTheDocument();
  });

  it('shows cyan color when connected', () => {
    mockConnectionStatus = 'connected';
    render(<SSEStatusIndicator />);
    const indicator = screen.getByTitle('SSE: Verbunden');
    expect(indicator).toHaveStyle({ backgroundColor: '#22d3ee' });
  });

  it('shows yellow color when connecting', () => {
    mockConnectionStatus = 'connecting';
    render(<SSEStatusIndicator />);
    const indicator = screen.getByTitle('SSE: Verbinde...');
    expect(indicator).toHaveStyle({ backgroundColor: '#eab308' });
  });

  it('shows red color when disconnected', () => {
    mockConnectionStatus = 'disconnected';
    render(<SSEStatusIndicator />);
    const indicator = screen.getByTitle('SSE: Getrennt');
    expect(indicator).toHaveStyle({ backgroundColor: '#ef4444' });
  });

  it('has correct glow effect when connected', () => {
    mockConnectionStatus = 'connected';
    render(<SSEStatusIndicator />);
    const indicator = screen.getByTitle('SSE: Verbunden');
    expect(indicator).toHaveStyle({ boxShadow: '0 0 8px 2px rgba(6, 182, 212, 0.6)' });
  });
});
