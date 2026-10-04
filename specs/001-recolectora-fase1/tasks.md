---

description: "Task list for Sistema Recolectora – Fase 1"
---

# Tasks: Sistema Recolectora – Fase 1

**Input**: Design documents from `/specs/001-recolectora-fase1/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (routes, server-actions,
storage, notifications), quickstart.md

**Tests**: INCLUDED. La constitución (principio V) exige pruebas automatizadas de los flujos
críticos (registro de bazar, aprobación, creación de pedido, paquete recibido y envío) y la
privacidad por rol (principios II y III). Escribir cada prueba antes de su implementación y
verificar que falla.

**Organization**: tareas agrupadas por historia de usuario (US1–US7 de spec.md), más una fase
transversal de eliminación y baja de cuentas (FR-046–FR-050).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US7)
- Rutas relativas a la raíz del repositorio (una sola app Next.js, ver plan.md)

## Convenciones para todas las tareas

- TypeScript estricto; nombres de código, tablas y archivos en inglés; textos visibles en español
  de México (constitución, principio I). URLs en español según `contracts/routes.md`.
- Toda escritura es una Server Action en `src/features/<area>/actions.ts` que valida con el
  esquema Zod de `src/features/<area>/schemas.ts`, usa el cliente de Supabase del usuario y
  devuelve `ActionResult<T>` (`src/lib/action-result.ts`). Contratos: `contracts/server-actions.md`.
- Cada pantalla se diseña primero a 360 px de ancho (principio IV).
- Migraciones en `supabase/migrations/` con prefijo `YYYYMMDDHHMMSS_`; después de cada migración,
  ejecutar `pnpm db:types` para regenerar `src/lib/supabase/database.types.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar el proyecto, herramientas de calidad y CI.

- [X] T001 Crear la app Next.js (App Router, TypeScript, Tailwind, ESLint, carpeta `src/`, alias `@/*`) con pnpm en la raíz del repositorio y definir en `package.json` los scripts `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `format`, `test:unit`, `test:integration`, `test:e2e` y `db:types` (`supabase gen types typescript --local > src/lib/supabase/database.types.ts`)
- [ ] T002 Inicializar git en la raíz (`.gitignore` con `node_modules`, `.next`, `.env*` salvo `.env.example`, `supabase/.temp`, `test-results`, `playwright-report`), crear el repositorio **público** en GitHub bajo la cuenta del desarrollador (se transfiere a la clienta en T156), sin licencia abierta (todos los derechos reservados), y subir `main`; activar *secret scanning* y *push protection* de GitHub; verificar que ni `seed.sql`, ni los fixtures, ni ningún archivo contengan datos reales de clientas o bazares; cuando T011 exista y haya corrido una vez, proteger `main` (cambios solo por pull request, check obligatorio de la CI en verde, sin excepción para administradores) para cumplir el principio V ("un cambio con pruebas fallidas NO DEBE integrarse")
- [X] T003 Configurar `tsconfig.json` con `"strict": true`, `"noUncheckedIndexedAccess": true` y `"noImplicitOverride": true`
- [X] T004 [P] Instalar dependencias de ejecución: `@supabase/supabase-js`, `@supabase/ssr`, `react-hook-form`, `zod`, `@hookform/resolvers`, `browser-image-compression`, `server-only`, `@sentry/nextjs`; y de desarrollo: `supabase`, `vitest`, `@playwright/test`, `prettier`, `prettier-plugin-tailwindcss` en `package.json`
- [X] T005 [P] Configurar Prettier (`.prettierrc`, `.prettierignore`) y reglas de ESLint (`eslint.config.mjs`) incluyendo `no-restricted-imports` que prohíba importar `@/lib/supabase/admin` fuera de `src/features/account-deletion/`
- [X] T006 [P] Inicializar shadcn/ui (`components.json`) y agregar los componentes `button`, `input`, `textarea`, `label`, `form`, `select`, `radio-group`, `checkbox`, `card`, `badge`, `dialog`, `alert-dialog`, `sheet`, `tabs`, `table`, `sonner`, `skeleton` en `src/components/ui/`
- [X] T007 [P] Inicializar Supabase CLI y ajustar `supabase/config.toml`: confirmación de correo activada, `site_url = "http://localhost:3000"`, `additional_redirect_urls` con `/auth/callback`, plantillas de correo en español
- [X] T008 [P] Crear `.env.example` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (comentario: solo eliminación de cuentas, scripts y pruebas), `NEXT_PUBLIC_SITE_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- [X] T009 [P] Configurar Vitest en `vitest.config.ts` con dos proyectos: `unit` (`tests/unit/**`) e `integration` (`tests/integration/**`, `fileParallelism: false`, timeout 30 s)
- [X] T010 [P] Configurar Playwright en `playwright.config.ts` con proyectos `mobile` (dispositivo Pixel 7) y `desktop` (Desktop Chrome), `locale: 'es-MX'`, `timezoneId: 'America/Tijuana'`, `webServer` con `pnpm build && pnpm start`
- [X] T011 [P] Crear `.github/workflows/ci.yml` que en cada push y pull request ejecute: `pnpm install` → `pnpm lint` → `pnpm typecheck` → `pnpm test:unit` → `supabase start` → `supabase db reset` → `pnpm test:integration` → `pnpm build` → `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e`
- [X] T012 [P] Configurar Sentry con `sendDefaultPii: false` y sin Session Replay en `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` y `next.config.ts`; crear `src/app/global-error.tsx` con mensaje en español

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema de base de datos con RLS, sesión y roles, utilidades compartidas, módulo de
notificaciones y base de pruebas. Todas las historias dependen de esta fase.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

### Base de datos

