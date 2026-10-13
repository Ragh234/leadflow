"use client";

import { CheckIcon, PhoneIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDiscussions, useLead, useUpdateLead } from "@/hooks/use-leads";
import { STATUS_META } from "@/lib/status";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";

import { AddDiscussionForm } from "./add-discussion-form";
import { DiscussionTimeline } from "./discussion-timeline";
import { FollowUpChip } from "./follow-up-chip";

interface LeadDialogProps {
  lead: Lead | null;
  now: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDialog({ lead, now, open, onOpenChange }: LeadDialogProps) {
  return (
    <Dialog open={open && lead !== null && now !== null} onOpenChange={onOpenChange}>
      {/* Keyed by lead so the note form starts empty for each lead. */}
      {lead && now && <LeadDialogBody key={lead.id} initialLead={lead} now={now} />}
    </Dialog>
  );
}

function LeadDialogBody({ initialLead, now }: { initialLead: Lead; now: Date }) {
  // Fetched by id, so the dialog stays current even if a status change drops the lead out of the filtered list.
  const lead = useLead(initialLead).data ?? initialLead;
  const discussions = useDiscussions(lead.id);
  const updateLead = useUpdateLead(lead.id);

  function changeStatus(status: LeadStatus) {
    if (status === lead.status) return;
    updateLead.mutate(
      { status },
      {
        onSuccess: (updated) => toast.success(`${updated.name} moved to ${STATUS_META[updated.status].label}`),
        onError: (err) => toast.error(`Couldn't change the status: ${err.message}`),
      },
    );
  }

  function markFollowUpDone() {
    updateLead.mutate(
      { next_follow_up_at: null },
      {
        onSuccess: () => toast.success("Follow-up marked done"),
        onError: (err) => toast.error(`Couldn't update the follow-up: ${err.message}`),
      },
    );
  }

  return (
    <DialogContent className="flex max-h-[min(90vh,800px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="gap-3 border-b px-5 pt-5 pb-4 pr-12 text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight font-semibold">
              {lead.name}
              {lead.company && <span className="font-normal text-slate-500"> ({lead.company})</span>}
            </DialogTitle>
            <DialogDescription className="mt-1 flex items-center gap-1.5">
              <PhoneIcon className="size-3.5" aria-hidden />
              {lead.phone ?? "No phone number"}
            </DialogDescription>
          </div>
          <Select value={lead.status} onValueChange={(value) => changeStatus(value as LeadStatus)}>
            <SelectTrigger aria-label="Lead status" className="w-40 bg-white" disabled={updateLead.isPending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_META[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {lead.next_follow_up_at && (
          <div className="flex flex-wrap items-center gap-2">
            <FollowUpChip at={lead.next_follow_up_at} now={now} prefix="Next follow-up" />
            <Button variant="outline" size="xs" onClick={markFollowUpDone} disabled={updateLead.isPending}>
              <CheckIcon aria-hidden />
              Mark done
            </Button>
          </div>
        )}
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
        <DiscussionTimeline
          discussions={discussions.data}
          isPending={discussions.isPending}
          error={discussions.error}
          leadCreatedAt={lead.created_at}
          now={now}
        />
      </div>

      <div className="border-t bg-white px-5 py-4">
        <AddDiscussionForm leadId={lead.id} now={now} />
      </div>
    </DialogContent>
  );
}
