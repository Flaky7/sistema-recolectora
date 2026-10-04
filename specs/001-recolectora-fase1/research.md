# Research: Sistema Recolectora – Fase 1

El stack quedó definido por el usuario; no hay incógnitas abiertas en el contexto técnico. Este
documento registra las decisiones de diseño derivadas del stack, la especificación y la
constitución.

## R1. Modelo de roles y dónde se guarda el rol

- **Decision**: tabla `profiles` (1:1 con `auth.users`) con columna `role` de tipo enum
  `user_role` (`collector`, `customer`, `bazaar`). Las políticas RLS consultan el rol mediante
  funciones `SECURITY DEFINER` (`is_collector()`, `current_customer_id()`, `current_bazaar_id()`).
- **Rationale**: `user_metadata` de Supabase Auth lo puede modificar el propio usuario, así que no
  sirve como fuente de verdad para autorización. Guardar el rol en una tabla protegida por RLS
  cumple el principio III (reglas en la base de datos).
- **Alternatives considered**: custom claims en el JWT mediante un Auth Hook (más rápido, pero añade
  configuración y es más difícil de entender para quien herede el proyecto); rol en
  `app_metadata` (requiere la service key para cambiarlo, menos visible).

## R2. Alta de usuarios y asignación del rol

- **Decision**: el registro llama a `supabase.auth.signUp` con `data: { role, ...perfil }`. Un
  trigger `handle_new_user` en `auth.users` crea `profiles` y, según el rol, la fila de `customers`
  o `bazaars`. El trigger solo acepta `customer` o `bazaar`; cualquier otro valor se rechaza. La
  recolectora se asigna con una función SQL ejecutada manualmente (`promote_to_collector(email)`)
  documentada en el README; en desarrollo, la crea `supabase/seed.sql`.
- **Clientas sin cuenta (clarificación 2026-10-04)**: `customers.profile_id` es nulo para clientas
  que da de alta la recolectora. Al registrarse alguien con ese WhatsApp, `handle_new_user` liga la
  fila existente solo si el código coincide (FR-044); la RPC `check_customer_claim` permite que el
  formulario pida el código antes de enviar, sin revelar datos. Se eligió el par WhatsApp + código
  en lugar de una aprobación manual para no cargar trabajo extra a la recolectora; el riesgo
  (alguien que conozca ambos datos) es bajo y la recolectora puede desligar una cuenta desde el
  panel. **Riesgo aceptado (análisis 2026-10-04)**: `check_customer_claim` revela a cualquier
  visitante que un WhatsApp ya está dado de alta como clienta sin cuenta (no revela otros datos);
  se prefirió un registro claro sobre ocultar ese hecho. Registrado como excepción del principio
  III en la constitución 1.1.0. En 1.2.0 la excepción se amplió a WhatsApp de clientas **con**
  cuenta: `check_customer_claim` devuelve `has_account` y el registro avisa que ya existe una cuenta
  con ese número.
- **Rationale**: nadie puede auto-asignarse el rol de recolectora (FR-003).
- **Alternatives considered**: crear perfiles desde la Server Action con la service role key
  (más código privilegiado en la app y riesgo de inconsistencias si falla a la mitad).

## R3. Confirmación de correo y registro de bazar en dos pasos

- **Decision**: la confirmación de correo queda activada. El bazar crea su cuenta, confirma su
  correo, inicia sesión y completa su ficha (datos públicos, fotos, documentos y referencias). Se
  agrega un estado interno `draft` ("registro incompleto") previo a `pending_review`. Un bazar en
  `draft` no es visible en ningún lado y no cuenta como pendiente para la recolectora.
- **Rationale**: los archivos privados se suben a Storage con la sesión del usuario (para que RLS
  de Storage aplique), y sin correo confirmado no hay sesión. Además evita cuentas falsas.
- **Alternatives considered**: desactivar la confirmación de correo (registro en un solo paso, pero
  más cuentas basura); subir archivos con la service key desde el servidor (evita RLS de Storage).
- **Impacto en la spec**: los cuatro estados visibles de la spec se mantienen; `draft` es un estado
  técnico anterior al envío.

