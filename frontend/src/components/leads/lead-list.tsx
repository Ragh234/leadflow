import { PinIcon } from "lucide-react";

import type { Lead } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

import { LeadCard } from "./lead-card";

interface LeadSectionProps {
  title: string;
  leads: Lead[];
  now: Date;
  pinned?: boolean;
  onOpen: (lead: Lead) => void;
}

export function LeadSection({ title, leads, now, pinned = false, onOpen }: LeadSectionProps) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
        {pinned && <PinIcon className="size-3.5 text-rose-500" aria-hidden />}
        {title}
        <span className="font-normal text-slate-400">· {leads.length}</span>
      </h2>
      <ul className="space-y-3">
        {leads.map((lead) => (
          <li key={lead.id}>
            <LeadCard lead={lead} now={now} pinned={pinned} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LeadListSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading leads">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[84px] w-full rounded-xl bg-slate-200/70" />
      ))}
    </div>
  );
}
