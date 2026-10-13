import { AlarmClockIcon, BellIcon } from "lucide-react";

import { isFollowUpOverdue } from "@/lib/follow-up";
import { formatFollowUp } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FollowUpChipProps {
  at: string;
  now: Date;
  prefix?: string;
  /**
   * A lead's current follow-up turns red once it is overdue. Chips in the timeline are a
   * record of what was planned at the time, so they pass `historical` and stay neutral.
   */
  historical?: boolean;
  className?: string;
}

export function FollowUpChip({ at, now, prefix = "Follow-up", historical = false, className }: FollowUpChipProps) {
  const overdue = !historical && isFollowUpOverdue(at, now);
  const Icon = overdue ? AlarmClockIcon : BellIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        overdue ? "bg-rose-100 text-rose-700" : "bg-blue-100/70 text-blue-700",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {prefix} {formatFollowUp(at, now)}
      {overdue && <span className="font-semibold">· Overdue</span>}
    </span>
  );
}
