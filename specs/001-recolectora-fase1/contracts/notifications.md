# Contrato: módulo de notificaciones (WhatsApp)

Ubicación: `src/lib/notifications/`. Es el único lugar del sistema que conoce WhatsApp.

```ts
// types.ts
type NotificationKind =
  | 'package_received'
  | 'package_unassigned'
  | 'payment_confirmed'
  | 'payment_rejected'
  | 'order_shipped';

interface OutgoingNotification {
  kind: NotificationKind;
  toPhone: string;      // 10 dígitos, México
  body: string;         // texto final
}

type DeliveryResult =
  | { kind: 'open_url'; url: string }   // fase 1: el usuario confirma en WhatsApp
  | { kind: 'sent'; providerId: string } // fase 2: API de WhatsApp Cloud

interface NotificationChannel {
  name: 'whatsapp_link' | 'whatsapp_cloud';
  deliver(n: OutgoingNotification): Promise<DeliveryResult>;
}
```

- `messages.ts`: funciones puras `renderTemplate(template, vars)`,
  `buildPackageReceivedMessage(...)`, `buildPaymentConfirmedMessage(...)`,
  `buildPaymentRejectedMessage(...)`, `buildOrderShippedMessage(...)`. Variables desconocidas
  producen error al guardar la plantilla (no al enviar).
- `whatsapp-link.ts`: `deliver` devuelve
  `https://wa.me/52{toPhone}?text={encodeURIComponent(body)}`.
- `index.ts`: `getNotificationChannel()` devuelve la implementación activa (fase 1: siempre
  `whatsapp_link`). Las Server Actions solo llaman a `notify(kind, context)`, que construye el
  mensaje, guarda la fila en `notifications` y llama al canal.

## Plantillas por defecto

**Paquete recibido** (`template_package_received`):

```text
¡Hola {nombre}! 📦 Recibimos un paquete de {bazar} para tu pedido #{folio}.
Llevas {recibidos} de {esperados} paquetes.
Ve la foto aquí: {enlace}
```

**Paquete sin pedido** (`template_package_unassigned`, FR-018):

```text
¡Hola {nombre}! 📦 Recibimos un paquete de {bazar} a tu nombre, pero aún no tienes un pedido
registrado. Regístralo en la app para que lo asignemos: {enlace}
```

`{enlace}` = `${NEXT_PUBLIC_SITE_URL}/mi-cuenta`. Para clientas sin cuenta se omite la línea del
enlace y la recolectora asigna el paquete a un pedido que ella registra.

**Pago confirmado** (`template_payment_confirmed`):

```text
¡Hola {nombre}! ✅ Confirmamos tu pago de {monto} para el pedido #{folio}.
Ya puedes pedir a los bazares que envíen tus paquetes con tu código.
Ver tu pedido: {enlace}
```

**Pago rechazado** (`template_payment_rejected`):

```text
Hola {nombre}, no pudimos confirmar el pago de tu pedido #{folio}.
Motivo: {motivo}
Por favor sube un nuevo comprobante: {enlace}
```

**Pedido enviado** (`template_order_shipped`), según el tipo:

```text
¡Hola {nombre}! 🚚 Tu pedido #{folio} va en camino por {paqueteria}.
Número de guía: {guia}
Costo de envío: {costo}
```

Para `local_delivery` / `local_pickup`, `{tipo}` se reemplaza por "entrega en persona" o
"recolección en persona" y las líneas de paquetería y guía se omiten.

`{enlace}` = `${NEXT_PUBLIC_SITE_URL}/mi-cuenta/pedidos/{folio}` (requiere sesión, FR-019).
Para clientas sin cuenta (FR-045), la línea que contiene `{enlace}` se elimina del mensaje.
`{costo}` usa el formato de moneda es-MX.
