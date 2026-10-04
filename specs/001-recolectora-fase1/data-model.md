# Data Model: Sistema Recolectora – Fase 1

Base de datos PostgreSQL (Supabase). Nombres en inglés (constitución, principio I). Todas las
tablas tienen `id uuid primary key default gen_random_uuid()`, `created_at` y `updated_at`
(`timestamptz`, `updated_at` mantenido por trigger), salvo que se indique otra cosa. **RLS está
activado en todas las tablas.** Montos en centavos (`integer`, MXN).

## Enums

| Enum | Valores |
|------|---------|
| `user_role` | `collector`, `customer`, `bazaar` |
| `customer_type` | `local`, `out_of_town` |
| `customer_status` | `active`, `deactivated`, `deleted` |
| `bazaar_status` | `draft`, `pending_review`, `approved`, `rejected`, `suspended`, `deleted` |
| `proposal_status` | `draft`, `pending`, `approved`, `rejected`, `discarded` |
| `document_status` | `pending`, `current`, `rejected` |
| `bazaar_document_type` | `id_card`, `selfie`, `proof_of_address`, `registration_payment` |
| `order_status` | `registered`, `payment_pending`, `payment_confirmed`, `receiving`, `complete`, `shipped`, `delivered`, `cancelled` |
| `payment_concept` | `initial_deposit` (fase 2: `shipping`, `balance`, …) |
| `payment_method` | `manual_transfer` (fase 2: `card`, `oxxo`, `spei`) |
| `payment_status` | `pending`, `confirmed`, `rejected` |
| `shipment_type` | `carrier`, `local_delivery`, `local_pickup` |
| `notification_kind` | `package_received`, `package_unassigned`, `payment_confirmed`, `payment_rejected`, `order_shipped` |
| `notification_channel` | `whatsapp_link` (fase 2: `whatsapp_cloud`) |

Etiquetas en español (interfaz): `src/features/*/labels.ts`. Ejemplo: `payment_pending` →
"Pago inicial pendiente", `out_of_town` → "Foránea".

## Tablas

### profiles
Uno por usuario de `auth.users`.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | uuid PK | = `auth.users.id`, `on delete cascade` |
| role | user_role | no nulo; solo cambia con `promote_to_collector()` |
| email | text | copia de `auth.users.email`, para búsquedas del panel |
| privacy_accepted_at | timestamptz | no nulo para `customer` y `bazaar` (FR-005) |

### customers

| Campo | Tipo | Reglas |
|-------|------|--------|
| profile_id | uuid FK → profiles, UNIQUE, **nulo** | nulo = clienta sin cuenta, dada de alta por la recolectora (FR-041) |
| created_by | uuid FK → profiles | la propia clienta o la recolectora |
| code | text UNIQUE | 5 caracteres de `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, inmutable (FR-007) |
| full_name | text | 2–120 caracteres |
| whatsapp | text | exactamente 10 dígitos (México); UNIQUE |
| shipping_address | text | 10–500 caracteres |
| type | customer_type | |
| status | customer_status | default `active`; `deactivated` = baja temporal (FR-049) |
| deleted_at | timestamptz | al eliminar: `full_name = 'Clienta eliminada'`, `whatsapp`, `shipping_address` y `profile_id` en nulo, `status = 'deleted'`; `code` se conserva para que no se reutilice (FR-048) |

`whatsapp` y `shipping_address` son nulos solo cuando `status = 'deleted'`.

### bazaars

| Campo | Tipo | Reglas |
|-------|------|--------|
| profile_id | uuid FK → profiles, UNIQUE | |
| name | text, nulo | versión **publicada**; 2–80 caracteres; no nulo en `approved` y `suspended` |
| brands | text[], nulo | versión publicada; 1–30 marcas, cada una 1–40 caracteres |
| link_url | text, nulo | versión publicada; URL `https://` válida |
| status | bazaar_status | default `draft` |
| status_reason | text | obligatorio al pasar a `rejected` o `suspended` |
| submitted_at | timestamptz | se fija al pasar a `pending_review` |
| reviewed_at, reviewed_by | timestamptz, uuid | última decisión de la recolectora |
| search_text | text | trigger: `lower(unaccent(name ‖ ' ' ‖ brands))`; índice GIN `gin_trgm_ops` |

**Transiciones** (validadas por trigger):

