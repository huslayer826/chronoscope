import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  gradientBorder?: boolean;
}

export function Card({
  children,
  className,
  innerClassName,
  gradientBorder = true,
  ...rest
}: CardProps) {
  if (!gradientBorder) {
    return (
      <div
        className={cn(
          "rounded-xl border border-zinc-800/80 bg-zinc-950",
          className,
        )}
        {...rest}
      >
        <div className={cn("p-5", innerClassName)}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 p-[1px]",
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          "h-full w-full rounded-[11px] bg-zinc-950 p-5",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