## R4. Código único de clienta

- **Decision**: 5 caracteres del alfabeto sin caracteres ambiguos
  `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (sin 0/O/1/I), generado en la base de datos por
  `generate_customer_code()` con reintento ante colisión y restricción `UNIQUE`. Se muestra como
  `K7M4P`. La búsqueda convierte a mayúsculas y quita espacios y guiones; si el texto contiene
  caracteres fuera del alfabeto, avisa que el código no es válido.
- **Rationale**: ~33 millones de combinaciones para ~1,000 clientas; fácil de escribir a mano en una
  etiqueta y de dictar (FR-007).
- **Alternatives considered**: consecutivo numérico (predecible y se confunde con otros números de
  la etiqueta); UUID corto (difícil de escribir).

## R5. Máquina de estados de pedidos en la base de datos

- **Decision**: enum `order_status` (`registered`, `payment_pending`, `payment_confirmed`,
  `receiving`, `complete`, `shipped`, `delivered`, `cancelled`). Un trigger `BEFORE UPDATE` valida
  la transición contra una tabla de transiciones permitidas y quién puede hacerla (clienta o
  recolectora), y otro trigger `AFTER UPDATE` escribe en `order_status_history`. La misma tabla de
  transiciones existe en TypeScript (`src/features/orders/status.ts`) para la interfaz y se prueba
  con Vitest que ambas coinciden.
- **Rationale**: FR-012 y principio III — un error en la interfaz no puede saltar estados.
- **Alternatives considered**: validar solo en Server Actions (no cumple III); funciones RPC por
  cada transición (más SQL que mantener).

## R6. Búsqueda del directorio sin distinguir acentos

- **Decision**: extensiones `pg_trgm` y `unaccent`. Columna `search_text` en `bazaars` mantenida
  por trigger con `lower(unaccent(name || ' ' || array_to_string(brands, ' ')))` e índice GIN
  `gin_trgm_ops`. La función `search_directory(q text)` (`SECURITY DEFINER`, solo lectura) filtra
  `status = 'approved'`, busca con `ILIKE '%' || q || '%'` sobre el texto normalizado y ordena por
  `similarity`. Devuelve solo columnas públicas.
- **Rationale**: `unaccent` no es `IMMUTABLE`, así que no puede usarse en una columna generada; el
  trigger es la solución más simple. La función evita exponer columnas no públicas del bazar
  (FR-037) a usuarios anónimos.
- **Alternatives considered**: full-text search de PostgreSQL (no encuentra subcadenas como
  "zar" en "Zara" de forma natural); búsqueda en el cliente (no escala ni respeta privacidad).

## R7. Archivos: buckets, rutas y enlaces temporales

- **Decision**: cinco buckets (el quinto, `bazaar-photo-submissions`, se agregó con R17).
  - `bazaar-photos` (público): `{bazaar_id}/{uuid}.jpg`; solo fotos autorizadas (R17).
  - `bazaar-documents` (privado): `{bazaar_id}/{doc_type}-{uuid}.{ext}`. El bazar puede subir
    (`INSERT`) en su carpeta; solo la recolectora puede leer.
  - `payment-proofs` (privado): `{customer_id}/{uuid}.{ext}`. La clienta puede subir en su carpeta;
    solo la recolectora puede leer.
  - `package-photos` (privado): `{customer_id}/{uuid}.jpg`. Solo la recolectora sube; la clienta
    puede leer si existe un paquete suyo con esa ruta.
  Los enlaces firmados se generan en el servidor con la sesión del usuario (no con la service key),
  así Storage RLS decide. Expiración: 10 min para documentos y comprobantes, 60 min para fotos de
  paquetes.
- **Rationale**: principio II y FR-019/FR-026. Subir directo del navegador a Storage evita el
  límite de tamaño de las Server Actions y no pasa archivos por Vercel.
- **Alternatives considered**: un solo bucket privado con carpetas (políticas más difíciles de
  leer); proxy de archivos por una ruta de Next.js (más código y costo de ancho de banda).

## R8. Subida de imágenes desde el celular

- **Decision**: `<input type="file" accept="image/*" capture="environment">` para abrir la cámara;
  `browser-image-compression` con `maxSizeMB: 0.2`, `maxWidthOrHeight: 1600`, salida JPEG. PDF
  permitido solo para comprobantes (máx. 5 MB, sin compresión). Validación de tipo y tamaño con
  Zod antes de subir y límites también en la configuración de cada bucket.
- **Rationale**: principio IV; fotos ligeras para datos móviles y plan básico de Storage.
- **Alternatives considered**: `getUserMedia` con vista de cámara propia (más código, peor
  compatibilidad en iOS).

## R9. Flujo de escritura: Server Actions + archivos

- **Decision**: (1) el cliente comprime y sube el archivo a Storage con su sesión; (2) llama a la
  Server Action con el `path` y los datos del formulario; (3) la acción valida con el mismo esquema
  Zod, verifica que el `path` pertenezca a la carpeta esperada y escribe en la base de datos con el
  cliente de Supabase del usuario (RLS aplica). Todas las acciones devuelven
  `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: ... }`.
  La service role key se usa en scripts y pruebas y, dentro de la app, solo en
  `src/lib/supabase/admin.ts` para eliminar cuentas (ver R16).
- **Rationale**: un único patrón, simple de seguir; la base de datos sigue siendo la autoridad.
- **Alternatives considered**: Route Handlers REST (duplica lo que dan las Server Actions).
- **Archivos huérfanos**: si la acción falla después de subir, el archivo queda sin referencia. Se
  documenta un script SQL de limpieza manual; no se agregan tareas programadas en la fase 1.

## R10. WhatsApp desacoplado

- **Decision**: módulo `src/lib/notifications/`:
  - `messages.ts`: funciones puras que construyen el texto a partir de plantillas de `settings`
    (`buildPackageReceivedMessage`, `buildOrderShippedMessage`).
  - `channel.ts`: interfaz `NotificationChannel` con `deliver(notification)` que devuelve
    `{ kind: 'open_url', url }` o `{ kind: 'sent' }`.
  - `whatsapp-link.ts`: implementación de fase 1 que construye
    `https://wa.me/52{10 dígitos}?text={encodeURIComponent(texto)}`.
  Cada mensaje se guarda en `notifications` con `channel = 'whatsapp_link'`. La Server Action
  devuelve la URL y el cliente hace `window.location.href = url`.
