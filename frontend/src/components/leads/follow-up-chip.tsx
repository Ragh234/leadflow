import { BellIcon } from "lucide-react";

import { formatFollowUp } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FollowUpChipProps {
  at: string;
  now: Date;
  prefix?: string;
  className?: string;
}

export function FollowUpChip({ at, now, prefix = "Follow-up", className }: FollowUpChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-blue-100/70 px-2 py-1 text-xs font-medium text-blue-700",
        className,
      )}
    >
      <BellIcon className="size-3.5 shrink-0" aria-hidden />
      {prefix} {formatFollowUp(at, now)}
    </span>
  );
}
