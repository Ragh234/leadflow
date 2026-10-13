import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FollowUpFilter as FollowUpFilterValue } from "@/lib/follow-up";

const OPTIONS: { value: FollowUpFilterValue; label: string }[] = [
  { value: "all", label: "All follow-ups" },
  { value: "today", label: "Due today" },
  { value: "overdue", label: "Overdue" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No follow-up" },
];

interface FollowUpFilterProps {
  value: FollowUpFilterValue;
  onChange: (value: FollowUpFilterValue) => void;
}

/** Applied in the browser: only the browser knows the rep's "today". */
export function FollowUpFilter({ value, onChange }: FollowUpFilterProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as FollowUpFilterValue)}>
      <SelectTrigger aria-label="Filter by follow-up" className="h-9 w-44 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