| De | A | Quién |
|----|---|-------|
| draft | pending_review | bazar (requiere una propuesta con nombre, marcas y link, los 4 documentos (`pending` o `current`) y 3 referencias; las fotos son opcionales) |
| rejected | pending_review | bazar (reenvío tras corregir) |
| pending_review | approved | recolectora; aplica la propuesta pendiente (publica nombre, marcas, link y fotos) y pasa los documentos `pending` a `current` |
| pending_review | rejected | recolectora; la propuesta regresa a `draft` para que el bazar la corrija |
| approved | suspended | recolectora |
| suspended | approved | recolectora |
| cualquiera | deleted | bazar (su cuenta) o recolectora: se borran fotos, propuestas, documentos, referencias, `brands`, `link_url` y la cuenta; `name` se conserva para el historial de pedidos (FR-048) |

El bazar **nunca** edita directamente `name`, `brands`, `link_url` ni `bazaar_photos`: propone
cambios en `bazaar_profile_proposals` (FR-029). Tampoco puede editar `status` ni `status_reason`.
Al pasar a `suspended` o `deleted`, la propuesta `draft` o `pending` se marca `discarded`.

### bazaar_profile_proposals (FR-029 a FR-031)

Propuesta de ficha pública. Se usa tanto en el registro inicial como en los cambios posteriores.

| Campo | Tipo | Reglas |
|-------|------|--------|
| bazaar_id | uuid FK → bazaars | |
| name | text | 2–80 caracteres |
| brands | text[] | 1–30 marcas, cada una 1–40 caracteres |
| link_url | text | URL `https://` válida |
| photo_paths | text[] | 0–3 rutas en el bucket privado `bazaar-photo-submissions`, prefijo `{bazaar_id}/`; el orden es el orden de publicación |
| status | proposal_status | default `draft` |
| rejection_reason | text | obligatorio si `rejected` |
| submitted_at, reviewed_at, reviewed_by | | |

- Como máximo una propuesta en `draft` o `pending` por bazar (índice único parcial).
- Transiciones: `draft` → `pending` (bazar envía; si el bazar está `draft`/`rejected`, esto ocurre
  junto con su paso a `pending_review`); `pending` → `approved` (recolectora; aplica la propuesta
  con `apply_bazaar_proposal`); `pending` → `rejected` (recolectora, con motivo; en el registro
  inicial regresa a `draft` en lugar de `rejected`); `draft`/`pending` → `discarded` (sistema).
- Una propuesta nueva de un bazar aprobado se crea precargada con la versión publicada. Si ya hay
  una `pending` y el bazar quiere cambiarla, esa pasa a `discarded` y se crea otra `draft`.

### bazaar_photos (públicas, solo autorizadas)

| Campo | Tipo | Reglas |
|-------|------|--------|
| bazaar_id | uuid FK → bazaars | |
| position | smallint | 1–3; UNIQUE (bazaar_id, position); un bazar puede tener 0 fotos |
| storage_path | text | bucket público `bazaar-photos`, prefijo `{bazaar_id}/` |

Solo `apply_bazaar_proposal` (recolectora) escribe en esta tabla.

### bazaar_documents (privados, FR-032 a FR-034)

| Campo | Tipo | Reglas |
|-------|------|--------|
| bazaar_id | uuid FK → bazaars | |
| type | bazaar_document_type | |
| storage_path | text, nulo | bucket `bazaar-documents`, prefijo `{bazaar_id}/`; nulo en `rejected` (el archivo ya se borró) |
| status | document_status | default `pending` |
| rejection_reason | text | obligatorio si `rejected` |
| reviewed_at, reviewed_by | | |

- Índices únicos parciales: como máximo un `current` y un `pending` por (bazaar_id, type).
- El bazar solo inserta filas `pending`. Si ya hay una `pending` del mismo tipo, la acción la borra
  (fila y archivo) antes de insertar la nueva.
- `approve_bazaar_document(id)` (solo recolectora): en una transacción borra la fila `current` del
  mismo tipo, pasa la `pending` a `current` y devuelve la ruta del archivo anterior para borrarlo de
  Storage. Al aprobar el bazar (`pending_review` → `approved`) se hace lo mismo con todos sus
  documentos `pending`.
- `reject_bazaar_document(id, reason)` (solo recolectora): pasa la fila a `rejected`, pone
  `storage_path` en nulo y devuelve la ruta para borrar el archivo. Solo se conserva la última fila
  `rejected` por tipo (para mostrar el motivo); las anteriores se borran.
