import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { UsersManager } from '@/components/admin/UsersManager';

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

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          prophecies: true,
          ratings: true,
        },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Benutzer-Verwaltung</h1>
      <UsersManager
        initialUsers={users.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt.toISOString(),
          _count: u._count,
        }))}
      />
    </div>
  );
}
