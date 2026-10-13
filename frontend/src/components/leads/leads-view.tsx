"use client";

import { PlusIcon, TrendingUpIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLeads } from "@/hooks/use-leads";
import { useNow } from "@/hooks/use-now";
import { splitPinned } from "@/lib/follow-up";
import { STATUS_META } from "@/lib/status";
import type { Lead } from "@/lib/types";

import { AddLeadDialog } from "./add-lead-dialog";
import { LeadDialog } from "./lead-dialog";
import { LeadListSkeleton, LeadSection } from "./lead-list";
import { StatusFilter, type StatusFilterValue } from "./status-filter";

export function LeadsView() {
  const now = useNow();
  const [status, setStatus] = useState<StatusFilterValue>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);

  const leadsQuery = useLeads({ status: status === "all" ? undefined : status });
  const { pinned, rest } = useMemo(
    () => (now ? splitPinned(leadsQuery.data ?? [], now) : { pinned: [], rest: [] }),
    [leadsQuery.data, now],
  );

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
        <StatusFilter value={status} onChange={setStatus} />

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
                    {status === "all" ? "No leads yet" : `No ${STATUS_META[status].label} leads`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {status === "all" ? "Add your first lead to start tracking discussions." : "Try another filter."}
                  </p>
                  {status === "all" && (
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
