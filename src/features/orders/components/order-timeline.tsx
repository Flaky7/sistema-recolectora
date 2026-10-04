import { formatDateTime } from "@/lib/format";

import { ORDER_STATUS_LABELS } from "../labels";
import type { OrderStatus } from "../status";

type Entry = {
  id: string;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
};

/** Status history with dates in America/Tijuana and the reasons (FR-013). */
export function OrderTimeline({ history }: { history: Entry[] }) {
  if (history.length === 0) return null;
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {[...history].reverse().map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="bg-primary absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full"
            aria-hidden
          />
          <p className="font-medium">{ORDER_STATUS_LABELS[entry.to_status]}</p>
          <p className="text-muted-foreground text-sm">
            <time dateTime={entry.created_at}>
              {formatDateTime(entry.created_at)}
            </time>
          </p>
          {entry.note ? <p className="mt-1 text-sm">{entry.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
