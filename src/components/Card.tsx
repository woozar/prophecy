"use client";

import { ReactNode, memo, useMemo, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Tailwind padding class (default: "p-6") */
  padding?: string;
  /** Grid column span for md breakpoint */
  colSpan?: 1 | 2;
}

interface CardTitleProps {
  children: ReactNode;
}

const CardTitle = memo(function CardTitle({ children }: CardTitleProps) {
  return (
    <h3 className="text-xl font-semibold mb-4 text-highlight">{children}</h3>
  );
});

export const Card = memo(function Card({
  children,
  padding = "p-6",
  colSpan,
  className = "",
  ...props
}: CardProps) {
  const cardClassName = useMemo(() => {
    const classes = ["card-dark", padding];
    if (colSpan === 2) classes.push("md:col-span-2");
    if (className) classes.push(className);
    return classes.join(" ");
  }, [padding, colSpan, className]);

  return (
    <div className={cardClassName} {...props}>
      {children}
    </div>
  );
}) as ReturnType<typeof memo<typeof Card>> & {
  Title: typeof CardTitle;
};

Card.Title = CardTitle;
