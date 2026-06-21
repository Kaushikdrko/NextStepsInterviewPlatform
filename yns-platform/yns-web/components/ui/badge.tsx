import * as React from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant =
  | "great"
  | "amazing"
  | "help"
  | "neutral"
  | "success"
  | "brand";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  great: "bg-green-50 text-status-great",
  amazing: "bg-gold-50 text-gold-600",
  help: "bg-red-50 text-status-help",
  neutral: "bg-gray-100 text-gray-600",
  success: "bg-green-50 text-green-700",
  brand: "bg-brand-50 text-brand",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
