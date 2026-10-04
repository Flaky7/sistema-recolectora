import type { Database } from "@/lib/supabase/database.types";

export type ShipmentType = Database["public"]["Enums"]["shipment_type"];
type CustomerType = Database["public"]["Enums"]["customer_type"];

export const SHIPMENT_TYPE_LABELS: Record<ShipmentType, string> = {
  carrier: "Paquetería",
  local_delivery: "Entrega en persona",
  local_pickup: "Recolección en persona",
};

/** In-person delivery or pickup only for local customers (FR-021). */
export function shipmentTypesFor(customerType: CustomerType): ShipmentType[] {
  return customerType === "local"
    ? ["carrier", "local_delivery", "local_pickup"]
    : ["carrier"];
}
