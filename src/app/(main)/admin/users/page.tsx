import { redirect } from 'next/navigation';

import { UsersManager } from '@/components/admin/UsersManager';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export default async function AdminUsersPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Benutzer-Verwaltung</h1>
      <UsersManager />
    </div>
  );
}
