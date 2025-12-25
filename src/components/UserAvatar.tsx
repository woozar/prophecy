'use client';

import { memo, useMemo } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface UserAvatarProps {
  /** Username to generate initials from */
  username: string;
  /** Optional display name (used for initials if provided) */
  displayName?: string | null;
  /** Size of the avatar */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

/**
 * Generate a consistent color based on a string
 */
function getColorFromString(str: string): string {
  const colors = [
    'bg-cyan-500/30 text-cyan-300 border-cyan-500/50',
    'bg-violet-500/30 text-violet-300 border-violet-500/50',
    'bg-green-500/30 text-green-300 border-green-500/50',
    'bg-amber-500/30 text-amber-300 border-amber-500/50',
    'bg-rose-500/30 text-rose-300 border-rose-500/50',
    'bg-blue-500/30 text-blue-300 border-blue-500/50',
    'bg-teal-500/30 text-teal-300 border-teal-500/50',
    'bg-pink-500/30 text-pink-300 border-pink-500/50',
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const lastPart = parts.at(-1) ?? '';
    return (parts[0][0] + lastPart[0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export const UserAvatar = memo(function UserAvatar({
  username,
  displayName,
  size = 'md',
  className = '',
}: Readonly<UserAvatarProps>) {
  const name = displayName || username;
  const initials = useMemo(() => getInitials(name), [name]);
  const colorClass = useMemo(() => getColorFromString(username), [username]);
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-medium border ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
});
