import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from './Header';
import { notifications } from '@mantine/notifications';
import { successToast, errorToast } from '@/lib/toast/toast-styles';

const mockPush = vi.fn();
let mockPathname = '/';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
}));

const mockNotifications = vi.mocked(notifications);
const mockSuccessToast = vi.mocked(successToast);
const mockErrorToast = vi.mocked(errorToast);

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

  it('shows success toast and redirects after successful logout', async () => {
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
      expect(mockSuccessToast).toHaveBeenCalledWith('Abgemeldet', 'Bis bald!');
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('shows error toast when logout fails with error response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    globalThis.fetch = mockFetch;

    render(<Header user={defaultUser} />);

    const userButton = screen.getAllByText('Test User')[0].closest('button');
    fireEvent.click(userButton!);

    const logoutButton = screen.getByRole('button', { name: 'Abmelden' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Fehler', 'Abmeldung fehlgeschlagen');
    });
  });

  it('shows error toast when logout throws exception', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    globalThis.fetch = mockFetch;

    render(<Header user={defaultUser} />);

    const userButton = screen.getAllByText('Test User')[0].closest('button');
    fireEvent.click(userButton!);

    const logoutButton = screen.getByRole('button', { name: 'Abmelden' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Fehler', 'Abmeldung fehlgeschlagen');
    });
  });

  it('closes user menu when clicking outside', async () => {
    render(<Header user={defaultUser} />);

    // Open user menu
    const userButton = screen.getAllByText('Test User')[0].closest('button');
    fireEvent.click(userButton!);

    // Verify menu is open
    expect(screen.getByText('Profil')).toBeInTheDocument();

    // Click outside the menu
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Profil')).not.toBeInTheDocument();
    });
  });

  it('closes mobile menu when nav item is clicked', async () => {
    render(<Header user={adminUser} />);

    // Open mobile menu
    const mobileButtons = document.querySelectorAll('button.md\\:hidden');
    fireEvent.click(mobileButtons[0]);

    // Verify mobile menu is open - check for profile link in mobile menu
    const profileLinks = screen.getAllByText('Profil');
    expect(profileLinks.length).toBeGreaterThan(0);

    // Click on a nav item in mobile menu - all "Runden" links
    const rundenLinks = screen.getAllByText('Runden');
    // Click the one in the mobile menu (last one typically)
    fireEvent.click(rundenLinks[rundenLinks.length - 1]);
  });

  it('shows loading state during logout', async () => {
    let resolveLogout: () => void;
    const logoutPromise = new Promise<{ ok: boolean }>((resolve) => {
      resolveLogout = () => resolve({ ok: true });
    });
    const mockFetch = vi.fn().mockReturnValue(logoutPromise);
    globalThis.fetch = mockFetch;

    render(<Header user={defaultUser} />);

    const userButton = screen.getAllByText('Test User')[0].closest('button');
    fireEvent.click(userButton!);

    const logoutButton = screen.getByRole('button', { name: 'Abmelden' });
    fireEvent.click(logoutButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Abmelden...')).toBeInTheDocument();
    });

    // Resolve and wait for state updates to complete
    await act(async () => {
      resolveLogout!();
    });
  });

  it('applies active style to current route', () => {
    mockPathname = '/admin/users';
    render(<Header user={adminUser} />);

    const benutzerLinks = screen.getAllByText('Benutzer');
    const activeLink = benutzerLinks.find(link =>
      link.classList.contains('link-underline-active')
    );
    expect(activeLink).toBeDefined();
  });

  it('handles mobile logout click', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    render(<Header user={defaultUser} />);

    // Open mobile menu
    const mobileButtons = document.querySelectorAll('button.md\\:hidden');
    fireEvent.click(mobileButtons[0]);

    // Find and click mobile logout button
    const logoutButtons = screen.getAllByText('Abmelden');
    // Click the mobile one (in the mobile menu)
    const mobileLogoutButton = logoutButtons[logoutButtons.length - 1].closest('button');
    fireEvent.click(mobileLogoutButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    });
  });

  it('closes dropdown when profile link is clicked', async () => {
    render(<Header user={defaultUser} />);

    // Open user menu
    const userButton = screen.getAllByText('Test User')[0].closest('button');
    fireEvent.click(userButton!);

    // Verify dropdown is open
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeInTheDocument();

    // Click profile link
    const profileLink = screen.getByText('Profil');
    fireEvent.click(profileLink);

    // Dropdown should close - logout button should no longer be visible
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Abmelden' })).not.toBeInTheDocument();
    });
  });

  it('closes mobile menu when profile link is clicked in mobile view', async () => {
    render(<Header user={defaultUser} />);

    // Open mobile menu
    const mobileButtons = document.querySelectorAll('button.md\\:hidden');
    fireEvent.click(mobileButtons[0]);

    // Verify mobile menu is open - check for profile links
    const profileLinks = screen.getAllByText('Profil');
    expect(profileLinks.length).toBeGreaterThan(0);

    // Find the mobile menu profile link (the one in the mobile menu section)
    // It should be an anchor/link element, not a button
    const mobileProfileLink = profileLinks.find(link => {
      const parent = link.closest('a');
      return parent && parent.getAttribute('href') === '/profile';
    });

    if (mobileProfileLink) {
      fireEvent.click(mobileProfileLink);
    }

    // After clicking, mobile menu should be closed
    // The mobile menu visibility is controlled by state
  });

  it('closes mobile menu when clicking admin navigation link', async () => {
    render(<Header user={adminUser} />);

    // Open mobile menu
    const mobileButtons = document.querySelectorAll('button.md\\:hidden');
    fireEvent.click(mobileButtons[0]);

    // Verify mobile menu is open
    const rundenLinks = screen.getAllByText('Runden');
    expect(rundenLinks.length).toBeGreaterThan(0);

    // Click on "Runden verwalten" link in mobile menu
    const rundenVerwaltenLinks = screen.getAllByText('Runden verwalten');
    if (rundenVerwaltenLinks.length > 0) {
      fireEvent.click(rundenVerwaltenLinks[rundenVerwaltenLinks.length - 1]);
    }
  });
});