- **Rationale**: principio VIII; para la fase 2 se agrega `whatsapp-cloud.ts` y se cambia la
  implementación elegida, sin tocar pedidos, paquetes ni envíos.
- **Alternatives considered**: construir el enlace directamente en los componentes (acopla la UI).

## R11. Sesión y protección de rutas

- **Decision**: `@supabase/ssr` con un `middleware.ts` que refresca la sesión y redirige por rol:
  `/admin/**` solo `collector`, `/mi-cuenta/**` solo `customer`, `/bazar/**` solo `bazaar`. La
  protección en el middleware es comodidad de navegación; la seguridad real está en RLS.
- **Alternatives considered**: comprobaciones solo en cada página (fácil de olvidar).

## R12. Pruebas

- **Decision**:
  - **Vitest (unit)**: esquemas Zod, máquina de estados, generación de mensajes y enlaces
    `wa.me`, normalización de teléfono y código, formato de moneda y fecha.
  - **Vitest (integración RLS)**: contra Supabase local (`supabase start`), con usuarios de prueba
    de cada rol, verifica qué puede leer y escribir cada uno en tablas y buckets (SC-005).
  - **Playwright (E2E)**, en viewport de celular (Pixel 7) con un proyecto adicional de escritorio:
    los cinco flujos críticos de la constitución — registro de bazar, aprobación, creación de
    pedido, registro de paquete recibido y envío.
  - **GitHub Actions**: `lint` → `typecheck` → `test:unit` → `supabase start` + `db reset` →
    `test:integration` → `build` → `test:e2e`.
- **Rationale**: principio V.
- **Alternatives considered**: pgTAP para RLS (otro lenguaje de pruebas que mantener).

