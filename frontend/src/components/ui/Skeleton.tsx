import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

/** Shimmering placeholder block; hidden from assistive technology. */
export function Skeleton({ className, ...rest }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("skeleton", className)} {...rest} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading table" className={cn("space-y-2", className)}>
      <div className="flex gap-4 border-b border-navy-600 pb-2">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 py-1.5">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Whole-page placeholder used while a lazy route chunk loads. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="animate-fade-in space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}
