import { formatTimestamp, timeAgo } from "@/lib/format";
import type { Discussion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import { FollowUpChip } from "./follow-up-chip";

interface DiscussionTimelineProps {
  discussions: Discussion[] | undefined;
  isPending: boolean;
  error: Error | null;
  leadCreatedAt: string;
  now: Date;
}

function Entry({ at, now, first, last, children }: {
  at: string;
  now: Date;
  first: boolean;
  last: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pl-7">
      {!last && <span aria-hidden className="absolute top-4 -bottom-5 left-[4.5px] w-px bg-slate-200" />}
      <span
        aria-hidden
        className={cn(
          "absolute top-1.5 left-0 size-2.5 rounded-full ring-4 ring-slate-50",
          first ? "bg-blue-500" : "bg-slate-300",
        )}
      />
      <p className="text-xs text-slate-500">
        <time dateTime={at}>{formatTimestamp(at, now)}</time>
        <span className="text-slate-400"> ({timeAgo(at, now)})</span>
      </p>
      <div className="mt-1.5">{children}</div>
    </li>
  );
}

/** Newest first, as returned by the API, ending with the moment the lead was created. */
export function DiscussionTimeline({ discussions, isPending, error, leadCreatedAt, now }: DiscussionTimelineProps) {
  if (isPending) {
    return (
      <div className="space-y-4" aria-label="Loading discussions">
        <Skeleton className="h-16 w-full bg-slate-200/70" />
        <Skeleton className="h-16 w-full bg-slate-200/70" />
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-rose-600">Couldn&apos;t load the discussions: {error.message}</p>;
  }

  const items = discussions ?? [];
  return (
    <ol aria-label="Discussion history" className="space-y-5">
      {items.map((discussion, index) => (
        <Entry key={discussion.id} at={discussion.created_at} now={now} first={index === 0} last={false}>
          <div className="rounded-lg border bg-white p-3 text-sm text-slate-800 shadow-xs">
            <p className="break-words whitespace-pre-wrap">{discussion.note}</p>
            {discussion.follow_up_at && (
              <FollowUpChip
                at={discussion.follow_up_at}
                now={now}
                prefix="Follow-up set for"
                historical
                className="mt-2"
              />
            )}
          </div>
        </Entry>
      ))}
      <Entry at={leadCreatedAt} now={now} first={items.length === 0} last>
        <p className="rounded-lg border border-dashed bg-white/60 p-3 text-sm text-slate-500 italic">
          Lead created.{items.length === 0 && " No discussions yet, log the first one below."}
        </p>
      </Entry>
    </ol>
  );
}
