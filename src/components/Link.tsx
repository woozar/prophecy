'use client';

import { memo, useCallback } from 'react';
import type { ComponentProps } from 'react';

import NextLink from 'next/link';

import { ClickParticles } from '@/components/ClickParticles';
import { useClickParticles } from '@/hooks/useClickParticles';

type NextLinkProps = ComponentProps<typeof NextLink>;

export const Link = memo(function Link({ children, onClick, ...props }: NextLinkProps) {
  const { containerRef, particles, handleClick } = useClickParticles<HTMLAnchorElement>();

  const onLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      handleClick(e, onClick);
    },
    [handleClick, onClick]
  );

  return (
    <>
      <NextLink ref={containerRef} onClick={onLinkClick} {...props}>
        {children}
      </NextLink>
      <ClickParticles particles={particles} />
    </>
  );
});
