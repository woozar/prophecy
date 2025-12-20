"use client";

import { ReactNode, memo, useMemo, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Button variant */
  variant?: "primary" | "outline";
}

export const Button = memo(function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const buttonClassName = useMemo(() => {
    const variantClass = variant === "primary" ? "btn-primary" : "btn-outline";
    return `${variantClass} ${className}`.trim();
  }, [variant, className]);

  return (
    <button className={buttonClassName} {...props}>
      <span>{children}</span>
    </button>
  );
});
