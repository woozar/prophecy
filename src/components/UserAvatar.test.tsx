import { createContext } from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AvatarPreview, UserAvatar } from './UserAvatar';

// Mock the UserProfileModalContext - use vi.hoisted for proper hoisting
const { mockOpenUserProfile, mockCloseUserProfile } = vi.hoisted(() => ({
  mockOpenUserProfile: vi.fn(),
  mockCloseUserProfile: vi.fn(),
}));

vi.mock('@/contexts/UserProfileModalContext', () => ({
  UserProfileModalContext: createContext({
    openUserProfile: mockOpenUserProfile,
    closeUserProfile: mockCloseUserProfile,
  }),
}));

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

  it('renders with halo effect', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="halo" avatarEffectColors={['cyan']} />
    );
    // Halo wrapper uses SVG element for the ellipse ring
    expect(container.querySelector('svg')).toBeInTheDocument();
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('relative');
    // Should have ellipse elements for the halo ring
    expect(container.querySelector('ellipse')).toBeInTheDocument();
  });

  it('renders with fire effect', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="fire" avatarEffectColors={['cyan']} />
    );
    // Fire wrapper uses SVG element for flame particles
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

  it('shows initials when avatar image fails to load', () => {
    render(<AvatarPreview username="testuser" avatarUrl="/broken-image.webp" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByText('TE')).toBeInTheDocument();
  });

  it('handles image load event', async () => {
    const { container } = render(<AvatarPreview username="test" avatarUrl="/test-avatar.webp" />);
    const img = screen.getByRole('img');
    await act(async () => {
      fireEvent.load(img);
    });
    // Image should still be visible after load
    expect(container.querySelector('img')).toBeInTheDocument();
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

  it('renders user from direct user prop instead of store', () => {
    const directUser = {
      username: 'directuser',
      displayName: 'Direct User',
      avatarUrl: null,
      avatarEffect: null,
    };
    render(<UserAvatar user={directUser} />);
    expect(screen.getByText('DU')).toBeInTheDocument();
    expect(screen.getByTitle('Direct User')).toBeInTheDocument();
  });

  it('renders avatar effect from user prop', () => {
    const userWithEffect = {
      username: 'effectuser',
      displayName: 'Effect User',
      avatarUrl: null,
      avatarEffect: 'glow',
      avatarEffectColors: ['cyan'],
    };
    const { container } = render(<UserAvatar user={userWithEffect} />);
    expect(container.querySelector('.animate-avatar-pulse-glow')).toBeInTheDocument();
  });

  it('renders xl size correctly', () => {
    mockUsersRecord = {
      'user-xl': {
        id: 'user-xl',
        username: 'xluser',
        displayName: 'XL User',
      },
    };
    const { container } = render(<UserAvatar userId="user-xl" size="xl" />);
    expect(container.firstChild).toHaveClass('w-16', 'h-16');
  });

  it('renders sm size correctly', () => {
    mockUsersRecord = {
      'user-sm': {
        id: 'user-sm',
        username: 'smuser',
        displayName: 'SM User',
      },
    };
    const { container } = render(<UserAvatar userId="user-sm" size="sm" />);
    expect(container.firstChild).toHaveClass('w-8', 'h-8');
  });
});

describe('AvatarPreview with color fallback', () => {
  it('uses default cyan when unknown color provided', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="glow" avatarEffectColors={['unknowncolor']} />
    );
    const glowElement = container.querySelector('.animate-avatar-pulse-glow');
    expect(glowElement).toBeInTheDocument();
    // Falls back to cyan
    expect(glowElement).toHaveStyle({ '--avatar-glow-color': '#22d3ee' });
  });

  it('uses green color for glow effect', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="glow" avatarEffectColors={['green']} />
    );
    const glowElement = container.querySelector('.animate-avatar-pulse-glow');
    expect(glowElement).toHaveStyle({ '--avatar-glow-color': '#4ade80' });
  });

  it('uses orange color for glow effect', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="glow" avatarEffectColors={['orange']} />
    );
    const glowElement = container.querySelector('.animate-avatar-pulse-glow');
    expect(glowElement).toHaveStyle({ '--avatar-glow-color': '#fb923c' });
  });

  it('uses pink color for glow effect', () => {
    const { container } = render(
      <AvatarPreview username="test" avatarEffect="glow" avatarEffectColors={['pink']} />
    );
    const glowElement = container.querySelector('.animate-avatar-pulse-glow');
    expect(glowElement).toHaveStyle({ '--avatar-glow-color': '#f472b6' });
  });
});

describe('UserAvatar clickable behavior', () => {
  beforeEach(() => {
    mockUsersRecord = {
      'user-1': {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
      },
    };
    mockOpenUserProfile.mockClear();
  });

  it('renders as button when clickable is true', () => {
    render(<UserAvatar userId="user-1" clickable />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not render as button when clickable is false', () => {
    render(<UserAvatar userId="user-1" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls openUserProfile from context when clicked', () => {
    render(<UserAvatar userId="user-1" clickable />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockOpenUserProfile).toHaveBeenCalledWith(mockUsersRecord['user-1']);
  });

  it('calls custom onClick instead of openUserProfile when provided', () => {
    const customClick = vi.fn();
    render(<UserAvatar userId="user-1" clickable onClick={customClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(customClick).toHaveBeenCalled();
    expect(mockOpenUserProfile).not.toHaveBeenCalled();
  });

  it('renders as button when onClick is provided even without clickable prop', () => {
    const customClick = vi.fn();
    render(<UserAvatar userId="user-1" onClick={customClick} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies cursor-pointer class to clickable avatar', () => {
    render(<UserAvatar userId="user-1" clickable />);
    expect(screen.getByRole('button')).toHaveClass('cursor-pointer');
  });
});
