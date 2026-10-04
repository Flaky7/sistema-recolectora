import type { Database } from "@/lib/supabase/database.types";

export type CustomerType = Database["public"]["Enums"]["customer_type"];
export type CustomerStatus = Database["public"]["Enums"]["customer_status"];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  local: "Local",
  out_of_town: "Foránea",
};

export const CUSTOMER_TYPE_DESCRIPTIONS: Record<CustomerType, string> = {
  local:
    "Vivo en la ciudad de la recolectora; puedo recoger o recibir en persona.",
  out_of_town: "Vivo en otra ciudad; mis pedidos se envían por paquetería.",
};

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "Activa",
  deactivated: "Dada de baja temporal",
  deleted: "Eliminada",
};
