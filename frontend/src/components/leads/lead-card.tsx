import { timeAgo } from "@/lib/format";
import { isClosed } from "@/lib/status";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

import { FollowUpChip } from "./follow-up-chip";
import { StatusBadge } from "./status-badge";

interface LeadCardProps {
  lead: Lead;
  now: Date;
  pinned?: boolean;
  onOpen: (lead: Lead) => void;
}

export function LeadCard({ lead, now, pinned = false, onOpen }: LeadCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(lead)}
      className={cn(
        "w-full rounded-xl border bg-white p-4 text-left shadow-xs transition-[border-color,box-shadow]",
        "hover:border-slate-300 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        pinned && "border-blue-200 bg-blue-50/70 hover:border-blue-300",
        !pinned && isClosed(lead.status) && "opacity-60 hover:opacity-100",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate">
          <span className="font-semibold text-slate-900">{lead.name}</span>
          {lead.company && <span className="text-sm text-slate-500"> ({lead.company})</span>}
        </p>
        <StatusBadge status={lead.status} className="shrink-0" />
      </div>

      <div className="mt-1.5 flex min-w-0 items-baseline gap-2 text-sm">
        {lead.last_discussion_note ? (
          <>
            <p className="min-w-0 truncate text-slate-600">
              <span className="font-medium text-slate-800">Last note:</span> {lead.last_discussion_note}
            </p>
            <time dateTime={lead.last_discussion_at ?? undefined} className="shrink-0 text-xs text-slate-400">
              {timeAgo(lead.last_discussion_at, now)}
            </time>
          </>
        ) : (
          <p className="text-slate-400 italic">No discussions yet</p>
        )}
      </div>

      {lead.next_follow_up_at && <FollowUpChip at={lead.next_follow_up_at} now={now} className="mt-3" />}
    </button>
  );
}
