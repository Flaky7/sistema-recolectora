"use client";

import { HelpCircleIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORDER_STATUS_LABELS } from "@/features/orders/labels";
import { cn } from "@/lib/utils";

import { findCustomerForPackage, type FoundCustomer } from "../actions";

export type ReceptionTarget =
  | {
      kind: "customer";
      customer: FoundCustomer;
      /** undefined = she has several active orders and none is chosen yet. */
      orderId: string | null | undefined;
    }
  | { kind: "unidentified" };

/**
 * Big field for the code written on the label (FR-016). Shows the customer and her active
 * orders; if she has exactly one, it is preselected (US2, scenario 1). Name and phone also work.
 */
export function CustomerSearch({
  onSelect,
}: {
  onSelect: (target: ReceptionTarget) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundCustomer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const result = await findCustomerForPackage(term);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        setResults(null);
        return;
      }
      setError(null);
      setResults(result.data);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const shown = query.trim().length < 2 ? null : results;

  function chooseCustomer(customer: FoundCustomer) {
    const orders = customer.activeOrders;
    const orderId = orders.length === 1 ? orders[0]!.id : orders.length === 0 ? null : undefined;
    onSelect({ kind: "customer", customer, orderId });
  }

  return (
    <div className="space-y-3">
      <label htmlFor="package-customer-search" className="block text-lg font-medium">
        Código de la etiqueta
      </label>
      <div className="relative">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
          aria-hidden
        />
        <Input
          ref={inputRef}
          id="package-customer-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Código, nombre o teléfono"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-14 pl-10 font-mono text-2xl tracking-widest uppercase placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:normal-case"
        />
        {loading ? (
          <Loader2Icon
            className="text-muted-foreground absolute top-1/2 right-3 size-5 -translate-y-1/2 animate-spin"
            aria-label="Buscando"
          />
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {shown && shown.length === 0 ? (
        <p role="status" className="bg-muted rounded-lg p-3">
          No existe una clienta con “{query.trim()}”. Prueba con su nombre o teléfono.
        </p>
      ) : null}

      {shown && shown.length > 0 ? (
        <ul className="divide-y rounded-xl border" aria-label="Clientas encontradas">
          {shown.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => chooseCustomer(customer)}
                className={cn(
                  "hover:bg-muted/50 flex min-h-14 w-full items-center justify-between gap-3 p-3 text-left",
                  customer.exactCode && "bg-primary/5",
                )}
              >
                <span>
                  <span className="block font-semibold">{customer.fullName}</span>
                  <span className="text-muted-foreground text-sm">
                    {customer.activeOrders.length === 0
                      ? "Sin pedidos activos"
                      : `${customer.activeOrders.length} pedido(s) activo(s)`}
                    {customer.status === "deactivated" ? " · dada de baja" : ""}
                  </span>
                </span>
                <span className="font-mono text-lg">{customer.code}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="touch"
        className="w-full"
        onClick={() => onSelect({ kind: "unidentified" })}
      >
        <HelpCircleIcon aria-hidden />
        No sé de quién es (sin identificar)
      </Button>
    </div>
  );
}

/** Order choice for the selected customer, including "Sin pedido". */
export function OrderChoice({
  customer,
  value,
  onChange,
}: {
  customer: FoundCustomer;
  value: string | null | undefined;
  onChange: (orderId: string | null) => void;
}) {
  const options = [
    ...customer.activeOrders.map((order) => ({
      id: order.id as string | null,
      label: `Pedido #${order.folio}`,
      detail: `${ORDER_STATUS_LABELS[order.status]} · ${order.received_packages} de ${order.expected_packages} paquetes`,
    })),
    { id: null, label: "Sin pedido", detail: "Se asigna después a un pedido" },
  ];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-medium">¿A qué pedido pertenece?</legend>
      {options.map((option) => (
        <label
          key={option.id ?? "none"}
          className={cn(
            "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3",
            value === option.id && "border-primary bg-primary/5",
          )}
        >
          <input
            type="radio"
            name="package-order"
            className="size-5"
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          <span>
            <span className="block font-medium">{option.label}</span>
            <span className="text-muted-foreground text-sm">{option.detail}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