- Para enviar el registro a revisión se exige un documento `pending` o `current` de cada tipo.

### bazaar_references (privadas)

| Campo | Tipo | Reglas |
|-------|------|--------|
| bazaar_id | uuid FK → bazaars | |
| position | smallint | 1–3; UNIQUE (bazaar_id, position) |
| full_name | text | 2–120 caracteres |
| phone | text | 10 dígitos |

### orders

| Campo | Tipo | Reglas |
|-------|------|--------|
| customer_id | uuid FK → customers | |
| folio | integer | consecutivo global (identity), visible como "Pedido #123" |
| description | text | 3–2,000 caracteres |
| expected_packages | smallint | 1–99 |
| status | order_status | default `registered` |
| cancelled_reason | text | obligatorio al cancelar |

Contadores derivados (vista `order_summaries`): `received_packages`, último pago, envío.

**Transiciones** (trigger `validate_order_transition`; reflejadas en `src/features/orders/status.ts`):

| De | A | Quién / disparador |
|----|---|--------------------|
| registered | payment_pending | sistema, al insertar un pago `pending` |
| registered | payment_confirmed | sistema, al insertar la recolectora un pago ya `confirmed` (FR-043) |
| payment_pending | payment_confirmed | sistema, al confirmar el pago (recolectora) |
| payment_pending | registered | sistema, al rechazar el pago (recolectora) |
| payment_pending | receiving | sistema, al confirmar el pago (recolectora) de un pedido que ya tiene paquetes |
| payment_confirmed | receiving | sistema, al asociar el primer paquete |
| receiving | complete | recolectora (con confirmación si recibidos < esperados) |
| complete | shipped | sistema, al insertar el envío |
| shipped | delivered | recolectora |
| registered, payment_pending | cancelled | clienta, si no hay pagos confirmados ni paquetes |
| cualquiera excepto shipped/delivered | cancelled | recolectora |

Los paquetes pueden asociarse a pedidos en `registered` o `payment_pending` sin cambiar su estado
(caso límite "paquete antes de confirmar el pago").

La clienta puede editar `description`, `expected_packages` y los bazares del pedido mientras el
estado sea anterior a `complete`.

### order_bazaars

| Campo | Tipo | Reglas |
|-------|------|--------|
| order_id | uuid FK → orders, on delete cascade | |
| bazaar_id | uuid FK → bazaars, nulo | bazar registrado |
| bazaar_name | text | obligatorio si `bazaar_id` es nulo (texto libre, 2–80) |

Al menos una fila por pedido (validado en la Server Action y con una restricción diferida).

### order_status_transitions

Tabla de referencia con los cambios de estado permitidos listados en **Transiciones** de `orders`.

| Campo | Tipo | Reglas |
|-------|------|--------|
| from_status, to_status | order_status | PK compuesta con `actor` |
| actor | text | `customer`, `collector` o `system` |

Solo la usa el trigger `validate_order_transition()`. RLS activado sin políticas: nadie la lee ni
la escribe por la API. Su contenido debe coincidir con `src/features/orders/status.ts` (prueba de
integración con el cliente de pruebas).

### order_status_history

| Campo | Tipo | Reglas |
|-------|------|--------|
| order_id | uuid FK → orders | |
| from_status, to_status | order_status | |
| changed_by | uuid FK → profiles | `auth.uid()` |
| note | text | motivo de rechazo/cancelación, si aplica |

Solo inserción por trigger; nadie puede actualizar ni borrar.

### payments

| Campo | Tipo | Reglas |
|-------|------|--------|
| order_id | uuid FK → orders | |
| concept | payment_concept | `initial_deposit` |
| method | payment_method | `manual_transfer` |
| amount_cents | integer | copia de `settings.initial_deposit_cents` al crear |
| proof_path | text, nulo | bucket `payment-proofs`, prefijo `{customer_id}/`; obligatorio si lo sube la clienta, opcional si lo anota la recolectora |
| recorded_by | uuid FK → profiles | clienta o recolectora |
| status | payment_status | default `pending` |
| rejection_reason | text | obligatorio si `rejected` |
| reviewed_at, reviewed_by | | |

Solo un pago `pending` o `confirmed` por pedido y concepto (índice único parcial). Cada rechazo
queda como fila histórica.

### packages

