import type { Discussion, Lead, LeadFilters, LeadPatch, NewDiscussion, NewLead } from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
}

/** The API always answers errors with {"detail": ...}: a string, or a list of field issues for 422s. */
function messageFromDetail(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return (detail as ValidationIssue[])
      .map(({ loc, msg }) => {
        const field = loc.at(-1);
        return typeof field === "string" && field !== "body" ? `${field}: ${msg}` : msg;
      })
      .join("; ");
  }
  return `Request failed (${status})`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
    });
  } catch {
    throw new ApiError(0, "Can't reach the LeadFlow API. Is the backend running?");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    throw new ApiError(response.status, messageFromDetail(body?.detail, response.status));
  }
  return (await response.json()) as T;
}

function query(filters: LeadFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  listLeads: (filters: LeadFilters = {}) => request<Lead[]>(`/api/leads${query(filters)}`),

  getLead: (id: number) => request<Lead>(`/api/leads/${id}`),

  createLead: (input: NewLead) =>
    request<Lead>("/api/leads", { method: "POST", body: JSON.stringify(input) }),

  updateLead: (id: number, patch: LeadPatch) =>
    request<Lead>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  listDiscussions: (leadId: number) => request<Discussion[]>(`/api/leads/${leadId}/discussions`),

  createDiscussion: (leadId: number, input: NewDiscussion) =>
    request<Discussion>(`/api/leads/${leadId}/discussions`, { method: "POST", body: JSON.stringify(input) }),
};