- [ ] T013 Crear `supabase/migrations/20261004000100_extensions_enums.sql`: extensiones `pg_trgm` y `unaccent`; enums `user_role` (`collector`, `customer`, `bazaar`), `customer_type` (`local`, `out_of_town`), `customer_status` (`active`, `deactivated`, `deleted`), `bazaar_status` (`draft`, `pending_review`, `approved`, `rejected`, `suspended`, `deleted`), `proposal_status` (`draft`, `pending`, `approved`, `rejected`, `discarded`), `document_status` (`pending`, `current`, `rejected`), `bazaar_document_type` (`id_card`, `selfie`, `proof_of_address`, `registration_payment`), `order_status` (`registered`, `payment_pending`, `payment_confirmed`, `receiving`, `complete`, `shipped`, `delivered`, `cancelled`), `payment_concept` (`initial_deposit`), `payment_method` (`manual_transfer`), `payment_status` (`pending`, `confirmed`, `rejected`), `shipment_type` (`carrier`, `local_delivery`, `local_pickup`), `notification_kind` (`package_received`, `package_unassigned`, `payment_confirmed`, `payment_rejected`, `order_shipped`), `notification_channel` (`whatsapp_link`); función de trigger `set_updated_at()`
- [ ] T014 Crear `supabase/migrations/20261004000200_profiles.sql`: tabla `profiles` (`id` = `auth.users.id` con `on delete cascade`, `role user_role not null`, `email`, `privacy_accepted_at` "no nulo para `customer` y `bazaar`"), función `is_collector()` (`SECURITY DEFINER`, `STABLE`, `search_path` fijo), función `promote_to_collector(email text)` sin `GRANT` a `anon`/`authenticated`, RLS: usuario lee su fila; recolectora lee y actualiza todas
- [ ] T015 Crear `supabase/migrations/20261004000300_customers.sql`: tabla `customers` según data-model.md (`profile_id` UNIQUE y nulo = "clienta sin cuenta", `created_by`, `code` UNIQUE "5 caracteres de `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, inmutable", `full_name` "2–120 caracteres", `whatsapp` "exactamente 10 dígitos (México); UNIQUE", `shipping_address` "10–500 caracteres", `type`, `status` default `active`, `deleted_at`; check "`whatsapp` y `shipping_address` son nulos solo cuando `status = 'deleted'`"), función `generate_customer_code()` con reintento ante colisión, trigger que impide cambiar `code`, función `current_customer_id()` (`SECURITY DEFINER`, `STABLE`), RLS: clienta lee su fila y actualiza `whatsapp`, `shipping_address`, `type` solo si `status = 'active'` (nunca `code`, `profile_id` ni `status`); recolectora lee, crea y actualiza todas
- [ ] T016 Crear `supabase/migrations/20261004000400_bazaars.sql`: tablas `bazaars` (versión **publicada**: `name` "2–80 caracteres", `brands text[]` "1–30 marcas, cada una 1–40 caracteres", `link_url` "URL `https://` válida", los tres nulos hasta la primera aprobación y "no nulo en `approved` y `suspended`"; `status` default `draft`, `status_reason`, `submitted_at`, `reviewed_at`, `reviewed_by`, `search_text`), `bazaar_profile_proposals` (`name`, `brands`, `link_url` con las mismas reglas, `photo_paths text[]` "0–3 rutas en el bucket privado `bazaar-photo-submissions`, prefijo `{bazaar_id}/`", `status proposal_status` default `draft`, `rejection_reason` "obligatorio si `rejected`", `submitted_at`, `reviewed_at`, `reviewed_by`; índice único parcial "Como máximo una propuesta en `draft` o `pending` por bazar"), `bazaar_photos` (`position` "1–3; UNIQUE (bazaar_id, position); un bazar puede tener 0 fotos", solo autorizadas), `bazaar_documents` (`storage_path` nulo en `rejected`, `status document_status` default `pending`, `rejection_reason` "obligatorio si `rejected`", `reviewed_at`, `reviewed_by`; índices únicos parciales "como máximo un `current` y un `pending` por (bazaar_id, type)"), `bazaar_references` (`position` 1–3 UNIQUE, `full_name` 2–120, `phone` 10 dígitos); trigger que mantiene `search_text = lower(unaccent(coalesce(name,'') || ' ' || array_to_string(brands, ' ')))` con índice GIN `gin_trgm_ops`; función `current_bazaar_id()`; trigger `validate_bazaar_transition()` con la tabla de transiciones de data-model.md (`draft`/`rejected` → `pending_review` solo por el bazar y solo con una propuesta con nombre, marcas y link, 4 documentos y 3 referencias — las fotos son opcionales —, fijando `submitted_at` y pasando la propuesta a `pending`; los 4 documentos cuentan si están `pending` o `current`; `pending_review` → `approved`/`rejected`, `approved` → `suspended`, `suspended` → `approved` solo recolectora; al rechazar el registro la propuesta regresa a `draft`; al pasar a `suspended` o `deleted` las propuestas `draft`/`pending` se marcan `discarded`; `status_reason` obligatorio en `rejected` y `suspended`); RLS según la matriz de data-model.md (bazar solo **lee** `bazaars` y `bazaar_photos` propios; propuestas: bazar L propio y C/A solo en `draft` y solo si el bazar no está `suspended`/`deleted`; recolectora L/A; `bazaar_photos` solo la escribe la recolectora; documentos: bazar L propio y C/B propio solo en `pending` (nunca `current` ni `rejected`), recolectora L/A/B; referencias: bazar L/C/A propias en cualquier estado salvo `deleted` (también en `suspended`), recolectora L; fotos públicas legibles por `anon` solo si el bazar está `approved`)
- [ ] T017 Crear en la misma carpeta `supabase/migrations/20261004000500_directory_search.sql`: función `search_directory(q text default '')` `SECURITY DEFINER` con `GRANT EXECUTE` a `anon` y `authenticated`, que normaliza `q` con `lower(unaccent(...))`, filtra `status = 'approved'`, busca con `ILIKE '%' || q || '%'` sobre `search_text`, ordena por `similarity` y devuelve solo `id, name, brands, link_url, photo_paths[]` (ordenadas por `position`)
- [ ] T018 Crear `supabase/migrations/20261004000600_auth_signup.sql`: trigger `handle_new_user()` en `auth.users` que lee `raw_user_meta_data.role` (solo acepta `customer` o `bazaar`; cualquier otro valor aborta), crea `profiles` con `privacy_accepted_at`, y para `customer`: si existe una clienta con ese `whatsapp` y `profile_id` nulo, liga la fila solo si `customer_code` coincide (si no, aborta con `CODE_REQUIRED`); si no existe, crea la clienta con `generate_customer_code()`; para `bazaar`: crea `bazaars` en `draft` con `name`, `brands` y `link_url` en nulo (se publican al aprobar la propuesta). Función `check_customer_claim(whatsapp text, code text)` con `GRANT` a `anon` que devuelve solo `'free' | 'code_required' | 'ok' | 'has_account'` (`has_account` si el número ya pertenece a una clienta con cuenta; si el trigger encuentra ese caso, aborta con `ACCOUNT_EXISTS`)
- [ ] T019 Crear `supabase/migrations/20261004000700_settings.sql`: tabla `settings` de una sola fila (`id = 1` con check), `initial_deposit_cents` "> 0", `payment_instructions`, `template_package_received`, `template_package_unassigned`, `template_payment_confirmed`, `template_payment_rejected`, `template_order_shipped` con los textos por defecto de `contracts/notifications.md`; RLS: solo la recolectora lee y actualiza; función `get_payment_info()` (`SECURITY DEFINER`, ejecutable solo por clientas y recolectora) que devuelve únicamente `initial_deposit_cents` y `payment_instructions`
- [ ] T020 Crear `supabase/migrations/20261004000800_orders.sql`: tablas `orders` (`folio integer generated always as identity` único, `description` "3–2,000 caracteres", `expected_packages` "1–99", `status` default `registered`, `cancelled_reason`), `order_bazaars` (`bazaar_id` nulo, `bazaar_name` "obligatorio si `bazaar_id` es nulo (texto libre, 2–80)", `on delete cascade`), `order_status_history` (solo inserción), tabla `order_status_transitions(from_status, to_status, actor)` con RLS activado y sin políticas (nadie la lee ni la escribe por la API; solo la usa el trigger) y con todas las filas de data-model.md (incluida `payment_pending` → `receiving` al confirmar el pago de un pedido que ya tiene paquetes); trigger `validate_order_transition()` que rechaza cualquier cambio de `status` no listado y `cancelled_reason` vacío al cancelar; trigger `log_order_status()` que inserta en `order_status_history` con `auth.uid()`; vista `order_summaries` (`security_invoker = true`) con `received_packages`, último pago y envío; RLS: clienta **lee siempre** sus pedidos (también dada de baja o con pedidos enviados), y crea o actualiza solo si su `customers.status = 'active'` y el pedido está antes de `complete`; recolectora L/C/A todo
- [ ] T021 Crear `supabase/migrations/20261004000900_payments.sql`: tabla `payments` (`amount_cents` copiado de `settings.initial_deposit_cents` por trigger al crear, `proof_path` nulo "obligatorio si lo sube la clienta, opcional si lo anota la recolectora", `recorded_by`, `status` default `pending`, `rejection_reason` "obligatorio si `rejected`", `reviewed_at`, `reviewed_by`), índice único parcial "Solo un pago `pending` o `confirmed` por pedido y concepto"; trigger `sync_order_from_payment()` (insert `pending` → pedido `payment_pending`; insert `confirmed` por recolectora → `payment_confirmed`; update a `confirmed` → `payment_confirmed`, o `receiving` si ya hay paquetes; update a `rejected` → `registered`); RLS: clienta L propio y C solo con `status = 'pending'`, `proof_path` no nulo y su `customers.status = 'active'`; recolectora L/C/A
- [ ] T022 Crear `supabase/migrations/20261004001000_packages_shipments_notifications.sql`: tablas `packages` (`customer_id` nulo = "sin identificar", `order_id` nulo = "sin pedido" y check de misma clienta, `bazaar_id`, `bazaar_name`, `photo_path` obligatorio, `note` "0–500 caracteres", `received_at`, `received_by`), `shipments` (`order_id` UNIQUE, `carrier` "obligatorio si `carrier` (2–60)", `tracking_number` "obligatorio si `carrier` (3–60)", `cost_cents` "≥ 0", `shipped_at`, `delivered_at`; trigger: tipos `local_*` "solo si la clienta es `local`"), `notifications` (`order_id`, `package_id`, `payment_id`, `shipment_id` nulos, `body`, `created_by`); triggers `sync_order_from_package()` (primer paquete en pedido `payment_confirmed` → `receiving`; bloquear mover paquetes de/a pedidos `shipped`, `delivered` o `cancelled`) y `sync_order_from_shipment()` (insert → pedido `shipped`; pedido `delivered` fija `delivered_at`); RLS según la matriz de data-model.md
- [ ] T023 Crear `supabase/migrations/20261004001100_storage.sql`: buckets `bazaar-photos` (público, 1 MB, imágenes; solo la recolectora escribe y borra), `bazaar-photo-submissions` (privado, 1 MB, imágenes; el bazar sube, lee y borra en su carpeta, la recolectora lee), `bazaar-documents` (privado, 5 MB, imágenes y PDF; el bazar sube en su carpeta y solo borra archivos de filas propias en `pending`; solo la recolectora lee y borra el resto), `payment-proofs` (privado, 5 MB, imágenes y PDF) y `package-photos` (privado, 1 MB, JPEG); políticas de `storage.objects` exactamente como `contracts/storage.md` usando `(storage.foldername(name))[1]`, `current_bazaar_id()`, `current_customer_id()` e `is_collector()`; clienta puede leer de `package-photos` solo si existe una fila de `packages` suya con ese `photo_path`
- [ ] T024 Crear `supabase/seed.sql` con: recolectora `recolectora@test.local`, clienta local y clienta foránea con cuenta, una clienta sin cuenta, un bazar en cada estado (`draft`, `pending_review`, `approved` ×2, `rejected`, `suspended`) con propuestas, fotos, documentos y referencias de ejemplo, un bazar `approved` sin fotos, uno `approved` con una propuesta de cambio `pending` y uno `approved` con un documento `current` y su reemplazo `pending`, y la fila de `settings`; contraseña de todos: `Prueba123!` (como en quickstart.md)
- [ ] T025 Ejecutar `pnpm supabase db reset` y `pnpm db:types` para generar `src/lib/supabase/database.types.ts`

### Sesión, roles y utilidades

