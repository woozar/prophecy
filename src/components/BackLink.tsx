'use client';

import { memo } from 'react';

import Link from 'next/link';

import { IconArrowLeft } from '@tabler/icons-react';

interface BackLinkProps {
  /** URL to navigate to */
  href: string;
  /** Link text */
  children?: string;
}

export const BackLink = memo(function BackLink({
  href,
  children = 'Zurück',
}: Readonly<BackLinkProps>) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm text-(--text-muted) hover:text-cyan-400 transition-colors p-2"
    >
      <IconArrowLeft size={16} aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
});
