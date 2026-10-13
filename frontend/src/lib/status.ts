import type { LeadStatus } from "./types";

export const STATUS_META: Record<LeadStatus, { label: string; badgeClass: string }> = {
  new: { label: "New", badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  contacted: { label: "Contacted", badgeClass: "border-amber-200 bg-amber-50 text-amber-700" },
  qualified: { label: "Qualified", badgeClass: "border-sky-200 bg-sky-50 text-sky-700" },
  proposal_sent: { label: "Proposal Sent", badgeClass: "border-violet-200 bg-violet-50 text-violet-700" },
  won: { label: "Won", badgeClass: "border-slate-200 bg-slate-100 text-slate-600" },
  lost: { label: "Lost", badgeClass: "border-zinc-200 bg-zinc-100 text-zinc-500" },
};

/** Won and Lost leads are done; the list dims them, as in the wireframe. */
export function isClosed(status: LeadStatus): boolean {
  return status === "won" || status === "lost";
}
