import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useUserStore } from '@/store/useUserStore';

import { SSEProvider } from './SSEProvider';

// Mock the useSSE hook
const mockUseSSE = vi.fn();
vi.mock('@/hooks/useSSE', () => ({
  useSSE: () => mockUseSSE(),
}));

describe('SSEProvider', () => {
  it('renders nothing (returns null)', () => {
    const { container } = render(<SSEProvider userId="user-123" />);
    expect(container.firstChild).toBeNull();
  });

  it('calls useSSE hook on mount', () => {
    render(<SSEProvider userId="user-123" />);
    expect(mockUseSSE).toHaveBeenCalled();
  });

  it('sets currentUserId in store', () => {
    render(<SSEProvider userId="user-456" />);
    expect(useUserStore.getState().currentUserId).toBe('user-456');
  });
});