- [ ] T026 [P] Crear clientes de Supabase tipados con `Database` en `src/lib/supabase/server.ts` (Server Components y Server Actions, cookies vía `@supabase/ssr`) y `src/lib/supabase/client.ts` (navegador)
- [ ] T027 Crear `src/lib/supabase/middleware.ts` y `src/middleware.ts`: refrescar sesión; sin sesión en `/admin/**`, `/mi-cuenta/**` o `/bazar/**` → `/entrar?next=…`; con rol distinto → inicio de su rol (`/admin`, `/mi-cuenta`, `/bazar`), leyendo el rol de `profiles`
- [ ] T028 [P] Crear `src/lib/auth/session.ts` con `getSessionProfile()` y `requireRole(role)` para Server Components y Server Actions (lanza `redirect` o devuelve error en español)
- [X] T029 [P] Crear `src/lib/action-result.ts` con el tipo `ActionResult<T>` de `contracts/server-actions.md` y helpers `ok()`, `fail()`, `fromZodError()` y `fromPostgrestError()` (traduce errores de RLS y de triggers a mensajes en español)
- [X] T030 [P] Crear `src/lib/format.ts`: `formatMoney(cents)` con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`, `formatDate`/`formatDateTime` con `timeZone: 'America/Tijuana'` en formato dd/mm/aaaa, `toCents(pesos)`
- [X] T031 [P] Crear `src/lib/validation/messages.ts` (mensajes de error de Zod en español), `src/lib/validation/phone.ts` (normaliza a "exactamente 10 dígitos"; `toWhatsAppNumber` antepone `52`) y `src/lib/validation/customer-code.ts` (mayúsculas, quita espacios y guiones, valida alfabeto `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` y longitud 5)
- [ ] T032 [P] Crear `src/lib/uploads/compress.ts` (`browser-image-compression` con `maxSizeMB: 0.2`, `maxWidthOrHeight: 1600`, salida JPEG), `src/lib/uploads/paths.ts` (construye y valida rutas por bucket según `contracts/storage.md`) y `src/lib/uploads/upload.ts` (sube con el cliente del navegador y devuelve el `path`; valida tipo y tamaño: imágenes ≤ 1 MB tras compresión, PDF ≤ 5 MB)
- [ ] T033 [P] Crear el componente `src/components/file-upload.tsx` (selector de archivo con vista previa, compresión de imágenes, `capture="environment"` opcional para cámara, estados de carga y error en español) que entrega el `path` subido al formulario
- [ ] T034 [P] Crear el módulo de notificaciones según `contracts/notifications.md`: `src/lib/notifications/types.ts`, `src/lib/notifications/messages.ts` (`renderTemplate`, `validateTemplate`, `buildPackageReceivedMessage`, `buildPackageUnassignedMessage`, `buildPaymentConfirmedMessage`, `buildPaymentRejectedMessage`, `buildOrderShippedMessage`; elimina la línea con `{enlace}` si la clienta no tiene cuenta), `src/lib/notifications/whatsapp-link.ts` (`https://wa.me/52{toPhone}?text={encodeURIComponent(body)}`) y `src/lib/notifications/index.ts` (`notify(kind, context)` que construye el mensaje, inserta en `notifications` y llama al canal activo)
- [X] T035 [P] Crear `src/components/open-whatsapp.tsx`: recibe un `DeliveryResult`; si es `open_url` navega a la URL y muestra respaldo con botón "Copiar mensaje" por si WhatsApp no abre
- [ ] T036 Crear `src/features/orders/status.ts` con la tabla de transiciones de data-model.md (idéntica a `order_status_transitions`) y `canTransition(from, to, actor)`, y `src/features/orders/labels.ts` con etiquetas en español de cada estado (p. ej. `payment_pending` → "Pago inicial pendiente")
- [X] T037 [P] Crear `src/app/layout.tsx` con `lang="es-MX"`, fuentes, `Toaster` y metadatos; `src/app/manifest.ts` (nombre, `display: 'standalone'`, `lang: 'es-MX'`, íconos 192/512 y maskable en `public/icons/`)
- [X] T038 [P] Crear el componente compartido `src/components/bazaar-card.tsx` (props: nombre, marcas, link y 0–3 URLs de fotos; fotos deslizables con `next/image`; sin fotos muestra un recuadro con nombre y marcas y sin imagen ni marcador de imagen rota; botón "Ver su página" con `target="_blank"` y `rel="noopener noreferrer"`), usado por el directorio (US6) y por la vista previa del bazar (US4) y de la recolectora (US5)
- [ ] T039 [P] Crear barras de navegación por rol, pensadas para celular, en `src/components/layout/public-nav.tsx`, `src/components/layout/customer-nav.tsx`, `src/components/layout/bazaar-nav.tsx` y `src/components/layout/admin-nav.tsx`, y los layouts `src/app/mi-cuenta/layout.tsx`, `src/app/bazar/layout.tsx` y `src/app/admin/layout.tsx` que llaman `requireRole`
- [ ] T040 Crear `src/features/auth/schemas.ts` y `src/features/auth/actions.ts` con `signIn` (redirige según rol), `signOut`, `requestPasswordReset` y `updatePassword`; páginas `src/app/(public)/entrar/page.tsx`, `src/app/(public)/recuperar/page.tsx` y ruta `src/app/auth/callback/route.ts`
- [X] T041 [P] Crear `src/app/(public)/aviso-de-privacidad/page.tsx` con estructura del aviso (responsable, datos recabados por rol, finalidades, quién los ve, enlaces temporales, cómo eliminar la cuenta desde la app y cómo pedir a la recolectora la eliminación de datos según FR-050); el texto legal final se revisa en T150

### Base de pruebas

- [ ] T042 [P] Crear `tests/helpers/supabase.ts` (cliente admin con service role solo para pruebas, `createTestUser(role, data)`, `signInAs(email)` que devuelve un cliente con sesión, `resetTestData()`) y `tests/helpers/fixtures.ts` (crea clienta, pedido, pago, paquete y bazar en el estado pedido)
- [ ] T043 [P] Agregar archivos de prueba en `tests/e2e/fixtures/` (`package.jpg`, `id-card.jpg`, `selfie.jpg`, `proof.pdf`, `bazaar-1.jpg`, `bazaar-2.jpg`, `bazaar-3.jpg`) y `tests/e2e/helpers/auth.ts` (inicio de sesión por rol en Playwright)
- [X] T044 [P] Prueba unitaria `tests/unit/validation.test.ts`: teléfono (10 dígitos, `toWhatsAppNumber`), código de clienta (normalización y alfabeto), `formatMoney` y `formatDate` en zona America/Tijuana
- [X] T045 [P] Prueba unitaria `tests/unit/notifications.test.ts`: cada plantilla por defecto, reemplazo de variables, `validateTemplate` rechaza variables desconocidas, omisión de la línea `{enlace}` para clienta sin cuenta, URL `wa.me/52…` codificada correctamente (incluye emojis y saltos de línea), variantes de envío `carrier`/`local_delivery`/`local_pickup`, mensaje de paquete "sin pedido" con enlace a `/mi-cuenta`
- [X] T046 [P] Prueba unitaria `tests/unit/order-status.test.ts` de `canTransition` para cada fila permitida y ejemplos prohibidos (p. ej. `registered` → `shipped`)
- [ ] T047 Prueba de integración `tests/integration/order-status-sync.test.ts`: la tabla `order_status_transitions` (leída con el cliente de pruebas con service role) coincide exactamente con `src/features/orders/status.ts`, y el trigger rechaza una transición no permitida
- [ ] T048 Prueba de integración `tests/integration/roles-signup.test.ts`: `signUp` con `role: 'collector'` o rol desconocido falla; `customer` crea `profiles` + `customers` con código de 5 caracteres; `bazaar` crea `bazaars` en `draft`; ningún usuario puede actualizar su `profiles.role`

**Checkpoint**: base lista; las historias pueden empezar (en orden de prioridad o en paralelo).

---

## Phase 3: User Story 1 - Registro de clientas y pedidos con pago inicial (Priority: P1) 🎯 MVP

**Goal**: la clienta se registra y recibe su código; registra pedidos con comprobante; la
recolectora confirma o rechaza el pago con aviso por WhatsApp; la recolectora también puede dar de
alta clientas sin cuenta y registrar pedidos y pagos a su nombre (FR-041–FR-045, FR-051).

**Independent Test**: registrar una clienta, ver su código, crear un pedido con comprobante,
confirmar el pago como recolectora (se abre WhatsApp) y ver "Pago confirmado" como clienta.

### Tests for User Story 1 ⚠️

- [ ] T049 [P] [US1] Prueba unitaria `tests/unit/customer-order-schemas.test.ts` de los esquemas de US1 (límites: `full_name` 2–120, `whatsapp` 10 dígitos, `shipping_address` 10–500, `description` 3–2,000, `expected_packages` 1–99, `bazaar_name` 2–80, al menos un bazar, `acceptPrivacy` obligatorio)
- [ ] T050 [P] [US1] Prueba de integración `tests/integration/rls-customers-orders.test.ts`: una clienta solo lee sus `customers`, `orders`, `order_status_history` y `payments`; no puede cambiar `code` ni `status`; no puede crear pagos `confirmed`; no puede leer archivos de `payment-proofs` (ni los propios); una clienta `deactivated` no puede crear pedidos; la recolectora lee todo
- [ ] T051 [P] [US1] Prueba de integración `tests/integration/payments-flow.test.ts`: pago `pending` → pedido `payment_pending`; confirmar → `payment_confirmed`; rechazar → `registered` con `rejection_reason`; segundo pago `pending` mientras hay uno `pending` falla; pago anotado `confirmed` por la recolectora → `payment_confirmed`; pedido en `payment_pending` con paquetes asociados → al confirmar pasa a `receiving`; una clienta dada de baja no puede crear pagos pero sí ve sus pedidos
- [ ] T052 [P] [US1] Prueba de integración `tests/integration/customer-claim.test.ts`: `check_customer_claim` devuelve `free`/`code_required`/`ok`/`has_account` sin otros datos; registro con el WhatsApp de una clienta con cuenta falla con `ACCOUNT_EXISTS` y no crea filas; registro con WhatsApp de clienta sin cuenta y código correcto liga la fila y conserva `code` y pedidos; código incorrecto rechaza el registro
- [ ] T053 [P] [US1] Prueba E2E (flujo crítico "creación de pedido") `tests/e2e/create-order.spec.ts`: registro de clienta → confirmación de correo (Inbucket) → ve su código → crea pedido con comprobante → recolectora confirma pago (verifica URL `wa.me` con folio) → clienta ve "Pago confirmado"; variante de rechazo con motivo y nuevo comprobante
- [ ] T054 [P] [US1] Prueba E2E `tests/e2e/customer-without-account.spec.ts`: recolectora da de alta clienta sin cuenta → crea pedido y anota pago confirmado → la clienta se registra con el mismo WhatsApp y su código → ve el pedido

