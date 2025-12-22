import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SSEProvider } from './SSEProvider';

// Mock the useSSE hook
const mockUseSSE = vi.fn();
vi.mock('@/hooks/useSSE', () => ({
  useSSE: () => mockUseSSE(),
}));

describe('SSEProvider', () => {
  it('renders nothing (returns null)', () => {
    const { container } = render(<SSEProvider />);
    expect(container.firstChild).toBeNull();
  });

  it('calls useSSE hook on mount', () => {
    render(<SSEProvider />);
    expect(mockUseSSE).toHaveBeenCalled();
  });
});