## R13. Dinero, fechas y textos

- **Decision**: montos en centavos (`integer`) y formato con
  `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`. Fechas `timestamptz` y
  formato con `Intl.DateTimeFormat('es-MX', { timeZone: 'America/Tijuana' })` en `dd/mm/aaaa`.
  Textos de interfaz directamente en español en los componentes, y mensajes de error de Zod en
  español en un único `src/lib/validation/messages.ts`; no se usa librería de i18n.
- **Rationale**: un solo idioma; i18n sería una dependencia sin razón (principio I).

## R14. PWA

- **Decision**: `src/app/manifest.ts` (nombre, íconos 192/512 y maskable, `display: standalone`,
  `lang: es-MX`, colores). Sin service worker de caché offline en la fase 1.
- **Rationale**: es suficiente para instalar la app en Android y iOS; la operación requiere
  conexión para subir fotos.
- **Alternatives considered**: `next-pwa`/Serwist (dependencia extra y caché que complica las
  actualizaciones).

## R16. Eliminación de datos y baja temporal (clarificación 2026-10-04)

- **Decision**: eliminar = anonimizar filas de negocio (pedidos, pagos, paquetes y envíos se
  conservan) + borrar archivos con la API de Storage + borrar el usuario de Auth con
  `auth.admin.deleteUser`. Estas dos últimas operaciones requieren la service role key, que vive
  solo en `src/lib/supabase/admin.ts` (marcado `server-only`), usado únicamente por las tres
  acciones de eliminación tras verificar permisos con la sesión normal. Orden: (1) SQL
  `anonymize_*` en transacción, (2) borrar archivos, (3) borrar usuario. Si falla (2) o (3), la
  acción se puede reintentar sin efectos duplicados. La baja temporal es solo un estado
  (`customers.status = 'deactivated'`, `bazaars.status = 'suspended'`) que RLS usa para bloquear
  escrituras; la persona puede iniciar sesión y ve un aviso.
- **Rationale**: Supabase no permite borrar objetos de Storage con SQL directo, y borrar usuarios
  de Auth requiere la API de administración. Conservar el historial anónimo protege la operación
  de la recolectora.
- **Alternatives considered**: Edge Function con la service key (otro lugar de despliegue que
  mantener); bloquear el inicio de sesión con `ban_duration` (requiere la API de administración
  para algo que RLS ya resuelve).

## R17. Moderación de la ficha pública del bazar (cambio solicitado 2026-10-04)

- **Decision**: tabla `bazaar_profile_proposals` (una propuesta abierta por bazar) que el bazar
  edita; las columnas públicas de `bazaars` y la tabla `bazaar_photos` guardan solo la versión
  autorizada y solo la recolectora las escribe, mediante `apply_bazaar_proposal`. Las fotos del
  bazar se suben a un bucket **privado** (`bazaar-photo-submissions`) y la recolectora las copia
  al bucket público al autorizar (`copy` con `destinationBucket`). El mismo mecanismo sirve para
  el registro inicial (la propuesta se aprueba junto con el bazar) y para cambios posteriores. Las
  fotos son opcionales (0–3); la tarjeta del directorio muestra un recuadro sin imágenes.
- **Rationale**: FR-029/FR-030: una foto inapropiada nunca llega a una URL pública, ni siquiera
  "no adivinable". Un solo flujo para registro y cambios evita dos lógicas distintas.
- **Alternatives considered**: columnas `pending_*` en `bazaars` (mezcla versión publicada y
  propuesta en la misma fila y complica RLS); bucket público con rutas no adivinables (no cumple
  FR-030); servir todas las fotos del directorio con enlaces firmados (se pierde la caché de CDN
  de un bucket público y crece el costo).
- **Impacto en R7**: `bazaar-photos` ya no recibe subidas del bazar; ver
  [contracts/storage.md](./contracts/storage.md).

## R18. Documentos de bazar con versión vigente y versión en revisión (cambio solicitado 2026-10-04)

