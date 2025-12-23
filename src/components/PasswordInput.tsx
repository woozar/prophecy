"use client";

import { memo, forwardRef, InputHTMLAttributes, useId, useState, useCallback } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { Button } from "./Button";
import { RequiredAsterisk } from "./RequiredAsterisk";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  label?: string;
  description?: string;
  error?: string;
}

export const PasswordInput = memo(forwardRef<HTMLInputElement, Readonly<PasswordInputProps>>(
  function PasswordInput({ label, description, error, className = "", id, ...props }, ref) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = useCallback(() => {
      setShowPassword(prev => !prev);
    }, []);

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-(--text-primary)"
          >
            {label}
            {props.required && <RequiredAsterisk />}
          </label>
        )}
        {description && (
          <p className="text-xs text-(--text-muted)">{description}</p>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
            className={`
              w-full px-4 py-3 pr-12 rounded-lg
              bg-[rgba(16,42,67,0.5)]
              border border-[rgba(98,125,152,0.3)]
              text-(--text-primary) text-sm
              placeholder:text-(--text-muted)
              transition-all duration-300
              hover:border-[rgba(98,125,152,0.5)]
              focus:outline-none focus:border-cyan-500
              focus:shadow-[0_0_0_3px_rgba(6,182,212,0.15),0_0_20px_rgba(6,182,212,0.1)]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-red-500/50 focus:border-red-500" : ""}
              ${className}
            `.trim()}
            {...props}
          />
          <Button
            variant="ghost"
            type="button"
            onClick={toggleVisibility}
            disabled={props.disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-(--text-muted) hover:text-(--text-secondary) focus:ring-2 focus:ring-cyan-500/50"
            tabIndex={-1}
            aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
          >
            {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-0.5">{error}</p>
        )}
      </div>
    );
  }
));
