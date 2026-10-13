import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/status";
import type { LeadStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const { label, badgeClass } = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("text-[11px] font-semibold tracking-wide uppercase", badgeClass, className)}>
      {label}
    </Badge>
  );
}
