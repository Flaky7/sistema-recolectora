# Contrato: Server Actions y funciones de base de datos

Todas las operaciones de escritura son Server Actions en `src/features/<area>/actions.ts`. Cada
acción:

1. Valida la entrada con el esquema Zod de `src/features/<area>/schemas.ts` (el mismo que usa el
   formulario en el cliente).
2. Usa el cliente de Supabase con la sesión del usuario (RLS aplica). Nunca la service role key.
3. Devuelve `ActionResult<T>`:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

`error` es un mensaje en español listo para mostrarse. Los archivos se suben antes a Storage desde
el navegador; la acción recibe la ruta (`*Path`) y verifica que esté en la carpeta del usuario
(ver [storage.md](./storage.md)).

## Cuentas

| Acción | Rol | Entrada | Resultado |
|--------|-----|---------|-----------|
| `signUpCustomer` | público | fullName, whatsapp, shippingAddress, type, email, password, acceptPrivacy, customerCode? | `{ needsEmailConfirmation: true }`; si el WhatsApp pertenece a una clienta sin cuenta y falta o no coincide `customerCode`, error `CODE_REQUIRED` sin revelar datos (FR-044); si ya pertenece a una clienta con cuenta, error `ACCOUNT_EXISTS` con enlaces a iniciar sesión y recuperar contraseña |
| `createCustomer` | recolectora | fullName, whatsapp, shippingAddress, type | `Customer` sin cuenta, con código (FR-041) |
| `updateCustomer` | recolectora | customerId, fullName, whatsapp, shippingAddress, type | `Customer` (nunca cambia `code`) (FR-008) |
| `signUpBazaar` | público | email, password, acceptPrivacy | `{ needsEmailConfirmation: true }` |
| `signIn` | público | email, password | redirección según rol |
| `signOut` | cualquiera | — | redirección a `/` |
| `requestPasswordReset` / `updatePassword` | público / con sesión | email / password | `{}` |
| `updateCustomerProfile` | clienta | whatsapp, shippingAddress, type | `Customer` |

## Bazares

| Acción | Rol | Entrada | Resultado |
|--------|-----|---------|-----------|
| `saveBazaarProposal` | bazar | name, brands[], linkUrl, photoPaths[0..3] | `BazaarProfileProposal` (`draft`); crea la propuesta si no existe (precargada con la versión publicada si el bazar está aprobado); si había una `pending`, la descarta |
| `setBazaarDocument` | bazar (no `suspended`) | type, documentPath | `{ type, status: 'pending', uploadedAt }`; si ya había uno `pending` de ese tipo, lo borra (fila y archivo) (FR-032, FR-034) |
| `saveBazaarReferences` | bazar (cualquier estado salvo `deleted`, también suspendido) | references[3] { fullName, phone } | `BazaarReference[]` (FR-028) |
| `submitBazaarForReview` | bazar (`draft`/`rejected`) | — | `Bazaar` (`pending_review`) y propuesta `pending`; error con lista de faltantes (sin exigir fotos) |
| `submitBazaarProposal` | bazar (`approved`) | — | propuesta `pending` ("Cambio en revisión") (FR-029) |
| `getProposalPhotoUrls` | bazar (propio) / recolectora | proposalId | `{ path, signedUrl }[]` (60 min) |
| `reviewBazaar` | recolectora | bazaarId, decision (`approve`/`reject`/`suspend`/`reactivate`), reason? | `Bazaar`; `approve` publica la propuesta pendiente igual que `reviewBazaarProposal` y pasa los documentos `pending` a `current` |
| `reviewBazaarProposal` | recolectora | proposalId, decision (`approve`/`reject`), reason? | `BazaarProfileProposal`; al aprobar: (1) copia cada foto de `bazaar-photo-submissions` a `bazaar-photos`, (2) llama `apply_bazaar_proposal`, (3) borra las fotos públicas reemplazadas y las copias privadas publicadas |
| `reviewBazaarDocument` | recolectora | documentId, decision (`approve`/`reject`), reason? | `BazaarDocument`; al aprobar llama `approve_bazaar_document` y borra el archivo anterior; al rechazar llama `reject_bazaar_document` y borra el archivo rechazado (FR-033) |
| `getBazaarDocumentUrls` | recolectora | bazaarId | `{ type, status, signedUrl, expiresAt }[]` (10 min) del vigente y del que está en revisión de cada tipo |

