'use client';

import { memo, useMemo, TextareaHTMLAttributes, ReactNode } from 'react';
import { RequiredAsterisk } from './RequiredAsterisk';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  /** Label for the textarea */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: ReactNode;
}

export const Textarea = memo(function Textarea({
  label,
  required,
  error,
  id,
  ...props
}: Readonly<TextareaProps>) {
  const labelElement = useMemo(() => {
    if (!label) return null;
    return (
      <label htmlFor={id} className="block text-sm font-medium text-[#9fb3c8] mb-1.5">
        {label}
        {required && <RequiredAsterisk />}
      </label>
    );
  }, [label, required, id]);

  const textareaClassName = useMemo(() => {
    const baseClasses =
      'w-full px-4 py-3 rounded-lg bg-[rgba(10,25,41,0.8)] border text-white placeholder:text-(--text-muted) focus:outline-none transition-all resize-none';
    const borderClasses = error
      ? 'border-red-500/50 focus:border-red-400/50 focus:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
      : 'border-[rgba(98,125,152,0.3)] focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)]';
    return `${baseClasses} ${borderClasses}`;
  }, [error]);

  return (
    <div>
      {labelElement}
      <textarea id={id} className={textareaClassName} {...props} />
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
});
