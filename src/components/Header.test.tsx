import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from './Header';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock mantine notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock toast styles
vi.mock('@/lib/toast/toast-styles', () => ({
  successToast: vi.fn((title, message) => ({ title, message })),
  errorToast: vi.fn((title, message) => ({ title, message })),
}));

describe('Header', () => {
  const defaultUser = {
    username: 'testuser',
    displayName: 'Test User',
    role: 'USER',
  };

  const adminUser = {
    username: 'admin',
    displayName: 'Admin User',
    role: 'ADMIN',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header element', () => {
    render(<Header user={defaultUser} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays app name/logo', () => {
    render(<Header user={defaultUser} />);
    expect(screen.getByText('Prophe')).toBeInTheDocument();
    expect(screen.getByText('zeiung')).toBeInTheDocument();
  });

  it('displays user display name', () => {
    render(<Header user={defaultUser} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays username if no displayName', () => {
    const user = { username: 'johndoe', displayName: null, role: 'USER' };
    render(<Header user={user} />);
    expect(screen.getByText('johndoe')).toBeInTheDocument();
  });

  it('displays user role for regular user', () => {
    render(<Header user={defaultUser} />);
    expect(screen.getByText('Benutzer')).toBeInTheDocument();
  });

  it('displays Administrator role for admin', () => {
    render(<Header user={adminUser} />);
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('shows admin navigation items for admin users', () => {
    render(<Header user={adminUser} />);
    expect(screen.getByText('Benutzer')).toBeInTheDocument();
    expect(screen.getByText('Runden verwalten')).toBeInTheDocument();
  });

  it('does not show admin navigation items for regular users', () => {
    render(<Header user={defaultUser} />);
    expect(screen.queryByText('Runden verwalten')).not.toBeInTheDocument();
  });

  it('displays user initial in avatar', () => {
    render(<Header user={defaultUser} />);
    // Multiple T's because of mobile and desktop views
    const avatars = screen.getAllByText('T');
    expect(avatars.length).toBeGreaterThan(0);
  });

  it('opens user menu when clicked', () => {
    render(<Header user={defaultUser} />);
    // Find the desktop user menu button (has the user name)
    const userButton = screen.getAllByText('Test User')[0].closest('button');
    fireEvent.click(userButton!);
    expect(screen.getByText('Profil')).toBeInTheDocument();
    expect(screen.getByText('Abmelden')).toBeInTheDocument();
  });

  it('toggles mobile menu', () => {
    render(<Header user={defaultUser} />);
    // Find mobile menu button (md:hidden)
    const mobileButtons = document.querySelectorAll('button.md\\:hidden');
    const mobileMenuButton = mobileButtons[0];

    fireEvent.click(mobileMenuButton);
    // Mobile menu should now be visible with nav items
    const rundenLinks = screen.getAllByText('Runden');
    expect(rundenLinks.length).toBeGreaterThan(0);
  });

  it('has fixed positioning', () => {
    render(<Header user={defaultUser} />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('fixed', 'top-0');
  });

  it('has backdrop blur styling', () => {
    render(<Header user={defaultUser} />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('backdrop-blur-xl');
  });

  it('calls logout API when logout is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    render(<Header user={defaultUser} />);

    // Open user menu
    const userButton = screen.getAllByText('Test User')[0].closest('button');
    fireEvent.click(userButton!);

    // Click logout
    const logoutButton = screen.getByRole('button', { name: 'Abmelden' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    });
  });
});