### Implementation for User Story 1

- [ ] T055 [P] [US1] Crear `src/features/customers/schemas.ts` (`signUpCustomerSchema` con `fullName` 2–120, `whatsapp` 10 dígitos, `shippingAddress` 10–500, `type`, `email`, `password` mínimo 8, `acceptPrivacy: z.literal(true)`, `customerCode` opcional; `createCustomerSchema`; `updateCustomerProfileSchema`) y `src/features/customers/labels.ts` (`local` → "Local", `out_of_town` → "Foránea"; estados de clienta)
- [ ] T056 [P] [US1] Crear `src/features/orders/schemas.ts` (`orderBazaarSchema` = `{ bazaarId }` o `{ bazaarName }` 2–80; `createOrderSchema` con `bazaars` mínimo 1, `description` 3–2,000, `expectedPackages` 1–99, `proofPath` opcional; `updateOrderSchema`; `cancelOrderSchema` con `reason` obligatorio; `createOrderForCustomerSchema`)
- [ ] T057 [P] [US1] Crear `src/features/payments/schemas.ts` (`submitPaymentProofSchema`, `reviewPaymentSchema` con `reason` obligatorio si `decision = 'reject'`, `recordConfirmedPaymentSchema` con `amountCents` > 0 y `proofPath` opcional) y `src/features/payments/labels.ts`
- [ ] T058 [US1] Implementar en `src/features/customers/actions.ts`: `signUpCustomer` (llama `check_customer_claim` y devuelve `CODE_REQUIRED` o `ACCOUNT_EXISTS` sin revelar otros datos; con `ACCOUNT_EXISTS` el formulario muestra "Ya existe una cuenta con ese número" con enlaces a `/entrar` y `/recuperar`; `supabase.auth.signUp` con metadatos `role: 'customer'`, perfil, `customer_code` y `emailRedirectTo` a `/auth/callback`), `updateCustomerProfile`, `createCustomer` (solo recolectora, FR-041) y `updateCustomer` (solo recolectora: nombre, WhatsApp, dirección y tipo de cualquier clienta; nunca `code`; FR-008)
- [ ] T059 [US1] Implementar `src/features/customers/queries.ts`: `getMyCustomer()`, `getCustomerByCode(code)` y `listCustomers({ q, status, hasAccount })` para la recolectora
- [ ] T060 [US1] Implementar en `src/features/orders/actions.ts`: `createOrder` (inserta `orders`, `order_bazaars` y, si hay `proofPath` validado contra la carpeta de la clienta, el pago `pending`), `updateOrder` (clienta o recolectora, solo antes de `complete`), `submitPaymentProof`, `cancelOrder` (clienta solo sin pagos confirmados ni paquetes; recolectora en cualquier estado salvo `shipped`/`delivered`) y `createOrderForCustomer` (solo recolectora, FR-042)
- [ ] T061 [US1] Implementar `src/features/orders/queries.ts`: `listMyOrders()`, `getOrderByFolio(folio)` (con bazares, historial, pagos, paquetes y envío desde `order_summaries`) y `listOrders(filters)` para la recolectora
- [ ] T062 [US1] Implementar en `src/features/payments/actions.ts`: `reviewPayment` (actualiza el pago; llama `notify('payment_confirmed' | 'payment_rejected', …)` y devuelve `{ payment, orderStatus, notification }`, FR-051), `recordConfirmedPayment` (sin aviso, FR-043) y `getPaymentProofUrl` (enlace firmado de 10 min con la sesión de la recolectora)
- [ ] T063 [US1] Implementar `src/features/payments/queries.ts`: `listPendingPayments()` con clienta, folio, monto y fecha
- [ ] T064 [P] [US1] Crear `src/features/customers/components/sign-up-customer-form.tsx` (React Hook Form + `signUpCustomerSchema`; si la acción responde `CODE_REQUIRED`, muestra el campo "Código de clienta" con explicación) y la página `src/app/(public)/registro/clienta/page.tsx` con enlace al aviso de privacidad
- [ ] T065 [P] [US1] Crear `src/features/customers/components/customer-code-card.tsx` (código grande, botón "Copiar" e instrucciones para compartirlo con los bazares) y `src/features/customers/components/customer-profile-form.tsx`
- [ ] T066 [US1] Crear `src/app/mi-cuenta/page.tsx`: tarjeta del código, aviso si la cuenta está dada de baja temporal, lista de pedidos con estado y conteo recibidos/esperados, botón "Nuevo pedido" y formulario de datos
- [ ] T067 [P] [US1] Crear `src/features/orders/components/bazaar-picker.tsx` (busca bazares aprobados con `search_directory` y permite escribir un bazar no registrado como texto libre; varios bazares por pedido)
- [ ] T068 [P] [US1] Crear `src/features/orders/components/order-form.tsx` (bazares, descripción, paquetes esperados y `FileUpload` del comprobante al bucket `payment-proofs`; muestra el monto con `formatMoney` y las instrucciones de pago obtenidas con `get_payment_info()`)
- [ ] T069 [US1] Crear `src/app/mi-cuenta/pedidos/nuevo/page.tsx` que usa `OrderForm` y `createOrder` y redirige al detalle del pedido
- [ ] T070 [P] [US1] Crear `src/features/orders/components/order-status-badge.tsx` y `src/features/orders/components/order-timeline.tsx` (historial con fechas en America/Tijuana y motivos)
- [ ] T071 [US1] Crear `src/app/mi-cuenta/pedidos/[folio]/page.tsx`: estado, historial, bazares, descripción, último pago y motivo de rechazo, botón para subir nuevo comprobante (`submitPaymentProof`), edición antes de `complete` y cancelación cuando está permitida; responde "No encontrado" si el folio no es suyo
- [ ] T072 [P] [US1] Crear `src/features/payments/components/payment-review-card.tsx` (vista del comprobante con enlace temporal, botones Confirmar y Rechazar con motivo; al terminar usa `OpenWhatsApp`)
- [ ] T073 [US1] Crear `src/app/admin/pagos/page.tsx` con la lista de pagos por revisar usando `PaymentReviewCard`
- [ ] T074 [P] [US1] Crear `src/app/admin/clientas/nueva/page.tsx` con formulario `createCustomer` que al guardar muestra el código y un botón para compartirlo por WhatsApp
- [ ] T075 [US1] Crear `src/app/admin/pedidos/nuevo/page.tsx` (elige clienta por código o nombre, `OrderForm` sin comprobante obligatorio, y sección opcional "Anotar pago recibido" con `recordConfirmedPayment`)
- [ ] T076 [US1] Crear `src/app/admin/pedidos/[folio]/page.tsx` con la sección de datos del pedido, historial, pagos (ver comprobante, confirmar/rechazar) y cancelación con motivo; las secciones de paquetes (US2) y envío (US3) se agregan en sus fases

**Checkpoint**: US1 completa y probada; el MVP ya permite registrar clientas, pedidos y anticipos.

---

## Phase 4: User Story 2 - Recepción de paquetes desde el celular (Priority: P1)

**Goal**: la recolectora registra cada paquete desde el celular buscando por código, con foto, y
avisa a la clienta por WhatsApp; la clienta ve las fotos en su pedido.

**Independent Test**: con datos de `seed.sql`, registrar un paquete desde el viewport de celular
por código, verificar que aparece en el pedido, que el pedido pasa a "Recibiendo paquetes" y que
se genera la URL `wa.me` correcta.

### Tests for User Story 2 ⚠️

- [ ] T077 [P] [US2] Prueba unitaria `tests/unit/package-schemas.test.ts` (`note` 0–500, foto obligatoria, `bazaarId` o `bazaarName`, paquete sin clienta permitido solo como "sin identificar")
- [ ] T078 [P] [US2] Prueba de integración `tests/integration/rls-packages.test.ts`: solo la recolectora crea paquetes; la clienta lee solo sus paquetes y puede crear un enlace firmado de su foto, pero no de fotos de otra clienta; paquete en pedido de otra clienta es rechazado; primer paquete pasa el pedido a `receiving`; mover paquete a un pedido `shipped` falla; registrar un paquete "sin pedido" guarda un aviso `package_unassigned` con enlace a `/mi-cuenta` (sin la línea del enlace si la clienta no tiene cuenta) y al asignarlo a un pedido con `assignPackage` guarda un aviso `package_received`; un paquete "sin identificar" no guarda aviso
- [ ] T079 [P] [US2] Prueba de integración `tests/integration/find-customer.test.ts`: `find_customer` encuentra por código exacto (normalizado), por nombre y por teléfono parciales; una clienta o un bazar no pueden ejecutarla
- [ ] T080 [P] [US2] Prueba E2E (flujo crítico "registro de paquete recibido") `tests/e2e/register-package.spec.ts` en proyecto `mobile`: recolectora escribe el código → pedido preseleccionado → sube `package.jpg` → guarda → se navega a `wa.me/52…` con bazar, conteo y enlace al pedido; la clienta inicia sesión y ve la foto; otra clienta no puede abrir el pedido

