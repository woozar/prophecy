'use client';

import { ReactNode } from 'react';

import Image from 'next/image';

import { FogBackground } from '@/components/FogBackground';
import { ParticleBurst } from '@/components/ParticleBurst';

interface AuthLayoutProps {
  readonly children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
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
      <main id="main-content" className="min-h-screen flex relative z-10">
        {/* Left side - Splash Image */}
        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
          <div className="relative w-full max-w-lg aspect-square animate-slide-in-left">
            <Image
              src="/splash.png"
              alt="Prophezeiung - Bunte Geister um eine Kristallkugel"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
          {/* Glow effect behind image */}
          <div
            className="absolute inset-0 pointer-events-none animate-fade-in"
            style={{
              background:
                'radial-gradient(circle at center, rgba(6, 182, 212, 0.2) 0%, transparent 50%)',
            }}
          />
        </div>

        {/* Right side - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div
            className="w-full max-w-md animate-slide-in-right opacity-0 animation-delay-200"
            style={{ animationFillMode: 'forwards' }}
          >
            {children}
          </div>
        </div>
      </main>
    </>
  );
}
