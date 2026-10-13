"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Lead, LeadFilters, LeadPatch, NewDiscussion, NewLead } from "@/lib/types";

/** Every key starts with "leads", so one invalidation refreshes the list, the open lead and its timeline. */
export const leadKeys = {
  all: ["leads"] as const,
  list: (filters: LeadFilters) => ["leads", "list", filters] as const,
  detail: (id: number) => ["leads", "detail", id] as const,
  discussions: (id: number) => ["leads", "detail", id, "discussions"] as const,
};

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => api.listLeads(filters),
    // Keep showing the current list while a new filter loads, instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  });
}

export function useLead(lead: Lead) {
  return useQuery({
    queryKey: leadKeys.detail(lead.id),
    queryFn: () => api.getLead(lead.id),
    placeholderData: lead,
  });
}

export function useDiscussions(leadId: number) {
  return useQuery({
    queryKey: leadKeys.discussions(leadId),
    queryFn: () => api.listDiscussions(leadId),
  });
}

function useInvalidateLeads() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: leadKeys.all });
}

export function useCreateLead() {
  const invalidate = useInvalidateLeads();
  return useMutation({ mutationFn: (input: NewLead) => api.createLead(input), onSuccess: invalidate });
}

export function useUpdateLead(leadId: number) {
  const invalidate = useInvalidateLeads();
  return useMutation({ mutationFn: (patch: LeadPatch) => api.updateLead(leadId, patch), onSuccess: invalidate });
}

export function useAddDiscussion(leadId: number) {
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: (input: NewDiscussion) => api.createDiscussion(leadId, input),
    onSuccess: invalidate,
  });
}