### Implementation for User Story 2

- [ ] T081 [US2] Crear `supabase/migrations/20261004001200_find_customer.sql`: función `find_customer(q text)` (`SECURITY DEFINER`, ejecuta solo si `is_collector()`) que devuelve clientas no eliminadas por código exacto o por nombre/teléfono parcial, con sus pedidos activos (no `shipped`, `delivered` ni `cancelled`); regenerar tipos con `pnpm db:types`
- [ ] T082 [P] [US2] Crear `src/features/packages/schemas.ts` (`registerPackageSchema` con `customerId` y `orderId` opcionales, `bazaarId` o `bazaarName`, `note` "0–500 caracteres", `photoPath` obligatorio; `assignPackageSchema`)
- [ ] T083 [US2] Implementar en `src/features/packages/actions.ts`: `findCustomerForPackage`, `registerPackage` (valida `photoPath` en `package-photos/{customer_id or 'unidentified'}/`, inserta y llama `notify('package_received', …)` con conteo recibidos/esperados y `{enlace}` a `/mi-cuenta/pedidos/{folio}`; si no hay pedido, `notify('package_unassigned', …)` con `{enlace}` a `/mi-cuenta`; sin aviso si no hay clienta), `assignPackage` (al asignar a un pedido genera el aviso `package_received`) y `getPackagePhotoUrl` (enlace firmado de 60 min con la sesión del usuario)
- [ ] T084 [US2] Implementar `src/features/notifications/actions.ts` con `resendNotification(notificationId)` (solo recolectora) que vuelve a generar el `DeliveryResult` desde `notifications.body`
- [ ] T085 [US2] Implementar `src/features/packages/queries.ts`: `listPackages({ filter: 'all' | 'no_order' | 'unidentified', q })` y `listPackagesByOrder(orderId)`
- [ ] T086 [P] [US2] Crear `src/features/packages/components/customer-search.tsx` (campo grande para el código con teclado en mayúsculas, resultados con pedidos activos; preselecciona si hay uno; opción "Sin identificar")
- [ ] T087 [P] [US2] Crear `src/features/packages/components/package-form.tsx` (`FileUpload` con `capture="environment"` al bucket `package-photos`, bazar de origen con `BazaarPicker`, nota; botón Guardar grande y usable con una mano; al guardar usa `OpenWhatsApp`; si falla la subida conserva los datos y permite reintentar)
- [ ] T088 [US2] Crear `src/app/admin/paquetes/nuevo/page.tsx` combinando `CustomerSearch` y `PackageForm`, con el conteo "N de M" visible y aviso cuando se excede lo esperado
- [ ] T089 [US2] Crear `src/app/admin/paquetes/page.tsx` con pestañas "Todos", "Sin pedido" y "Sin identificar" y acción para asignar con `assignPackage` (abre WhatsApp al asignar a una clienta)
- [ ] T090 [P] [US2] Crear `src/features/packages/components/package-gallery.tsx` (miniaturas con enlaces firmados, fecha de recepción, bazar y nota)
- [ ] T091 [US2] Agregar la sección de paquetes (galería, conteo, mover paquete a otro pedido de la misma clienta, reenviar aviso) a `src/app/admin/pedidos/[folio]/page.tsx`
- [ ] T092 [US2] Agregar la galería de paquetes y el conteo recibidos/esperados a `src/app/mi-cuenta/pedidos/[folio]/page.tsx`

**Checkpoint**: US1 y US2 funcionan; la operación diaria de recepción está cubierta.

---

## Phase 5: User Story 3 - Cierre y envío del pedido (Priority: P2)

**Goal**: la recolectora marca el pedido completo, registra el envío (paquetería o entrega/
recolección en persona para clientas locales) con aviso por WhatsApp y lo marca entregado.

**Independent Test**: con un pedido en `receiving`, marcar completo (con confirmación si faltan
paquetes), registrar envío con guía, verificar URL `wa.me` y estado "Enviado", y marcar entregado.

### Tests for User Story 3 ⚠️

- [ ] T093 [P] [US3] Prueba unitaria `tests/unit/shipment-schemas.test.ts` (`carrier` 2–60 y `tracking_number` 3–60 obligatorios si `type = 'carrier'`, `cost_cents` ≥ 0, tipos `local_*` rechazados para clienta foránea)
- [ ] T094 [P] [US3] Prueba de integración `tests/integration/rls-shipments.test.ts`: solo la recolectora crea envíos; la clienta lee solo el suyo; envío `local_delivery` para clienta `out_of_town` falla; insertar envío pasa el pedido a `shipped`; un segundo envío para el mismo pedido falla
- [ ] T095 [P] [US3] Prueba E2E (flujo crítico "envío") `tests/e2e/ship-order.spec.ts`: marcar completo con menos paquetes pide confirmación → registrar envío por paquetería → URL `wa.me` con paquetería y guía → clienta ve guía y costo → marcar entregado; variante clienta local con "Entrega en persona"

### Implementation for User Story 3

- [ ] T096 [P] [US3] Crear `src/features/shipments/schemas.ts` (`registerShipmentSchema` con unión discriminada por `type`: `carrier` requiere `carrier` 2–60 y `trackingNumber` 3–60; `costCents` ≥ 0; `markOrderCompleteSchema` con `confirmIncomplete`) y `src/features/shipments/labels.ts` (`carrier` → "Paquetería", `local_delivery` → "Entrega en persona", `local_pickup` → "Recolección en persona")
- [ ] T097 [US3] Implementar en `src/features/shipments/actions.ts`: `markOrderComplete` (error `INCOMPLETE_PACKAGES` con el conteo si recibidos < esperados y `confirmIncomplete` es falso), `registerShipment` (inserta y llama `notify('order_shipped', …)`), `markOrderDelivered`
- [ ] T098 [US3] Implementar `src/features/shipments/queries.ts`: `listShipments({ q, type, status })`
- [ ] T099 [P] [US3] Crear `src/features/shipments/components/shipment-form.tsx` (tipo: solo "Paquetería" para foráneas; los tres para locales; campos condicionales; costo en pesos convertido a centavos; al guardar usa `OpenWhatsApp`)
- [ ] T100 [P] [US3] Crear `src/features/shipments/components/complete-order-button.tsx` (diálogo de confirmación cuando faltan paquetes) y `src/features/shipments/components/shipment-summary.tsx`
- [ ] T101 [US3] Agregar a `src/app/admin/pedidos/[folio]/page.tsx` las acciones Marcar completo, Registrar envío y Marcar entregado según el estado
- [ ] T102 [US3] Agregar `ShipmentSummary` (tipo, paquetería, guía y costo) a `src/app/mi-cuenta/pedidos/[folio]/page.tsx`
- [ ] T103 [US3] Crear `src/app/admin/envios/page.tsx` con la lista de envíos y búsqueda por clienta o guía

**Checkpoint**: ciclo completo de un pedido, de registro a entregado.

---

## Phase 6: User Story 4 - Registro de bazares (Priority: P2)

**Goal**: el bazar crea su cuenta, completa su ficha pública (fotos opcionales) y privada y la
envía a revisión; ya aprobado, propone cambios a su ficha que no se publican hasta que la
recolectora los autorice (FR-029 a FR-031).

**Independent Test**: crear cuenta de bazar, confirmar correo, completar datos sin fotos, 4
documentos y 3 referencias, enviar → "Pendiente de revisión"; sus documentos y sus fotos no
autorizadas no son legibles por nadie salvo la recolectora (y el propio bazar, en el caso de sus
fotos). Con el bazar aprobado de `seed.sql`, proponer un cambio → "Cambio en revisión".

### Tests for User Story 4 ⚠️

- [ ] T104 [P] [US4] Prueba unitaria `tests/unit/bazaar-schemas.test.ts` (`name` 2–80, `brands` 1–30 con cada una 1–40, `linkUrl` `https://`, `photoPaths` "0–3 rutas" con prefijo `{bazaar_id}/`, referencias `fullName` 2–120 y `phone` 10 dígitos, exactamente 3 referencias)
- [ ] T105 [P] [US4] Prueba de integración `tests/integration/rls-bazaars.test.ts`: el bazar solo lee `bazaars` y `bazaar_photos` propios y no puede escribirlos; no puede subir a `bazaar-photos` (público) pero sí a su carpeta de `bazaar-photo-submissions`; un anónimo, una clienta y otro bazar no pueden leer `bazaar-photo-submissions`; el bazar no puede leer archivos de `bazaar-documents` (ni los propios), solo puede insertar documentos `pending`, no puede cambiar `status` de un documento ni borrar uno `current`; solo puede editar su propuesta en `draft`; `draft` → `pending_review` funciona con 0 fotos y falla si faltan nombre, marcas, link, documentos o referencias; una clienta y un anónimo no pueden leer `bazaars`, `bazaar_profile_proposals`, `bazaar_documents` ni `bazaar_references`
- [ ] T106 [P] [US4] Prueba E2E (flujo crítico "registro de bazar") `tests/e2e/bazaar-registration.spec.ts`: crear cuenta → confirmar correo → completar ficha **sin fotos** con las fixtures → enviar con un documento faltante muestra la lista → completar y enviar → "Pendiente de revisión"; repetir agregando 2 fotos y verificar la vista previa

