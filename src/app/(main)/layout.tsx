import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FogBackground } from "@/components/FogBackground";
import { ParticleBurst } from "@/components/ParticleBurst";
import { SSEProvider } from "@/components/SSEProvider";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

interface MainLayoutProps {
  readonly children: ReactNode;
}

export default async function MainLayout({ children }: MainLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // User-Daten aus der Datenbank holen
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      username: true,
      displayName: true,
      role: true,
      status: true,
    },
  });

  if (user?.status !== "APPROVED") {
    redirect("/login");
  }

  return (
    <>
      <SSEProvider />
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
      <Header user={user} />
      <main className="relative z-10 pt-20 pb-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
