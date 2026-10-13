"use client";

import { PlusIcon, SearchIcon, TrendingUpIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLeads } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { type FollowUpFilter as FollowUpFilterValue, matchesFollowUpFilter, splitPinned } from "@/lib/follow-up";
import { STATUS_META } from "@/lib/status";
import type { Lead } from "@/lib/types";

import { AddLeadDialog } from "./add-lead-dialog";
import { FollowUpFilter } from "./follow-up-filter";
import { LeadDialog } from "./lead-dialog";
import { LeadListSkeleton, LeadSection } from "./lead-list";
import { StatusFilter, type StatusFilterValue } from "./status-filter";

export function LeadsView() {
  const now = useNow();
  const [status, setStatus] = useState<StatusFilterValue>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const [followUp, setFollowUp] = useState<FollowUpFilterValue>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);

  const leadsQuery = useLeads({ status: status === "all" ? undefined : status, search: debouncedSearch || undefined });
  const { pinned, rest } = useMemo(
    () => {
      if (!now) return { pinned: [], rest: [] };
      const visible = (leadsQuery.data ?? []).filter((lead) => matchesFollowUpFilter(lead.next_follow_up_at, followUp, now));
      return splitPinned(visible, now);
    },
    [leadsQuery.data, followUp, now],
  );

  const isUnfiltered = status === "all" && !debouncedSearch && followUp === "all";

  function openLead(lead: Lead) {
    setSelectedLead(lead);
    setLeadOpen(true);
  }

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-blue-600">
            <TrendingUpIcon className="size-6" aria-hidden />
            LeadFlow
          </h1>
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon aria-hidden />
            Add new lead
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-6 sm:py-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1 sm:max-w-sm">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads by name"
                aria-label="Search leads by name"
                className="h-9 bg-white pl-9"
              />
            </div>
            <FollowUpFilter value={followUp} onChange={setFollowUp} />
          </div>
          <StatusFilter value={status} onChange={setStatus} />
        </div>

        {leadsQuery.isPending || !now ? (
          <LeadListSkeleton />
        ) : leadsQuery.isError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p>Couldn&apos;t load leads: {leadsQuery.error.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => leadsQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <LeadSection title="Today's follow-ups" leads={pinned} now={now} pinned onOpen={openLead} />
            )}
            {rest.length > 0 ? (
              <LeadSection title="All leads" leads={rest} now={now} onOpen={openLead} />
            ) : (
              pinned.length === 0 && (
                <div className="rounded-xl border border-dashed bg-white p-10 text-center">
                  <p className="font-medium text-slate-700">
                    {debouncedSearch
                      ? `No leads match "${debouncedSearch}"`
                      : followUp !== "all"
                        ? "No leads match these filters"
                        : status === "all"
                        ? "No leads yet"
                        : `No ${STATUS_META[status].label} leads`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {isUnfiltered ? "Add your first lead to start tracking discussions." : "Try another search or filter."}
                  </p>
                  {isUnfiltered && (
                    <Button className="mt-4" onClick={() => setAddOpen(true)}>
                      <PlusIcon aria-hidden />
                      Add new lead
                    </Button>
                  )}
                </div>
              )
            )}
          </>
        )}
      </main>

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} />
      <LeadDialog lead={selectedLead} now={now} open={leadOpen} onOpenChange={setLeadOpen} />
    </>
  );
}
