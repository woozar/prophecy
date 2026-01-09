import { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { FogBackground } from '@/components/FogBackground';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ParticleBurst } from '@/components/ParticleBurst';
import { SSEProvider } from '@/components/SSEProvider';
import { UserProfileModalProvider } from '@/contexts/UserProfileModalContext';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

interface MainLayoutProps {
  readonly children: ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // User-Daten aus der Datenbank holen (inkl. Avatar-Felder)
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      avatarEffect: true,
      avatarEffectColors: true,
      role: true,
      status: true,
    },
  });

  if (user?.status !== 'APPROVED') {
    redirect('/login');
  }

  // Parse avatarEffectColors from JSON string to array
  const headerUser = {
    ...user,
    avatarEffectColors: user.avatarEffectColors
      ? (JSON.parse(user.avatarEffectColors) as string[])
      : undefined,
  };

  return (
    <>
      <SSEProvider userId={session.userId} />
      <ParticleBurst
        particleCount={6}
        desktopMinInterval={20000}
        desktopMaxInterval={35000}
        mobileMinInterval={300}
        mobileMaxInterval={600}
        speed={2}
        fadeDuration={1200}
      />
      <FogBackground />
      <Header user={headerUser} />
      <main id="main-content" className="relative z-10 pt-16 pb-12 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <UserProfileModalProvider>{children}</UserProfileModalProvider>
        </div>
      </main>
      <Footer />
    </>
  );
}