### Implementation for User Story 4

- [ ] T107 [P] [US4] Prueba de integración `tests/integration/bazaar-documents.test.ts`: un bazar aprobado sube un documento nuevo → queda `pending` y el `current` sigue igual; subir otro del mismo tipo reemplaza al `pending` y borra su archivo; `approve_bazaar_document` (solo recolectora) deja un único `current` y devuelve la ruta anterior; `reject_bazaar_document` exige motivo, conserva el `current` y pone `storage_path` en nulo; aprobar el bazar pasa todos sus documentos `pending` a `current`; un bazar `suspended` no puede subir documentos pero sí actualizar sus referencias
- [ ] T108 [P] [US4] Crear `src/features/bazaars/schemas.ts` (`signUpBazaarSchema`, `bazaarProposalSchema` con `name` 2–80, `brands` 1–30 de 1–40, `linkUrl` `https://` y `photoPaths` de 0 a 3, `bazaarDocumentSchema`, `bazaarReferencesSchema` con exactamente 3 referencias) y `src/features/bazaars/labels.ts` (estados del bazar y de la propuesta — `pending` → "Cambio en revisión" — y tipos de documento en español: "Credencial", "Foto de la persona", "Comprobante de domicilio", "Comprobante de pago de registro")
- [ ] T109 [US4] Implementar en `src/features/bazaars/actions.ts`: `signUpBazaar`, `saveBazaarProposal` (crea la propuesta `draft` si no existe, precargada con la versión publicada si el bazar está aprobado; si había una `pending`, la marca `discarded`), `setBazaarDocument` (inserta la fila `pending`; si ya había una `pending` del mismo tipo, borra antes su fila y su archivo; FR-032, FR-034), `saveBazaarReferences`, `submitBazaarForReview` (registro inicial; devuelve la lista de faltantes en español si el trigger lo rechaza), `submitBazaarProposal` (bazar aprobado → propuesta `pending`) y `getProposalPhotoUrls` (enlaces firmados de 60 min); validar cada `*Path` contra la carpeta `{bazaar_id}/` de su bucket
- [ ] T110 [US4] Implementar `src/features/bazaars/queries.ts`: `getMyBazaar()` con la versión publicada (datos y fotos), la propuesta abierta o la última rechazada con su motivo, documentos por tipo (fecha del vigente y estado del nuevo: "En revisión" o "Rechazado" con motivo; nunca el archivo) y referencias; y `getBazaarCompleteness()` (las fotos no cuentan como faltante)
- [ ] T111 [P] [US4] Crear `src/features/bazaars/components/sign-up-bazaar-form.tsx` y la página `src/app/(public)/registro/bazar/page.tsx` con aceptación del aviso de privacidad
- [ ] T112 [P] [US4] Crear `src/features/bazaars/components/bazaar-proposal-form.tsx` (nombre, marcas como etiquetas, link y de 0 a 3 fotos opcionales con `FileUpload` al bucket privado `bazaar-photo-submissions`; permite quitar y reordenar fotos; texto de ayuda "Las fotos son opcionales; los cambios se publican cuando la recolectora los autorice")
- [ ] T113 [P] [US4] Crear `src/features/bazaars/components/bazaar-documents-form.tsx` (4 documentos al bucket `bazaar-documents`; por tipo muestra "Vigente desde dd/mm/aaaa", el estado del nuevo y el motivo si fue rechazado, sin vista previa; botón "Actualizar documento" siempre disponible salvo en `suspended`, con la nota "El documento actual sigue vigente hasta que la recolectora autorice el nuevo") y `src/features/bazaars/components/bazaar-references-form.tsx`
- [ ] T114 [US4] Crear `src/app/bazar/page.tsx`: estado del registro con su significado, motivo si fue rechazado o suspendido, pasos con avance (datos públicos, documentos, referencias; fotos marcadas como opcionales), botón "Enviar a revisión" (o "Reenviar" si fue rechazado); ya aprobado: "Así te ven en el directorio" con `BazaarCard` de la versión publicada, botón "Proponer cambios" con `BazaarProposalForm`, estado "Cambio en revisión" con vista previa de la propuesta, o motivo del último rechazo; en `suspended` muestra aviso de baja temporal y bloquea la edición de la ficha y los documentos, pero deja editar las referencias

**Checkpoint**: los bazares pueden registrarse y proponer cambios; la recolectora los revisa en US5.

---

## Phase 7: User Story 5 - Aprobación de bazares (Priority: P2)

**Goal**: la recolectora revisa datos y documentos con enlaces temporales y aprueba, rechaza,
suspende o reactiva bazares; además autoriza o rechaza los cambios de ficha propuestos por bazares
aprobados, y solo entonces se publican (FR-029 a FR-031).

**Independent Test**: con un bazar `pending_review` de `seed.sql`, abrir documentos, aprobar y
verificar que aparece en el directorio con sus fotos copiadas al bucket público; suspender y
verificar que desaparece. Con el bazar que tiene una propuesta `pending`, autorizarla y verificar
que el directorio muestra la nueva versión.

### Tests for User Story 5 ⚠️

- [ ] T115 [P] [US5] Prueba de integración `tests/integration/bazaar-review.test.ts`: solo la recolectora cambia estados; `reject`/`suspend` sin motivo fallan; transición no permitida (p. ej. `draft` → `approved`) falla; la recolectora puede crear enlaces firmados de `bazaar-documents` y de `bazaar-photo-submissions` y un bazar o clienta no (salvo el bazar con sus propias fotos); `apply_bazaar_proposal` solo la ejecuta la recolectora, reemplaza `name`/`brands`/`link_url`/`bazaar_photos` y devuelve las rutas reemplazadas; rechazar una propuesta sin motivo falla; suspender un bazar descarta su propuesta abierta
- [ ] T116 [P] [US5] Prueba E2E (flujo crítico "aprobación") `tests/e2e/bazaar-approval.spec.ts`: recolectora abre bazar pendiente → ve documentos, referencias y fotos propuestas → aprueba → aparece en `/` con sus fotos → suspende con motivo → desaparece y el bazar ve el motivo
- [ ] T117 [P] [US5] Prueba E2E `tests/e2e/bazaar-profile-change.spec.ts`: bazar aprobado cambia una foto y su nombre → el directorio (`/`) sigue mostrando la versión anterior y la URL directa de la foto nueva no es pública → la recolectora ve la comparación y rechaza con motivo → el bazar ve el motivo → propone de nuevo → la recolectora autoriza → el directorio muestra la nueva versión y la foto anterior ya no existe en el bucket público

### Implementation for User Story 5

- [ ] T118 [P] [US5] Prueba E2E `tests/e2e/bazaar-document-update.spec.ts`: bazar aprobado sube un nuevo comprobante de domicilio → ve "En revisión" → la recolectora compara vigente y nuevo y rechaza con motivo → el bazar ve el motivo y el vigente no cambia → sube otro → la recolectora autoriza → queda un solo documento vigente y el archivo anterior ya no existe en Storage
- [ ] T119 [US5] Crear `supabase/migrations/20261004001250_bazaar_reviews.sql`: funciones `approve_bazaar_document(document_id uuid)` y `reject_bazaar_document(document_id uuid, reason text)` según data-model.md (solo `is_collector()`, en transacción, devuelven la ruta de Storage a borrar; `reject` conserva solo la última fila `rejected` por tipo), y función `apply_bazaar_proposal(proposal_id uuid, public_paths text[])` (`SECURITY DEFINER`, ejecuta solo si `is_collector()`, propuesta en `pending`, `public_paths` de 0 a 3 con prefijo `{bazaar_id}/`) que en una transacción copia `name`, `brands` y `link_url` a `bazaars`, reemplaza las filas de `bazaar_photos` en el orden recibido, marca la propuesta `approved` con `reviewed_at`/`reviewed_by` y devuelve las rutas públicas reemplazadas; regenerar tipos con `pnpm db:types`
- [ ] T120 [US5] Implementar en `src/features/bazaars/actions.ts`: `reviewBazaarProposal(proposalId, decision, reason?)` (al aprobar: (1) copia cada foto con `storage.from('bazaar-photo-submissions').copy(path, path, { destinationBucket: 'bazaar-photos' })` usando la sesión de la recolectora, (2) llama `apply_bazaar_proposal`, (3) borra las fotos públicas reemplazadas y las copias privadas publicadas; si falla (1) no cambia nada; al rechazar exige motivo), `reviewBazaar(bazaarId, decision, reason?)` con `approve`/`reject`/`suspend`/`reactivate` (`approve` publica la propuesta pendiente con el mismo procedimiento) (`approve` también pasa los documentos `pending` a `current` y borra los archivos reemplazados), `reviewBazaarDocument(documentId, decision, reason?)` (llama `approve_bazaar_document` o `reject_bazaar_document` y borra de `bazaar-documents` la ruta devuelta; FR-033) y `getBazaarDocumentUrls(bazaarId)` (enlaces firmados de 10 min con `expiresAt` del documento vigente y del que está en revisión de cada tipo)
- [ ] T121 [US5] Agregar a `src/features/bazaars/queries.ts`: `listBazaars({ status, q })` (busca por nombre publicado o propuesto), `listPendingProposals()` y `listPendingDocuments()` (solo de bazares aprobados) y `getBazaarForReview(id)` (versión publicada, propuesta abierta, documentos y referencias)
- [ ] T122 [P] [US5] Crear `src/features/bazaars/components/bazaar-review-panel.tsx` (datos propuestos, fotos propuestas con enlaces firmados, documentos con botón "Ver" que pide el enlace temporal al momento, referencias con enlace `tel:`, botones de decisión con diálogo de motivo) y `src/features/bazaars/components/proposal-comparison.tsx` (versión publicada y propuesta lado a lado en escritorio y una sobre otra en celular, resaltando los campos y fotos que cambian; botones Autorizar y Rechazar con motivo) y `src/features/bazaars/components/document-comparison.tsx` (por tipo de documento: vigente y nuevo con botón "Ver" que pide el enlace temporal al momento; botones Autorizar y Rechazar con motivo)
- [ ] T123 [US5] Crear `src/app/admin/bazares/page.tsx` (pestañas por estado más "Cambios por autorizar", "Pendientes de revisión" primero, búsqueda por nombre o marca) y `src/app/admin/bazares/[id]/page.tsx` con `BazaarReviewPanel` para bazares en revisión y `ProposalComparison` cuando un bazar aprobado tiene una propuesta `pending` y `DocumentComparison` cuando tiene documentos en revisión; la pestaña "Cambios por autorizar" lista propuestas y documentos

