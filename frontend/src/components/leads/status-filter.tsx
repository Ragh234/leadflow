import { STATUS_META } from "@/lib/status";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type StatusFilterValue = LeadStatus | "all";

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  ...LEAD_STATUSES.map((status) => ({ value: status, label: STATUS_META[status].label })),
];

interface StatusFilterProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div role="group" aria-label="Filter by status" className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">Filters:</span>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