- **Decision**: `bazaar_documents` guarda filas con `status` (`pending`, `current`, `rejected`) y
  como máximo una `current` y una `pending` por tipo. El bazar solo crea filas `pending`; la
  recolectora autoriza o rechaza cada una con `approve_bazaar_document` /
  `reject_bazaar_document`, que en una transacción actualizan las filas y devuelven la ruta del
  archivo que la Server Action borra de Storage (el anterior al autorizar; el nuevo al rechazar).
- **Rationale**: la recolectora siempre tiene un documento válido mientras revisa el nuevo, y
  después no se guardan documentos que ya no se usan (minimización de datos personales).
- **Alternatives considered**: reemplazo inmediato (se perdería el documento válido si el nuevo es
  incorrecto); conservar historial de todas las versiones (más datos personales guardados sin
  necesidad); incluir los documentos en `bazaar_profile_proposals` (mezcla datos públicos y
  privados con reglas de acceso distintas).

## R19. Lectura de la configuración (análisis 2026-10-04)

- **Decision**: `settings` solo la lee y escribe la recolectora. Las clientas obtienen el monto del
  anticipo y los datos para pagar con la función `get_payment_info()` (`SECURITY DEFINER`), que
  devuelve solo esas dos columnas; los bazares no tienen acceso.
- **Rationale**: RLS filtra filas, no columnas; una función es la forma más simple de exponer solo
  dos campos de una tabla de una fila.
- **Alternatives considered**: una vista con `security_invoker = false` (equivalente, pero menos
  explícita sobre quién puede llamarla); separar `settings` en dos tablas (más migraciones para un
  dato tan pequeño).

## R20. Repositorio y cuentas de servicios (análisis 2026-10-04)

- **Decision**: repositorio **público** en GitHub, sin licencia abierta, con la rama `main`
  protegida (solo pull requests con la CI en verde), *secret scanning* y *push protection*
  activados. El repositorio y las cuentas de Vercel, Supabase y Sentry se crean a nombre del
  desarrollador y se transfieren a la clienta al entregar (T156), rotando los secretos después.
- **Rationale**: en el plan gratuito de GitHub la protección de ramas solo está disponible para
  repositorios públicos; así se cumple el principio V sin costo (principio VII). El código no
  contiene secretos ni datos de clientas: las llaves viven en variables de entorno y los datos de
  prueba son ficticios.
- **Alternatives considered**: repositorio privado con GitHub Pro (unos 4 USD al mes); privado
  gratuito con despliegue condicionado en Vercel (no impide integrar cambios con pruebas fallidas,
  no cumple el principio V); cuentas a nombre de la clienta desde el inicio (traspaso más simple,
  pero el usuario prefirió crearlas y transferirlas al final).
- **Riesgo aceptado**: cualquiera puede leer el código y conocer cómo funciona el sistema. La
  seguridad no depende de que el código sea secreto, sino de RLS, enlaces firmados y secretos fuera
  del repositorio.

## R21. Ajustes por las versiones instaladas (implementación, 2026-10-04)

Versiones al iniciar: Next.js 16.3, React 19.2, Zod 4, Vitest 5, Sentry 11, Supabase CLI 2.119,
shadcn/ui con estilo `radix-nova`.

- **`proxy.ts` en lugar de `middleware.ts`**: en Next.js 16 el archivo `middleware` está obsoleto y
  se llama `src/proxy.ts` (exporta `proxy`, siempre en Node.js). Las APIs `cookies()`, `params` y
  `searchParams` solo son asíncronas. `next lint` ya no existe: se usa `eslint` directamente.
- **Instrumentación en `src/`**: con carpeta `src/`, Next busca `src/instrumentation.ts` y
  `src/instrumentation-client.ts`; `sentry.server.config.ts`, `sentry.edge.config.ts` y
  `sentry.privacy.ts` quedan en la raíz.
- **Sentry 11 sin datos personales**: `sendDefaultPii` ya no existe y, por defecto, el SDK recopila
  datos de usuario, cookies, encabezados, cuerpos HTTP, parámetros de URL, datos de consultas y
  variables locales. `sentry.privacy.ts` desactiva cada categoría con `dataCollection`
  (principio II).