**Checkpoint**: registro, aprobación y moderación de cambios de bazares completos.

---

## Phase 8: User Story 6 - Directorio público de bazares (Priority: P3)

**Goal**: visitantes sin cuenta ven bazares aprobados (versión autorizada) y buscan por nombre o
marca.

**Independent Test**: sin sesión, abrir `/`, buscar una marca sin acentos y ver solo bazares
aprobados con nombre, marcas, sus fotos autorizadas (o un recuadro sin imágenes) y botón a su
página.

### Tests for User Story 6 ⚠️

- [ ] T124 [P] [US6] Prueba de integración `tests/integration/directory.test.ts`: `search_directory` como `anon` devuelve solo `approved` y solo las columnas públicas; un bazar sin fotos devuelve `photo_paths` vacío; una propuesta `pending` no cambia lo que devuelve; búsqueda sin acentos ni mayúsculas (`"zara"` encuentra `"ZÁRA"`); búsqueda por marca; `anon` no puede hacer `select` directo en `bazaars`
- [ ] T125 [P] [US6] Prueba E2E `tests/e2e/directory.spec.ts`: sin sesión, buscar por marca, abrir el enlace del bazar en pestaña nueva, el bazar sin fotos se ve como recuadro sin imágenes, búsqueda sin resultados muestra el mensaje vacío

### Implementation for User Story 6

- [ ] T126 [US6] Implementar `src/features/directory/queries.ts`: `searchDirectory(q)` que llama `search_directory` y convierte `photo_paths` (0–3) en URLs públicas de `bazaar-photos`
- [ ] T127 [P] [US6] Crear `src/features/directory/components/directory-search.tsx` (actualiza `?q=` con retardo de 300 ms)
- [ ] T128 [US6] Crear `src/app/(public)/page.tsx` con buscador, lista de `BazaarCard` (`src/components/bazaar-card.tsx`), estado vacío "No encontramos bazares con esa búsqueda" y accesos a "Soy clienta" y "Registrar mi bazar"; configurar `images.remotePatterns` para Supabase Storage en `next.config.ts`

**Checkpoint**: directorio público operativo.

---

## Phase 9: User Story 7 - Panel de administración (Priority: P3)

**Goal**: la recolectora ve todo y lo filtra por clienta, bazar o estado, con contadores de
pendientes, y configura anticipo, instrucciones de pago y plantillas.

**Independent Test**: con `seed.sql`, ver contadores correctos en `/admin`, filtrar pedidos por
estado, por código de clienta y por bazar; una clienta que intenta abrir `/admin` es redirigida.

### Tests for User Story 7 ⚠️

- [ ] T129 [P] [US7] Prueba de integración `tests/integration/settings.test.ts`: solo la recolectora actualiza `settings`; una clienta obtiene monto e instrucciones con `get_payment_info()` pero no puede leer la tabla `settings` ni las plantillas; un bazar no puede llamar `get_payment_info()` ni leer `settings`; `initial_deposit_cents` ≤ 0 falla
- [ ] T130 [P] [US7] Prueba E2E `tests/e2e/admin-panel.spec.ts`: contadores (incluido "cambios de ficha por autorizar"), filtros de pedidos (estado, clienta por código, bazar), plantilla con variable desconocida es rechazada al guardar, y redirección de clienta y bazar fuera de `/admin`

### Implementation for User Story 7

- [ ] T131 [P] [US7] Crear `src/features/settings/schemas.ts` (`initialDepositCents` > 0; plantillas validadas con `validateTemplate` y las variables de data-model.md) y `src/features/settings/queries.ts` (`getSettings()` para la recolectora y `getPaymentInfo()` que llama `get_payment_info()` para clientas)
- [ ] T132 [US7] Implementar `src/features/settings/actions.ts` con `updateSettings` y crear `src/app/admin/configuracion/page.tsx` (monto en pesos, instrucciones de pago, 5 plantillas con lista de variables y vista previa con datos de ejemplo)
- [ ] T133 [US7] Implementar `src/features/admin/queries.ts` con `getDashboardCounts()` (bazares por revisar, cambios de ficha por autorizar, documentos por autorizar, pagos por confirmar, paquetes sin asignar, pedidos completos por enviar) y crear `src/app/admin/page.tsx` con tarjetas que enlazan a cada lista y botón principal "Registrar paquete"
- [ ] T134 [P] [US7] Crear `src/components/list-filters.tsx` (búsqueda y filtros sincronizados con la URL, pensados para celular)
- [ ] T135 [US7] Crear `src/app/admin/pedidos/page.tsx` con `listOrders` filtrando por estado, clienta (nombre o código) y bazar
- [ ] T136 [US7] Crear `src/app/admin/clientas/page.tsx` (búsqueda por nombre, código o WhatsApp; filtros con/sin cuenta y estado) y `src/app/admin/clientas/[code]/page.tsx` (datos editables con `updateCustomer` excepto el código, pedidos y paquetes de la clienta)

**Checkpoint**: todas las historias de usuario funcionan de forma independiente.

---

## Phase 10: Eliminación y baja de cuentas (FR-046 a FR-050)

**Purpose**: requisito transversal de privacidad (clarificación 2026-10-04): autoservicio de
eliminación, eliminación por la recolectora y baja temporal. Depende de US1, US4, US5 y US7.

- [ ] T137 Crear `supabase/migrations/20261004001300_account_deletion.sql`: funciones `anonymize_customer(customer_id uuid)` y `anonymize_bazaar(bazaar_id uuid)` (`SECURITY DEFINER`, ejecutables solo por el dueño o `is_collector()`) que en una transacción cancelan pedidos en curso con motivo "datos eliminados" (solo cuando la llama la recolectora), anonimizan según FR-048 y data-model.md (`full_name = 'Clienta eliminada'`, `whatsapp`, `shipping_address` y `profile_id` en nulo, `status = 'deleted'`; en bazar se borran `brands`, `link_url`, fotos, propuestas, documentos y referencias y se conserva `name`; las rutas devueltas incluyen `bazaar-photos`, `bazaar-photo-submissions` y `bazaar-documents`) y devuelven la lista de rutas de Storage a borrar; para la clienta, rechazan con `ACTIVE_ORDERS` si ella misma la llama y tiene pedidos que no estén `delivered` ni `cancelled`; regenerar tipos
- [ ] T138 Crear `src/lib/supabase/admin.ts` (`import 'server-only'`; cliente con `SUPABASE_SERVICE_ROLE_KEY`; exporta solo `deleteStorageObjects(bucket, paths)` y `deleteAuthUser(userId)`)
- [ ] T139 Implementar `src/features/account-deletion/actions.ts`: `deleteMyAccount` (confirmación `"ELIMINAR"`), `deleteCustomerData` y `deleteBazaarData` (solo recolectora), siguiendo el orden de research.md R16: (1) `anonymize_*` con la sesión del usuario, (2) `deleteStorageObjects`, (3) `deleteAuthUser`; reintento seguro si fallan (2) o (3)
- [ ] T140 Implementar `setCustomerActive(customerId, active, reason?)` en `src/features/customers/actions.ts` (solo recolectora)
- [ ] T141 [P] Crear `src/features/account-deletion/components/delete-account-dialog.tsx` (explica qué se borra y qué se conserva sin datos personales; exige escribir "ELIMINAR") y agregar la sección "Eliminar mi cuenta" a `src/app/mi-cuenta/page.tsx` y `src/app/bazar/page.tsx`
- [ ] T142 Agregar a `src/app/admin/clientas/[code]/page.tsx` los botones "Dar de baja temporal"/"Reactivar" y "Eliminar datos personales", y a `src/app/admin/bazares/[id]/page.tsx` el botón "Eliminar datos personales"
- [ ] T143 [P] Prueba de integración `tests/integration/account-deletion.test.ts`: la clienta con pedidos en curso recibe `ACTIVE_ORDERS`; la recolectora elimina una clienta con pedidos en curso (se cancelan, quedan anónimos, archivos borrados, usuario de Auth borrado, `code` conservado); eliminar un bazar borra sus archivos y lo saca del directorio; una clienta `deactivated` no puede crear pedidos ni subir comprobantes; nadie puede llamar `anonymize_*` sobre datos ajenos
- [ ] T144 [P] Prueba E2E `tests/e2e/account-deletion.spec.ts`: clienta sin pedidos elimina su cuenta y ya no puede iniciar sesión; recolectora da de baja temporal a una clienta, que ve el aviso, y la reactiva

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: documentación de traspaso, revisión móvil, seguridad y validación final.

