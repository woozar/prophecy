'use client';

import { redirect } from 'next/navigation';

import { UsersManager } from '@/components/admin/UsersManager';
import { useCurrentUser } from '@/hooks/useUser';

export default function AdminUsersPage() {
  const currentUser = useCurrentUser();

  // Wait for user data to load
  if (!currentUser) {
    return null;
  }

  // Redirect non-admins
  if (currentUser.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Benutzer-Verwaltung</h1>
      <UsersManager />
    </div>
  );
}