## Pedidos y pagos

| Acción | Rol | Entrada | Resultado |
|--------|-----|---------|-----------|
| `createOrder` | clienta | bazaars[] ({bazaarId} o {bazaarName}), description, expectedPackages, proofPath? | `Order` (`registered` o `payment_pending`) |
| `createOrderForCustomer` | recolectora | customerId, bazaars[], description, expectedPackages | `Order` (`registered`) (FR-042) |
| `recordConfirmedPayment` | recolectora | folio, amountCents, proofPath? | `Payment` (`confirmed`) + pedido → `payment_confirmed` (FR-043) |
| `updateOrder` | clienta / recolectora | folio, bazaars[], description, expectedPackages | `Order` |
| `submitPaymentProof` | clienta | folio, proofPath | `Payment` (pedido → `payment_pending`) |
| `cancelOrder` | clienta / recolectora | folio, reason | `Order` (`cancelled`) |
| `reviewPayment` | recolectora | paymentId, decision (`confirm`/`reject`), reason? | `{ payment, orderStatus, notification: DeliveryResult }` (FR-051) |
| `getPaymentProofUrl` | recolectora | paymentId | `{ signedUrl, expiresAt }` (10 min) |

## Paquetes

| Acción | Rol | Entrada | Resultado |
|--------|-----|---------|-----------|
| `findCustomerForPackage` | recolectora | query (código, nombre o teléfono) | `{ customer, activeOrders[] }[]` |
| `registerPackage` | recolectora | customerId?, orderId?, bazaarId? / bazaarName?, note?, photoPath | `{ package, notification: DeliveryResult \| null }` |
| `assignPackage` | recolectora | packageId, customerId, orderId? | `{ package, notification: DeliveryResult \| null }` |
| `getPackagePhotoUrl` | clienta (propio) / recolectora | packageId | `{ signedUrl, expiresAt }` (60 min) |

`DeliveryResult` viene del módulo de notificaciones: en la fase 1 es
`{ kind: 'open_url', url: 'https://wa.me/…' }` y el cliente navega a esa URL. Si la clienta no está
identificada, no se genera mensaje (`null`).

## Envíos

| Acción | Rol | Entrada | Resultado |
|--------|-----|---------|-----------|
| `markOrderComplete` | recolectora | folio, confirmIncomplete (boolean) | `Order`; si recibidos < esperados y `confirmIncomplete` es falso, error `INCOMPLETE_PACKAGES` con el conteo |
| `registerShipment` | recolectora | folio, type, carrier?, trackingNumber?, costCents | `{ shipment, notification: DeliveryResult }` |
| `markOrderDelivered` | recolectora | folio | `Order` |
| `resendNotification` | recolectora | notificationId | `DeliveryResult` (vuelve a abrir WhatsApp) |

## Eliminación y baja de cuentas

| Acción | Rol | Entrada | Resultado |
|--------|-----|---------|-----------|
| `deleteMyAccount` | clienta / bazar | confirmation (`"ELIMINAR"`) | cierra sesión y redirige a `/`; error `ACTIVE_ORDERS` si la clienta tiene pedidos en curso (FR-046) |
| `deleteCustomerData` | recolectora | customerId, confirmation | `{}`; cancela pedidos en curso con motivo "datos eliminados" (FR-047) |
| `deleteBazaarData` | recolectora | bazaarId, confirmation | `{}` |
| `setCustomerActive` | recolectora | customerId, active (boolean), reason? | `Customer` (`active` / `deactivated`) (FR-049) |

