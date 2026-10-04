"use client";

import { PlusIcon, StoreIcon, XIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export type PickedBazaar = { bazaarId?: string; bazaarName: string };

type Suggestion = { id: string; name: string; brands: string[] };

/**
 * Picks registered (approved) bazaars from the directory or adds one typed by hand when the
 * bazaar is not registered (FR-009). Several bazaars per order.
 */
export function BazaarPicker({
  value,
  onChange,
  error,
  multiple = true,
  label = "¿En qué bazar o bazares compraste?",
}: {
  value: PickedBazaar[];
  onChange: (value: PickedBazaar[]) => void;
  error?: string;
  multiple?: boolean;
  label?: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await createClient().rpc("search_directory", {
        q: term,
      });
      if (!cancelled) {
        setSuggestions(
          (data ?? [])
            .slice(0, 6)
            .map((b) => ({ id: b.id, name: b.name, brands: b.brands })),
        );
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const visibleSuggestions = query.trim().length < 2 ? [] : suggestions;
  const canAdd = multiple || value.length === 0;

  function add(bazaar: PickedBazaar) {
    const exists = value.some((b) =>
      bazaar.bazaarId
        ? b.bazaarId === bazaar.bazaarId
        : !b.bazaarId &&
          b.bazaarName.toLowerCase() === bazaar.bazaarName.toLowerCase(),
    );
    if (!exists) onChange(multiple ? [...value, bazaar] : [bazaar]);
    setQuery("");
    setSuggestions([]);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const typed = query.trim();
  const typedMatchesSuggestion = visibleSuggestions.some(
    (s) => s.name.toLowerCase() === typed.toLowerCase(),
  );

  return (
    <div className="space-y-2" data-invalid={Boolean(error)}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((bazaar, index) => (
            <li key={`${bazaar.bazaarId ?? "free"}-${bazaar.bazaarName}`}>
              <Badge variant="secondary" className="h-11 gap-1 pr-0 text-sm">
                <StoreIcon aria-hidden />
                {bazaar.bazaarName}
                {!bazaar.bazaarId ? (
                  <span className="text-muted-foreground">(no registrado)</span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="size-11"
                  onClick={() => remove(index)}
                  aria-label={`Quitar ${bazaar.bazaarName}`}
                >
                  <XIcon />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {canAdd ? (
        <>
          <Input
            id={inputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (typed.length >= 2) add({ bazaarName: typed });
              }
            }}
            placeholder="Escribe el nombre del bazar"
            autoComplete="off"
            aria-invalid={Boolean(error)}
          />
          {typed.length >= 2 ? (
            <ul className="divide-y rounded-lg border" aria-label="Sugerencias">
              {visibleSuggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="hover:bg-muted flex min-h-11 w-full flex-col items-start px-3 py-2 text-left"
                    onClick={() => add({ bazaarId: s.id, bazaarName: s.name })}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {s.brands.join(", ")}
                    </span>
                  </button>
                </li>
              ))}
              {!typedMatchesSuggestion && typed.length <= 80 ? (
                <li>
                  <button
                    type="button"
                    className="hover:bg-muted flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left"
                    onClick={() => add({ bazaarName: typed })}
                  >
                    <PlusIcon className="size-4" aria-hidden />
                    Agregar “{typed}” (bazar no registrado)
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