| Campo | Tipo | Reglas |
|-------|------|--------|
| customer_id | uuid FK → customers, nulo | nulo = "sin identificar" |
| order_id | uuid FK → orders, nulo | nulo = "sin pedido"; debe ser de la misma clienta |
| bazaar_id | uuid FK → bazaars, nulo | |
| bazaar_name | text | texto libre si el bazar no está registrado |
| photo_path | text | obligatorio; bucket `package-photos` |
| note | text | 0–500 caracteres |
| received_at | timestamptz | default `now()` |
| received_by | uuid FK → profiles | recolectora |

Un paquete solo puede moverse de pedido si ambos pedidos son de la misma clienta y ninguno está en
`shipped`, `delivered` o `cancelled`.

### shipments

| Campo | Tipo | Reglas |
|-------|------|--------|
| order_id | uuid FK → orders, UNIQUE | un envío por pedido |
| type | shipment_type | `local_*` solo si la clienta es `local` |
| carrier | text | obligatorio si `carrier` (2–60) |
| tracking_number | text | obligatorio si `carrier` (3–60) |
| cost_cents | integer | ≥ 0; informativo en fase 1 |
| shipped_at | timestamptz | default `now()` |
| delivered_at | timestamptz | se fija al pasar el pedido a `delivered` |

### notifications

| Campo | Tipo | Reglas |
|-------|------|--------|
| customer_id | uuid FK → customers | |
| kind | notification_kind | |
| channel | notification_channel | `whatsapp_link` |
| order_id, package_id, payment_id, shipment_id | uuid, nulos | origen del mensaje |
| body | text | texto final enviado |
| created_by | uuid FK → profiles | |

### settings (una sola fila, `id = 1`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| initial_deposit_cents | integer | > 0 |
| payment_instructions | text | datos bancarios y concepto, visibles a clientas con sesión |
| template_package_received | text | variables: `{nombre}`, `{bazar}`, `{recibidos}`, `{esperados}`, `{enlace}`, `{folio}` |
| template_payment_confirmed | text | variables: `{nombre}`, `{folio}`, `{monto}`, `{enlace}` |
| template_payment_rejected | text | variables: `{nombre}`, `{folio}`, `{motivo}`, `{enlace}` |
| template_package_unassigned | text | paquete "sin pedido" (FR-018); variables: `{nombre}`, `{bazar}`, `{enlace}` (enlace a `/mi-cuenta`) |
| template_order_shipped | text | variables: `{nombre}`, `{folio}`, `{tipo}`, `{paqueteria}`, `{guia}`, `{costo}` |

## Matriz de acceso (RLS)

L = leer, C = crear, A = actualizar, B = borrar. "Propio" = filas ligadas a `auth.uid()`.

| Tabla | Anónimo | Clienta | Bazar | Recolectora |
|-------|---------|---------|-------|-------------|
| profiles | — | L propio | L propio | L/A todo |
| customers | — | L propio; A propio (`whatsapp`, `shipping_address`, `type`) solo si `active` | — | L/C/A todo (nunca `code`) |
| bazaars | solo vía `search_directory()` | — (solo vía directorio) | L propio | L/A todo |
| bazaar_profile_proposals | — | — | L propio; C/A propio solo en `draft` | L/A todo |
| bazaar_photos | L si bazar aprobado | L si aprobado | L propio | L/C/A/B todo |
| bazaar_documents | — | — | L propio y C/B propio solo en `pending` (la fila; nunca el archivo) | L/A/B todo |
| bazaar_references | — | — | L/C/A propio, también en `suspended` (no en `deleted`) | L todo |
| orders | — | L propio siempre; C/A propio solo si la clienta está `active` y el pedido está antes de `complete` (A limitada por trigger) | — | L/C/A todo |
| order_bazaars | — | L/C/B propio (pedido editable) | — | L/C/B todo |
| order_status_history | — | L propio | — | L todo |
| order_status_transitions | — | — | — | — (solo el trigger) |
| payments | — | L/C propio, solo `pending` (no lee el archivo) | — | L/C/A todo |
| packages | — | L propio | — | L/C/A todo |
| shipments | — | L propio | — | L/C/A todo |
| notifications | — | — | — | L/C todo |
| settings | — | — (lee monto e instrucciones solo vía `get_payment_info()`) | — | L/A |

Storage: ver [contracts/storage.md](./contracts/storage.md).
