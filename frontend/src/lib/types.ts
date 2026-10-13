export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Timestamps are ISO strings in UTC ("2026-10-14T04:30:00Z"), exactly as the API sends them. */
export interface Lead {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  last_discussion_note: string | null;
  last_discussion_at: string | null;
}

export interface Discussion {
  id: number;
  lead_id: number;
  note: string;
  follow_up_at: string | null;
  created_at: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  search?: string;
}

export interface NewLead {
  name: string;
  company?: string | null;
  phone?: string | null;
}

export interface LeadPatch {
  name?: string;
  company?: string | null;
  phone?: string | null;
  status?: LeadStatus;
  /** null marks the current follow-up as done. */
  next_follow_up_at?: string | null;
}

export interface NewDiscussion {
  note: string;
  follow_up_at?: string | null;
}
