'use client';

import { memo, forwardRef, InputHTMLAttributes, useId } from 'react';
import { RequiredAsterisk } from './RequiredAsterisk';

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  error?: string;
}

export const TextInput = memo(
  forwardRef<HTMLInputElement, Readonly<TextInputProps>>(function TextInput(
    { label, description, error, className = '', id, ...props },
    ref
  ) {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
            {props.required && <RequiredAsterisk />}
          </label>
        )}
        {description && <p className="text-xs text-(--text-muted)">{description}</p>}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-3 rounded-lg
            bg-[rgba(16,42,67,0.5)]
            border border-[rgba(98,125,152,0.3)]
            text-foreground text-sm
            placeholder:text-(--text-muted)
            transition-all duration-300
            hover:border-[rgba(98,125,152,0.5)]
            focus:outline-none focus:border-cyan-500
            focus:shadow-[0_0_0_3px_rgba(6,182,212,0.15),0_0_20px_rgba(6,182,212,0.1)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500/50 focus:border-red-500' : ''}
            ${className}
          `.trim()}
          {...props}
        />
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  })
);
