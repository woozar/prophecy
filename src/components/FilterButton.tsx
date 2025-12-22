"use client";

import { memo, useMemo, ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/Button";

interface FilterButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** Whether this filter is currently active */
  active?: boolean;
  /** The content to display (usually label with count) */
  children: ReactNode;
}

export const FilterButton = memo(function FilterButton({
  active = false,
  children,
  ...props
}: Readonly<FilterButtonProps>) {
  const className = useMemo(
    () =>
      `px-3 py-1.5 text-sm rounded-lg ${
        active
          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/50"
          : "bg-[rgba(98,125,152,0.15)] text-(--text-muted) border border-transparent hover:border-[rgba(98,125,152,0.3)]"
      }`,
    [active]
  );

  return (
    <Button variant="ghost" className={className} {...props}>
      {children}
    </Button>
  );
});
