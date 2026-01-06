'use client';

import { memo, useMemo, useState } from 'react';

import Image from 'next/image';

type BadgeIconSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface BadgeIconProps {
  badgeKey: string;
  fallbackIcon?: string;
  size?: BadgeIconSize;
  className?: string;
}

const SIZE_CONFIG: Record<BadgeIconSize, { pixels: number; fontSize: string }> = {
  sm: { pixels: 64, fontSize: 'text-4xl' },
  md: { pixels: 80, fontSize: 'text-5xl' },
  lg: { pixels: 112, fontSize: 'text-6xl' },
  xl: { pixels: 144, fontSize: 'text-7xl' },
  '2xl': { pixels: 192, fontSize: 'text-8xl' },
};

export const BadgeIcon = memo(function BadgeIcon({
  badgeKey,
  fallbackIcon,
  size = 'md',
  className = '',
}: Readonly<BadgeIconProps>) {
  const [imageError, setImageError] = useState(false);

  const sizeConfig = useMemo(() => SIZE_CONFIG[size], [size]);
  const imageSrc = useMemo(() => `/badges/${badgeKey}.webp`, [badgeKey]);

  if (imageError && fallbackIcon) {
    return <span className={`${sizeConfig.fontSize} ${className}`}>{fallbackIcon}</span>;
  }

  return (
    <Image
      src={imageSrc}
      alt=""
      width={sizeConfig.pixels}
      height={sizeConfig.pixels}
      className={className}
      onError={() => setImageError(true)}
      unoptimized
    />
  );
});
