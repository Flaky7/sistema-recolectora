import { SearchIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type SelectFilter = {
  name: string;
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  /** Text of the "no filter" option. */
  allLabel: string;
};

type TextFilter = {
  name: string;
  label: string;
  value: string | undefined;
  placeholder?: string;
};

/**
 * Search and filters kept in the URL (?q=…&estado=…), so lists can be shared, refreshed and
 * used without JavaScript. Stacked on phones, in one row on wide screens (FR-039).
 */
export function ListFilters({
  action,
  texts,
  selects = [],
}: {
  /** Path of the list, e.g. "/admin/pedidos". */
  action: string;
  texts: TextFilter[];
  selects?: SelectFilter[];
}) {
  const active = [...texts, ...selects].some((f) => f.value);
  return (
    <form
      action={action}
      className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]"
      role="search"
    >
      {texts.map((filter) => (
        <div key={filter.name} className="relative">
          <label htmlFor={`filter-${filter.name}`} className="sr-only">
            {filter.label}
          </label>
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            id={`filter-${filter.name}`}
            name={filter.name}
            defaultValue={filter.value ?? ""}
            placeholder={filter.placeholder ?? filter.label}
            className="border-input h-11 w-full rounded-lg border bg-transparent pr-3 pl-9"
            autoComplete="off"
          />
        </div>
      ))}
      {selects.map((filter) => (
        <div key={filter.name}>
          <label htmlFor={`filter-${filter.name}`} className="sr-only">
            {filter.label}
          </label>
          <select
            id={`filter-${filter.name}`}
            name={filter.name}
            defaultValue={filter.value ?? ""}
            className="border-input h-11 w-full rounded-lg border bg-transparent px-2"
          >
            <option value="">{filter.allLabel}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="touch" className="flex-1">
          Filtrar
        </Button>
        {active ? (
          <Button asChild variant="ghost" size="touch">
            <Link href={action}>Limpiar</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
