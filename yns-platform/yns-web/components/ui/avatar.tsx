import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface AvatarProps {
  src?: string | null;
  alt: string;
  /** Fallback initials shown when no image is available. */
  fallback?: string;
  className?: string;
}

const sizeFallback = "flex items-center justify-center bg-brand-50 text-brand font-semibold";

export function Avatar({ src, alt, fallback, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
    >
      {src ? (
        // Plain img keeps the component dependency-free for mock avatars.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className={cn(sizeFallback, "h-full w-full text-sm")}>
          {fallback ?? alt.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
