import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/Card";
import { GlowBadge } from "@/components/GlowBadge";
import { PasskeyManager } from "@/components/PasskeyManager";

export default async function ProfilePage() {
  const session = await getSession();

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    include: {
      authenticators: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastUsedAt: true,
          credentialDeviceType: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          prophecies: true,
          ratings: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Profil</h1>

      {/* User Info */}
      <Card padding="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_25px_rgba(6,182,212,0.3)]">
            {(user.displayName || user.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {user.displayName || user.username}
            </h2>
            <p className="text-(--text-muted)">@{user.username}</p>
            <div className="mt-1">
              <GlowBadge size="sm">
                {user.role === "ADMIN" ? "Administrator" : "Benutzer"}
              </GlowBadge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {user._count.prophecies}
            </p>
            <p className="text-sm text-(--text-muted)">Prophezeiungen</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {user._count.ratings}
            </p>
            <p className="text-sm text-(--text-muted)">Bewertungen</p>
          </div>
        </div>
      </Card>

      {/* Passkeys */}
      <PasskeyManager
        initialPasskeys={user.authenticators.map((p) => ({
          id: p.id,
          name: p.name,
          createdAt: p.createdAt.toISOString(),
          lastUsedAt: p.lastUsedAt?.toISOString() || null,
          credentialDeviceType: p.credentialDeviceType || "singleDevice",
        }))}
      />

      {/* Account Info */}
      <Card padding="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-(--text-muted)">Mitglied seit</span>
            <span className="text-(--text-secondary)">
              {user.createdAt.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-(--text-muted)">Status</span>
            <span className="text-green-400">Aktiv</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
