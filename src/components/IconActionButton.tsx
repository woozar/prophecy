'use client';

import { ButtonHTMLAttributes, ReactNode, memo, useMemo } from 'react';

import { Button } from '@/components/Button';

type IconActionVariant =
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'ban'
  | 'admin'
  | 'export'
  | 'default';
type IconActionSize = 'sm' | 'default';

interface IconActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** Button variant determines colors */
  variant?: IconActionVariant;
  /** Button size */
  size?: IconActionSize;
  /** Icon to display */
  icon: ReactNode;
}

const sizeStyles: Record<IconActionSize, string> = {
  default: 'p-2 rounded-lg',
  sm: 'p-1.5 rounded',
};

// Base styles shared by most variants
const baseGlass = 'bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)]';

// Color configurations for glass variants
const glassColors = {
  edit: 'text-teal-400 hover:text-teal-300 hover:border-teal-400/50 hover:shadow-[0_0_12px_rgba(20,184,166,0.3)]',
  delete:
    'text-red-400 hover:text-red-300 hover:border-red-400/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  ban: 'text-[#9fb3c8] hover:text-yellow-400 hover:border-yellow-400/50 hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]',
  admin:
    'text-[#9fb3c8] hover:text-violet-400 hover:border-violet-400/50 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]',
  export:
    'text-violet-400 hover:text-violet-300 hover:border-violet-400/50 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]',
  default:
    'text-[#9fb3c8] hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]',
} as const;

const variantStyles: Record<IconActionVariant, string> = {
  edit: `${baseGlass} ${glassColors.edit}`,
  delete: `${baseGlass} ${glassColors.delete}`,
  approve:
    'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]',
  reject:
    'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  ban: `${baseGlass} ${glassColors.ban}`,
  admin: `${baseGlass} ${glassColors.admin}`,
  export: `${baseGlass} ${glassColors.export}`,
  default: `${baseGlass} ${glassColors.default}`,
};

export const IconActionButton = memo(function IconActionButton({
  variant = 'default',
  size = 'default',
  icon,
  ...props
}: Readonly<IconActionButtonProps>) {
  const className = useMemo(() => `${sizeStyles[size]} ${variantStyles[variant]}`, [size, variant]);

  return (
    <Button variant="ghost" className={className} {...props}>
      {icon}
    </Button>
  );
});
