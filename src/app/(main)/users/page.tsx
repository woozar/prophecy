'use client';

import { Link } from '@/components/Link';
import { UsersManager } from '@/components/admin/UsersManager';
import { useCurrentUser } from '@/hooks/useUser';

export default function UsersPage() {
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Wait for user data to load
  if (!currentUser) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          {isAdmin ? 'Benutzer-Verwaltung' : 'Benutzer'}
        </h1>
        <Link
          href="/users/badges"
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Badge-Galerie →
        </Link>
      </div>
      <UsersManager />
    </div>
  );
}