- **shadcn/ui**: el componente `form` fue reemplazado por `field`. El registro inyectaba el paquete
  externo `cn` en los componentes; se reemplazó por `src/lib/utils.ts` (clsx + tailwind-merge) y
  una regla de ESLint prohíbe importar `cn`. `shadcn` queda como dependencia de desarrollo (solo
  aporta `shadcn/tailwind.css`).
- **Correo local**: el servidor de correos de prueba de Supabase es Mailpit (`[local_smtp]`, puerto
  54324), no Inbucket.
- **Enlaces de correo con `token_hash`**: las plantillas de confirmación y recuperación enlazan a
  `/auth/callback?token_hash=…&type=…`, que verifica con `verifyOtp`; así funcionan aunque la
  clienta abra el correo en otro dispositivo o navegador.

## R22. Límite de intentos al reclamar una clienta sin cuenta (implementación, 2026-10-04)

- **Decision**: `customers.claim_failed_attempts` cuenta los códigos incorrectos que se prueban con
  el WhatsApp de una clienta sin cuenta (en `check_customer_claim`). Después de 10 intentos, ese
  número queda bloqueado (`locked`) y el registro pide ayuda a la recolectora, que puede
  desbloquearlo desde el detalle de la clienta. Un registro exitoso reinicia el contador.
- **Rationale**: el código tiene ~33 millones de combinaciones, pero sin límite alguien que conozca
  el WhatsApp podría probar códigos sin fin; el límite cierra ese riesgo sin cargar trabajo extra a
  la recolectora en el caso normal (FR-044, principio II).
- **Alternatives considered**: captcha (otra dependencia y servicio); límite por IP (Supabase no
  expone la IP en funciones SQL).
- **Nota (Next.js 16)**: T027 se implementó como `src/proxy.ts` y `src/lib/supabase/proxy.ts`
  (ver R21) en lugar de `middleware.ts`.

## R23. Borrado de documentos reemplazados por el bazar (implementación, 2026-10-04)

- **Decision**: para borrar un archivo de Storage se necesita también permiso de lectura sobre él,
  y el bazar nunca debe poder leer sus documentos (FR-026, FR-034). Por eso, cuando el bazar
  reemplaza un documento que estaba en revisión, la acción borra la fila y anota la ruta del
  archivo en `storage_trash`; el archivo se borra con la sesión de la recolectora la siguiente vez
  que revisa ese bazar (documento, registro, suspensión o reactivación). Solo la recolectora borra
  archivos de `bazaar-documents`.
- **Rationale**: conserva la regla de privacidad sin usar la service role key fuera de la
  eliminación de cuentas; el archivo reemplazado solo lo puede ver la recolectora mientras tanto.
- **Alternatives considered**: permitir al bazar leer sus documentos en revisión (rompe FR-034);
  borrar con la service role key (amplía el código privilegiado, contra R16); dejarlos huérfanos
  hasta el script de limpieza (incumple FR-034).

## R24. Transiciones de pedido evaluadas por el trigger (implementación, 2026-10-04)

- **Decision**: `validate_order_update()` consulta `order_status_transitions` mediante
  `order_transition_allowed()` (`SECURITY DEFINER`). El trigger corre con el rol de quien hace el
  cambio y la tabla tiene RLS sin políticas, así que una consulta directa no veía ninguna fila y
  rechazaba todo cambio hecho por la clienta o la recolectora.

## R15. Monitoreo, entornos y costos

- **Decision**: Sentry (`@sentry/nextjs`) plan gratuito, sin envío de datos personales
  (`sendDefaultPii: false`, sin replay). Dos proyectos de Supabase (desarrollo y producción) en
  plan gratuito o Pro según la cuota de Storage; Vercel Hobby/Pro según el uso comercial. Variables
  en `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (solo scripts/pruebas), `NEXT_PUBLIC_SITE_URL`, `SENTRY_DSN`,
  `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`.
- **Nota de costos**: el plan Hobby de Vercel es para uso no comercial; para un negocio puede
  requerirse el plan Pro. El plan gratuito de Supabase pausa proyectos inactivos. Ambos puntos se
  documentan en el README para que la clienta decida.
