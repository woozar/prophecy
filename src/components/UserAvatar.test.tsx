import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserAvatar, AvatarPreview } from './UserAvatar';

// Mock the useUser hook
type MockUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  avatarEffect?: string | null;
  avatarEffectColors?: string[];
};

let mockUsersRecord: Record<string, MockUser> = {};

vi.mock('@/hooks/useUser', () => ({
  useUser: (userId: string | undefined) => {
    return userId ? mockUsersRecord[userId] : undefined;
  },
}));

describe('AvatarPreview', () => {
  it('renders initials from username', () => {
    render(<AvatarPreview username="testuser" />);
    expect(screen.getByText('TE')).toBeInTheDocument();
  });

  it('uses displayName for initials when provided', () => {
    render(<AvatarPreview username="jdoe" displayName="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('handles single word names', () => {
    render(<AvatarPreview username="admin" />);
    expect(screen.getByText('AD')).toBeInTheDocument();
  });

  it('handles multi-word display names', () => {
    render(<AvatarPreview username="user" displayName="John Michael Doe" />);
    // Should use first and last name initials
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows name in title attribute', () => {
    render(<AvatarPreview username="testuser" displayName="Test User" />);
    expect(screen.getByTitle('Test User')).toBeInTheDocument();
  });

  it('applies sm size class', () => {
    const { container } = render(<AvatarPreview username="test" size="sm" />);
    expect(container.firstChild).toHaveClass('w-8', 'h-8');
  });

  it('applies md size class by default', () => {
    const { container } = render(<AvatarPreview username="test" />);
    expect(container.firstChild).toHaveClass('w-10', 'h-10');
  });

  it('applies lg size class', () => {
    const { container } = render(<AvatarPreview username="test" size="lg" />);
    expect(container.firstChild).toHaveClass('w-12', 'h-12');
  });

  it('generates consistent color for same username', () => {
    const { container: container1 } = render(<AvatarPreview username="consistent" />);
    const { container: container2 } = render(<AvatarPreview username="consistent" />);

    // Both should have the same color classes
    const el1 = container1.firstChild as HTMLElement;
    const el2 = container2.firstChild as HTMLElement;
    expect(el1.className).toBe(el2.className);
  });

  it('applies custom className', () => {
    const { container } = render(<AvatarPreview username="test" className="ml-2" />);
    expect(container.firstChild).toHaveClass('ml-2');
  });

  it('handles null displayName', () => {
    render(<AvatarPreview username="fallback" displayName={null} />);
    expect(screen.getByText('FA')).toBeInTheDocument();
  });
});

describe('AvatarPreview with effects', () => {
  it('renders without effect by default', () => {
    const { container } = render(<AvatarPreview username="test" />);
    // No glow wrapper classes
    expect(container.querySelector('.animate-avatar-pulse-glow')).not.toBeInTheDocument();
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });

  it('renders with glow effect and applies color via CSS variable', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="glow" avatarEffectColors={['cyan']} />
    );
    // Glow wrapper adds animation class and sets CSS variable for color
    const glowElement = container.querySelector('.animate-avatar-pulse-glow');
    expect(glowElement).toBeInTheDocument();
    expect(glowElement).toHaveStyle({ '--avatar-glow-color': '#22d3ee' });
  });

  it('renders with particles effect', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="particles" avatarEffectColors={['cyan']} />
    );
    // Particles wrapper uses absolute positioned sparkle elements
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('relative');
  });

  it('renders with lightning effect', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="lightning" avatarEffectColors={['cyan']} />
    );
    // Lightning wrapper uses SVG element for the bolt
    expect(container.querySelector('svg')).toBeInTheDocument();
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('relative');
  });

  it('uses default cyan color when no colors provided for glow', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="glow" avatarEffectColors={[]} />
    );
    // Should use cyan as default
    const glowElement = container.querySelector('.animate-avatar-pulse-glow');
    expect(glowElement).toBeInTheDocument();
    expect(glowElement).toHaveStyle({ '--avatar-glow-color': '#22d3ee' });
  });

  it('renders avatar image when avatarUrl is provided', () => {
    render(<AvatarPreview username="test" avatarUrl="/test-avatar.webp" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('applies multiple colors for glow effect starting with first color', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="glow" avatarEffectColors={['violet', 'rose']} />
    );
    // Should start with first color (violet)
    const glowElement = container.querySelector('.animate-avatar-pulse-glow');
    expect(glowElement).toBeInTheDocument();
    expect(glowElement).toHaveStyle({ '--avatar-glow-color': '#a78bfa' });
  });
});

describe('UserAvatar', () => {
  beforeEach(() => {
    mockUsersRecord = {};
  });

  it('shows placeholder when user not found in store', () => {
    render(<UserAvatar userId="unknown-id" />);
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByTitle('Unbekannt')).toBeInTheDocument();
  });

  it('renders user from store', () => {
    mockUsersRecord = {
      'user-1': {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
      },
    };
    render(<UserAvatar userId="user-1" />);
    expect(screen.getByText('TU')).toBeInTheDocument();
    expect(screen.getByTitle('Test User')).toBeInTheDocument();
  });

  it('applies size prop', () => {
    mockUsersRecord = {
      'user-1': {
        id: 'user-1',
        username: 'testuser',
        displayName: null,
      },
    };
    const { container } = render(<UserAvatar userId="user-1" size="lg" />);
    expect(container.firstChild).toHaveClass('w-12', 'h-12');
  });

  it('applies className prop', () => {
    mockUsersRecord = {
      'user-1': {
        id: 'user-1',
        username: 'testuser',
        displayName: null,
      },
    };
    const { container } = render(<UserAvatar userId="user-1" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
