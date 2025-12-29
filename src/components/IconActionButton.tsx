'use client';

import { ButtonHTMLAttributes, ReactNode, memo, useMemo } from 'react';

import { Button } from '@/components/Button';

type IconActionVariant = 'edit' | 'delete' | 'approve' | 'reject' | 'ban' | 'admin' | 'default';

interface IconActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** Button variant determines colors */
  variant?: IconActionVariant;
  /** Icon to display */
  icon: ReactNode;
}

const variantStyles: Record<IconActionVariant, string> = {
  edit: 'p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]',
  delete:
    'p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-red-400 hover:border-red-400/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  approve:
    'p-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]',
  reject:
    'p-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  ban: 'p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-yellow-400 hover:border-yellow-400/50 hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]',
  admin:
    'p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-violet-400 hover:border-violet-400/50 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]',
  default:
    'p-2 rounded-lg bg-[rgba(10,25,41,0.6)] border border-[rgba(98,125,152,0.3)] text-[#9fb3c8] hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]',
};

export const IconActionButton = memo(function IconActionButton({
  variant = 'default',
  icon,
  ...props
}: Readonly<IconActionButtonProps>) {
  const className = useMemo(() => variantStyles[variant], [variant]);

  return (
    <Button variant="ghost" className={className} {...props}>
      {icon}
    </Button>
  );
});
