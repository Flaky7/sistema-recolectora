import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { ORDER_STATUS_LABELS } from "../labels";
import type { OrderStatus } from "../status";

const TONE: Record<OrderStatus, string> = {
  registered: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  payment_pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  payment_confirmed: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  receiving: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  complete: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  shipped: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  delivered: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", TONE[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
