import type { OrderStatus } from "./status";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  registered: "Registrado",
  payment_pending: "Pago inicial pendiente",
  payment_confirmed: "Pago confirmado",
  receiving: "Recibiendo paquetes",
  complete: "Completo",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** What the customer should do or expect next, shown under the status. */
export const ORDER_STATUS_HINTS: Record<OrderStatus, string> = {
  registered: "Sube el comprobante del pago inicial para que avance.",
  payment_pending: "La recolectora está revisando tu comprobante.",
  payment_confirmed:
    "Ya puedes pedir a los bazares que envíen tus paquetes con tu código.",
  receiving: "Estamos recibiendo tus paquetes.",
  complete: "Tu pedido está completo y pronto saldrá.",
  shipped: "Tu pedido va en camino.",
  delivered: "Tu pedido fue entregado.",
  cancelled: "Este pedido fue cancelado.",
};
