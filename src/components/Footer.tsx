'use client';

import { memo } from 'react';

import { Link } from '@/components/Link';

export const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[rgba(10,25,41,0.85)] backdrop-blur-xl border-t border-[rgba(98,125,152,0.2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Copyright */}
          <p className="text-xs text-(--text-muted)">
            &copy; {currentYear}{' '}
            <Link
              href="https://github.com/woozar/prophecy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Prophezeiung
            </Link>
          </p>

          {/* Version / Links */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-(--text-muted)">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
});