- [ ] T145 [P] Escribir `README.md`: requisitos, instalación local (según quickstart.md), variables de entorno, scripts, pruebas, despliegue en Vercel y Supabase (dev y prod, `supabase link`, `db push`, `promote_to_collector`, URLs de Auth), cuentas de servicios (Vercel, Supabase, Sentry, GitHub), flujo de trabajo con pull requests y la protección de la rama `main` (cómo verificarla y restaurarla), por qué el repositorio es público y qué nunca debe subirse (secretos, datos reales), y el procedimiento de traspaso de cuentas de T156 y sus planes y costos (Vercel Hobby vs Pro para uso comercial; pausa de proyectos inactivos en el plan gratuito de Supabase)
- [ ] T146 [P] Escribir `docs/arquitectura.md`: diagrama de componentes, estructura de carpetas, patrón Server Action + Zod + RLS, máquinas de estado, buckets y enlaces firmados, módulo de notificaciones y cómo cambiar a WhatsApp Cloud en la fase 2, dónde se usa la service role key y por qué
- [ ] T147 [P] Escribir `docs/manual-recolectora.md` en español sencillo y con capturas de celular: instalar la app, revisar pagos, registrar paquetes, paquetes sin identificar, cerrar y enviar pedidos, dar de alta clientas sin cuenta, revisar bazares, autorizar o rechazar cambios de ficha de bazares, editar plantillas, dar de baja y eliminar datos
- [ ] T148 [P] Crear `supabase/scripts/find-orphan-files.sql` (archivos en Storage sin referencia en tablas) y documentar su uso manual en `docs/arquitectura.md`
- [ ] T149 Revisar todas las pantallas a 360 px y en escritorio: objetivos táctiles ≥ 44 px, formularios con teclado adecuado (`inputMode="numeric"` en teléfonos, mayúsculas en código), estados de carga y vacíos, textos en español de México; corregir en `src/app/**` y `src/features/**/components/**`
- [ ] T150 Revisar el texto final del aviso de privacidad en `src/app/(public)/aviso-de-privacidad/page.tsx` con los datos reales de la responsable (pendiente de la clienta) y verificar que cubre FR-005 y FR-050
- [ ] T151 [P] Generar los íconos definitivos de la PWA en `public/icons/` (192, 512 y maskable) y verificar la instalación en Android y iOS
- [ ] T152 Revisión de seguridad: confirmar RLS activado en todas las tablas (`select relname from pg_class where relrowsecurity = false` en el esquema `public` no devuelve tablas), que `SUPABASE_SERVICE_ROLE_KEY` solo se importa en `src/lib/supabase/admin.ts` y `tests/`, y que Sentry no envía datos personales
- [ ] T153 [P] Crear `supabase/scripts/seed-volume.sql` (uso manual en local) que genera ~1,000 clientas, ~3,000 pedidos con pagos, ~6,000 paquetes y ~200 bazares aprobados, y documentarlo en `README.md`
- [ ] T154 Con `seed-volume.sql` cargado, medir y anotar en `docs/arquitectura.md`: registro de un paquete desde un celular real en menos de 1 minuto con cronómetro (SC-001), Lighthouse en móvil de `/`, `/mi-cuenta` y `/admin/paquetes/nuevo` (carga interactiva en menos de 3 s con 4G simulado), y búsqueda del directorio y listas del panel sin demora perceptible (SC-006, SC-007); corregir índices o consultas si no se cumple
- [ ] T155 Ejecutar la validación completa de `quickstart.md` (pruebas automáticas y escenarios manuales 1–7) y corregir lo que falle
- [ ] T156 Traspasar a la clienta al entregar: transferir el repositorio de GitHub a su cuenta (la protección de `main` se conserva; verificarla), el proyecto de Vercel a su equipo, los dos proyectos de Supabase a su organización y la organización de Sentry; después rotar la `SUPABASE_SERVICE_ROLE_KEY`, el `SENTRY_AUTH_TOKEN` y cualquier otro secreto, actualizar las variables en Vercel y en GitHub Actions, quitar el acceso del desarrollador si así se acuerda, y registrar en `README.md` los dueños finales de cada cuenta y el plan contratado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; BLOQUEA todas las historias. T013–T025 en orden
  (migraciones secuenciales); T026–T048 pueden avanzar en paralelo después de T025.
- **Historias (Phases 3–9)**: dependen de Foundational. Orden recomendado por prioridad:
  US1 → US2 → US3 → US4 → US5 → US6 → US7.
- **Eliminación y baja (Phase 10)**: depende de US1, US4, US5 y US7 (agrega botones a sus pantallas).
- **Polish (Phase 11)**: depende de las fases que se vayan a entregar.

### User Story Dependencies

- **US1 (P1)**: solo Foundational.
- **US2 (P1)**: solo Foundational (usa clientas y pedidos de `seed.sql` para probarse sola); T091 y
  T092 extienden páginas creadas en US1 (T071, T076).
- **US3 (P2)**: Foundational; T101 y T102 extienden páginas de US1. Para probarse sola usa pedidos
  en `receiving` de los fixtures.
- **US4 (P2)**: solo Foundational.
- **US5 (P2)**: Foundational; se prueba con bazares `pending_review` de `seed.sql`. La verificación
  "aparece en el directorio" de T116 y T117 usa `/`, creado en US6; si US6 no está, validar con
  `search_directory` directamente. Las propuestas de cambio se prueban con el bazar aprobado que
  tiene una propuesta `pending` en `seed.sql`.
- **US6 (P3)**: solo Foundational (bazares aprobados de `seed.sql`).
- **US7 (P3)**: Foundational; sus listas enlazan a detalles de US1–US5.

### Within Each User Story

- Pruebas primero y fallando → esquemas → acciones y consultas → componentes → páginas.
- Las tareas sobre el mismo archivo (p. ej. `src/app/admin/pedidos/[folio]/page.tsx`) no son [P]
  entre sí.

### Parallel Opportunities

- Setup: T004–T012 en paralelo después de T001–T003.
- Foundational: T026, T028–T035, T037–T039, T041–T046 en paralelo tras T025.
- Cada historia: todas sus pruebas [P] juntas; esquemas [P] juntos; componentes [P] juntos.
- Con más de una persona: US1/US2 (operación) y US4/US5/US6 (bazares) pueden avanzar en paralelo.

---

## Parallel Example: User Story 1

```bash
# Pruebas de US1 en paralelo:
Task: "T049 Prueba unitaria tests/unit/customer-order-schemas.test.ts"
Task: "T050 Prueba de integración tests/integration/rls-customers-orders.test.ts"
Task: "T051 Prueba de integración tests/integration/payments-flow.test.ts"
Task: "T052 Prueba de integración tests/integration/customer-claim.test.ts"
Task: "T053 Prueba E2E tests/e2e/create-order.spec.ts"

# Esquemas de US1 en paralelo:
Task: "T055 src/features/customers/schemas.ts"
Task: "T056 src/features/orders/schemas.ts"
Task: "T057 src/features/payments/schemas.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T077 tests/unit/package-schemas.test.ts"
Task: "T078 tests/integration/rls-packages.test.ts"
Task: "T079 tests/integration/find-customer.test.ts"
Task: "T080 tests/e2e/register-package.spec.ts"
# Después de T083:
Task: "T086 src/features/packages/components/customer-search.tsx"
Task: "T087 src/features/packages/components/package-form.tsx"
Task: "T090 src/features/packages/components/package-gallery.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational (esquema completo con RLS y pruebas base).
3. Phase 3: US1.
4. **STOP and VALIDATE**: `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` y escenarios
   1–2 de quickstart.md.
5. Desplegar a Supabase dev + Vercel preview y mostrar a la clienta.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → MVP (clientas, pedidos y anticipos).
3. US2 → recepción de paquetes (la operación diaria; primer uso real recomendado aquí).
4. US3 → ciclo completo hasta entregado.
5. US4 + US5 → registro y aprobación de bazares.
6. US6 → directorio público.
7. US7 → panel y configuración.
8. Phase 10 → eliminación y baja de cuentas (obligatoria antes de producción, por privacidad).
9. Phase 11 → documentación de traspaso, validación final y transferencia de cuentas a la clienta (T156).

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- Cada historia cierra con su checkpoint; no avanzar con pruebas en rojo (CI bloquea).
- Hacer commit al terminar cada tarea o grupo lógico.
- Los cuatro supuestos pendientes de confirmar con la clienta (spec.md, Assumptions) no bloquean
  ninguna tarea; si cambian, actualizar spec.md antes de implementar la parte afectada.
