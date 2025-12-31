'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { notifications } from '@mantine/notifications';
import { IconChevronDown, IconLogout, IconMenu2, IconUser, IconX } from '@tabler/icons-react';

import { Button } from '@/components/Button';
import { Link } from '@/components/Link';
import { UserAvatar } from '@/components/UserAvatar';
import { apiClient } from '@/lib/api-client';
import { errorToast, successToast } from '@/lib/toast/toast-styles';
import { useUserStore } from '@/store/useUserStore';

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  avatarEffect?: string | null;
  avatarEffectColors?: string[];
  role: string;
}

interface HeaderProps {
  /** User data from server */
  user: User;
}

const navItems = [{ href: '/', label: 'Runden', icon: 'home' }];

const adminItems = [
  { href: '/admin/users', label: 'Benutzer', icon: 'users' },
  { href: '/admin/rounds', label: 'Runden verwalten', icon: 'settings' },
];

export const Header = memo(function Header({ user: serverUser }: Readonly<HeaderProps>) {
  // Use store user if available (for live updates), fallback to server user
  const { currentUserId, users } = useUserStore();
  const storeUser = currentUserId ? users[currentUserId] : undefined;
  const user = storeUser ?? serverUser;
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await apiClient.auth.logout();
      if (error) {
        notifications.show(errorToast('Fehler', 'Abmeldung fehlgeschlagen'));
      } else {
        useUserStore.getState().setCurrentUserId(null);
        notifications.show(successToast('Abgemeldet', 'Bis bald!'));
        router.push('/login');
      }
    } catch {
      notifications.show(errorToast('Fehler', 'Abmeldung fehlgeschlagen'));
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const allNavItems = user.role === 'ADMIN' ? [...navItems, ...adminItems] : navItems;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[rgba(10,25,41,0.85)] backdrop-blur-xl border-b border-[rgba(98,125,152,0.2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold">
              <span className="text-white group-hover:text-cyan-100 transition-colors">Prophe</span>
              <span className="text-cyan-400 group-hover:text-cyan-300 transition-colors">
                zeiung
              </span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {allNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`link-underline ghost-glow text-sm font-medium py-1 px-2 ${
                  isActive(item.href) ? 'link-underline-active' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* User Dropdown (Desktop) */}
            <div className="hidden md:block relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[rgba(98,125,152,0.15)]"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    {user.role === 'ADMIN' ? 'Administrator' : 'Benutzer'}
                  </p>
                </div>
                <UserAvatar user={user} size="md" />
                <IconChevronDown
                  size={16}
                  className={`text-(--text-muted) transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                />
              </Button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-[rgba(10,25,41,0.95)] backdrop-blur-xl border border-[rgba(98,125,152,0.3)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-(--text-secondary) hover:text-white hover:bg-[rgba(98,125,152,0.15)] transition-colors"
                  >
                    <IconUser size={18} />
                    Profil
                  </Link>
                  <div className="border-t border-[rgba(98,125,152,0.2)]" />
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-[rgba(239,68,68,0.1)]"
                  >
                    <IconLogout size={18} />
                    {isLoggingOut ? 'Abmelden...' : 'Abmelden'}
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-(--text-secondary) hover:text-white hover:bg-[rgba(98,125,152,0.15)]"
            >
              {mobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(98,125,152,0.2)] bg-[rgba(10,25,41,0.95)] backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            {/* User Info (Mobile) */}
            <div className="flex items-center gap-3 pb-4 border-b border-[rgba(98,125,152,0.2)]">
              <UserAvatar user={user} size="md" />
              <div>
                <p className="text-sm font-medium text-white">
                  {user.displayName || user.username}
                </p>
                <p className="text-xs text-(--text-muted)">
                  {user.role === 'ADMIN' ? 'Administrator' : 'Benutzer'}
                </p>
              </div>
            </div>

            {/* Nav Items */}
            <div className="flex flex-col items-center gap-2">
              {allNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`link-underline ghost-glow py-2 px-2 text-sm font-medium ${
                    isActive(item.href) ? 'link-underline-active' : ''
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {/* Profile Link */}
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`link-underline ghost-glow py-2 px-2 text-sm font-medium ${
                  isActive('/profile') ? 'link-underline-active' : ''
                }`}
              >
                Profil
              </Link>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-2 py-3 mx-auto text-sm text-red-400 hover:text-red-300"
            >
              <IconLogout size={18} />
              {isLoggingOut ? 'Abmelden...' : 'Abmelden'}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
});