Las tres acciones de eliminación usan el único módulo con privilegios `src/lib/supabase/admin.ts`
(service role, `server-only`), porque borrar usuarios de Auth y objetos de Storage ajenos no es
posible con la sesión del usuario. Antes de usarlo, la acción verifica con la sesión normal que
quien llama es la dueña de la cuenta o la recolectora. La función SQL
`anonymize_customer(id)` / `anonymize_bazaar(id)` hace los cambios en tablas en una transacción.

## Configuración

| Acción | Rol | Entrada | Resultado |
|--------|-----|---------|-----------|
| `updateSettings` | recolectora | initialDepositCents, paymentInstructions, templatePackageReceived, templatePackageUnassigned, templatePaymentConfirmed, templatePaymentRejected, templateOrderShipped | `Settings`; valida que las plantillas solo usen variables conocidas |

## Funciones SQL (RPC y triggers)

| Función | Tipo | Uso |
|---------|------|-----|
| `search_directory(q text default '')` | RPC, `SECURITY DEFINER`, anónimo | Devuelve `{ id, name, brands, link_url, photo_paths[] }` (0–3 fotos autorizadas) de bazares aprobados, siempre la versión publicada; `q` sin acentos ni mayúsculas, por nombre o marca |
| `find_customer(q text)` | RPC, solo recolectora | Búsqueda por código exacto, o por nombre/teléfono parcial |
| `is_collector()`, `current_customer_id()`, `current_bazaar_id()` | `SECURITY DEFINER`, `STABLE` | Usadas por las políticas RLS |
| `handle_new_user()` | trigger en `auth.users` | Crea `profiles` + `customers`/`bazaars`; rechaza roles distintos de `customer`/`bazaar`. Si el WhatsApp pertenece a una clienta sin cuenta y el código coincide, liga `customers.profile_id` en lugar de crear otra clienta; si no coincide, aborta el registro |
| `check_customer_claim(whatsapp text, code text)` | RPC, anónimo | Devuelve solo `'free' \| 'code_required' \| 'ok' \| 'has_account'` (`has_account`: el número ya pertenece a una clienta con cuenta), para que el formulario reaccione antes de enviar; nunca devuelve datos de la clienta. Excepción del principio III de la constitución (1.2.0) |
| `get_payment_info()` | RPC, `SECURITY DEFINER`, solo clientas y recolectora | Devuelve solo `initial_deposit_cents` y `payment_instructions` (FR-040); la tabla `settings` solo la lee la recolectora |
| `generate_customer_code()` | interna | Código de 5 caracteres único |
| `promote_to_collector(email text)` | manual (SQL editor) | Asigna el rol de recolectora; no expuesta vía API |
| `validate_order_transition()` / `log_order_status()` | triggers en `orders` | Máquina de estados e historial |
| `validate_bazaar_transition()` | trigger en `bazaars` | Transiciones de bazar y requisitos para enviar a revisión (propuesta con nombre, marcas y link; 4 documentos; 3 referencias); descarta propuestas abiertas al suspender o eliminar |
| `approve_bazaar_document(document_id uuid)` / `reject_bazaar_document(document_id uuid, reason text)` | RPC, solo recolectora | Ver data-model.md; devuelven la ruta de Storage a borrar |
| `apply_bazaar_proposal(proposal_id uuid, public_paths text[])` | RPC, solo recolectora | En una transacción: copia `name`, `brands` y `link_url` a `bazaars`, reemplaza `bazaar_photos` con `public_paths` (0–3), marca la propuesta `approved` y devuelve las rutas públicas reemplazadas para borrarlas |
| `sync_order_from_payment()` / `sync_order_from_package()` / `sync_order_from_shipment()` | triggers | Cambios automáticos de estado del pedido |
