# Implementation Plan: Sistema Recolectora – Fase 1

**Branch**: `001-recolectora-fase1` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-recolectora-fase1/spec.md`

## Summary

PWA para que una recolectora organice las compras que sus clientas hacen en bazares de Facebook:
clientas con código único registran pedidos y suben el comprobante del anticipo; la recolectora
confirma pagos, registra cada paquete desde su celular con foto y avisa por WhatsApp, y registra el
envío consolidado. Los bazares se registran con documentos privados y, una vez aprobados, aparecen
en un directorio público con búsqueda.

Enfoque técnico: una sola aplicación Next.js (App Router, Server Actions) sobre Supabase
(PostgreSQL + Auth + Storage). La autorización vive en la base de datos (RLS en todas las tablas y
en Storage, triggers para las máquinas de estado); los archivos privados solo se sirven con enlaces
firmados temporales; WhatsApp se aísla en un módulo de notificaciones que en la fase 1 genera
enlaces `wa.me`. Detalle de decisiones en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x en modo estricto; Node.js 22 LTS; SQL (PostgreSQL 15+)

**Primary Dependencies**: Next.js (App Router, Server Actions), React, `@supabase/supabase-js`,
`@supabase/ssr`, Tailwind CSS, shadcn/ui (Radix), React Hook Form, Zod,
`@hookform/resolvers`, browser-image-compression, `@sentry/nextjs`

**Storage**: Supabase PostgreSQL (extensiones `pg_trgm` y `unaccent`) y Supabase Storage (1 bucket
público, 4 privados)

**Testing**: Vitest (unit + integración RLS contra Supabase local), Playwright (E2E en viewport de
celular), ESLint, Prettier, `tsc --noEmit`; GitHub Actions en cada push y pull request

**Target Platform**: navegadores móviles modernos (Chrome Android, Safari iOS 16+) y de escritorio;
PWA instalable; hosting en Vercel

**Project Type**: aplicación web full-stack (una sola app Next.js) + base de datos administrada

**Performance Goals**: registro de paquete en < 1 min de punta a punta (SC-001); páginas
interactivas en < 3 s en 4G; búsqueda del directorio < 1 s

**Constraints**: fotos ≤ ~200 KB tras compresión; documentos ≤ 5 MB; enlaces firmados de 10–60
min; textos en español de México, zona horaria America/Tijuana, montos en MXN (centavos); planes
básicos de servicios administrados; sin caché distribuido, colas ni microservicios

**Scale/Scope**: ~1,000 usuarios registrados, pocas decenas concurrentes; 3 roles; ~20 pantallas;
16 tablas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. Simplicidad y mantenibilidad | Una sola app Next.js, un patrón de escritura (Server Action + Zod + RLS), sin i18n, sin service worker, sin colas; cada dependencia tiene un uso concreto (tabla de dependencias abajo). TS estricto. Código y tablas en inglés; URLs y textos en español | ✅ |
| II. Privacidad de datos | Eliminación de cuenta por autoservicio o por la recolectora, y baja temporal (R16); 4 buckets privados; fotos de bazares moderadas antes de publicarse (R17); lectura de documentos y comprobantes solo recolectora; enlaces firmados de 10–60 min; directorio vía `search_directory()` que solo devuelve columnas públicas; aviso de privacidad obligatorio en registros; Sentry sin PII | ✅ |
| III. Control de acceso por roles | Rol en `profiles` (no en metadata editable); RLS en todas las tablas y en `storage.objects`; triggers validan transiciones; matriz de acceso en data-model.md probada con integración por rol | ✅ |
| IV. Celular primero | Componentes diseñados a 360 px primero; cámara con `capture="environment"`; E2E corre en viewport de celular; pantalla de paquete optimizada para una mano | ✅ |
| V. Pruebas de flujos críticos | Playwright cubre registro de bazar, aprobación, creación de pedido, paquete recibido y envío; Vitest para reglas y RLS; CI en cada push/PR y rama `main` protegida en un repositorio público de GitHub (la protección es gratuita en repositorios públicos) (solo por pull request con la CI en verde) impiden integrar con pruebas fallidas | ✅ |
| VI. Documentación para traspaso | Entregables: `README.md` (instalación, despliegue, cuentas de servicios, costos), `docs/arquitectura.md`, `docs/manual-recolectora.md`, `.env.example` | ✅ |
| VII. Costo bajo | Vercel + Supabase en planes básicos; compresión de imágenes reduce Storage; sin infraestructura extra | ✅ |
| VIII. Evolución por fases | Sin pagos en línea ni API de WhatsApp; `payments` con `concept`/`method` extensibles; `notifications` + interfaz `NotificationChannel` para cambiar a WhatsApp Cloud | ✅ |

**Dependencias y su razón** (principio I):

| Dependencia | Razón |
|-------------|-------|
| next, react, typescript | Stack base definido |
| @supabase/supabase-js, @supabase/ssr | Cliente de BD/Auth/Storage y sesión en servidor con cookies |
| tailwindcss, shadcn/ui (+ Radix, lucide-react, clsx, tailwind-merge, class-variance-authority, tw-animate-css) | UI accesible y consistente sin escribir componentes base; cva y tw-animate-css los instala shadcn/ui para variantes y animaciones de sus componentes |
| next-themes | La usa el componente `sonner` de shadcn/ui para el tema de los avisos |
| react-hook-form, zod, @hookform/resolvers | Formularios y mismos esquemas en cliente y servidor |
| sonner | Avisos breves después de guardar (componente `sonner` de shadcn/ui) |
| browser-image-compression | Fotos ligeras desde el celular |
| server-only | Hace fallar la compilación si `src/lib/supabase/admin.ts` (service role) se importa desde código del navegador |
| prettier-plugin-tailwindcss | Ordena las clases de Tailwind de forma automática y consistente para quien herede el código (solo desarrollo) |
| @sentry/nextjs | Monitoreo de errores en producción |
| vitest, @playwright/test, eslint, prettier, supabase (CLI) | Calidad y migraciones |

**Resultado del gate (pre-research)**: PASA, sin violaciones.
**Re-evaluación post-diseño (Fase 1)**: PASA. El diseño agrega el estado técnico `draft` del bazar
(R3) y la vista `order_summaries`; ninguno introduce complejidad que requiera justificación.

## Project Structure

### Documentation (this feature)

```text
specs/001-recolectora-fase1/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones de diseño
├── data-model.md        # Fase 1: tablas, estados y matriz RLS
├── quickstart.md        # Fase 1: guía de validación
├── contracts/
│   ├── routes.md        # Rutas y acceso por rol
│   ├── server-actions.md# Server Actions y funciones SQL
│   ├── storage.md       # Buckets, rutas y políticas
│   └── notifications.md # Módulo de WhatsApp y plantillas
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (public)/                  # /, /aviso-de-privacidad, /entrar, /recuperar, /registro/*
│   ├── auth/callback/route.ts
│   ├── mi-cuenta/                 # clienta: inicio, pedidos/nuevo, pedidos/[folio]
│   ├── bazar/                     # bazar: estado y ficha
│   ├── admin/                     # recolectora: panel, paquetes, pagos, pedidos, clientas,
│   │                              # bazares, envios, configuracion
│   ├── manifest.ts                # PWA
│   ├── layout.tsx                 # lang="es-MX"
│   └── global-error.tsx           # Sentry
├── features/
│   ├── auth/        { actions.ts, schemas.ts, components/ }
│   ├── customers/   { actions.ts, queries.ts, schemas.ts, labels.ts, components/ }
│   ├── bazaars/     { actions.ts, queries.ts, schemas.ts, labels.ts, components/ }
│   ├── directory/   { queries.ts, components/ }
│   ├── orders/      { actions.ts, queries.ts, schemas.ts, status.ts, labels.ts, components/ }
│   ├── payments/    { actions.ts, queries.ts, schemas.ts, labels.ts, components/ }
│   ├── packages/    { actions.ts, queries.ts, schemas.ts, components/ }
│   ├── shipments/   { actions.ts, queries.ts, schemas.ts, labels.ts, components/ }
│   ├── settings/    { actions.ts, queries.ts, schemas.ts, components/ }
│   ├── notifications/ { actions.ts }          # reenviar avisos
│   ├── admin/       { queries.ts }            # contadores del panel
│   └── account-deletion/ { actions.ts, components/ }  # único usuario de lib/supabase/admin.ts
├── lib/
│   ├── supabase/    { server.ts, client.ts, middleware.ts, admin.ts (solo eliminación de
│   │                  cuentas, server-only), database.types.ts (generado) }
│   ├── notifications/ { types.ts, messages.ts, whatsapp-link.ts, index.ts }
│   ├── uploads/     { compress.ts, upload.ts, paths.ts }
│   ├── validation/  { messages.ts, phone.ts, customer-code.ts }
│   ├── auth/        { session.ts }            # getSessionProfile, requireRole
│   ├── format.ts    # moneda MXN, fechas America/Tijuana
│   └── action-result.ts
├── components/
│   ├── ui/          # shadcn/ui
│   ├── layout/      # barras de navegación por rol
│   ├── bazaar-card.tsx   # tarjeta del directorio (0–3 fotos)
│   ├── file-upload.tsx   # subida con compresión y cámara
│   ├── open-whatsapp.tsx # abre wa.me con respaldo "Copiar mensaje"
│   └── list-filters.tsx  # filtros sincronizados con la URL
└── middleware.ts

supabase/
├── config.toml
├── migrations/      # esquema, enums, RLS, storage, triggers, funciones
├── seed.sql         # datos de prueba locales
└── scripts/        # find-orphan-files.sql, seed-volume.sql (manuales)

tests/
├── unit/            # Vitest
├── integration/     # Vitest + Supabase local (RLS y Storage por rol)
└── e2e/             # Playwright: 5 flujos críticos
    └── fixtures/    # imágenes de prueba

docs/
├── arquitectura.md
└── manual-recolectora.md

.github/workflows/ci.yml
README.md
.env.example
```

**Structure Decision**: una sola aplicación Next.js en la raíz, organizada por funcionalidad
(`src/features/<area>`) para que quien herede el proyecto encuentre en un solo lugar el esquema,
las acciones, las consultas y los componentes de cada parte del negocio. La base de datos vive en
`supabase/` con migraciones versionadas. No hay backend separado: Supabase cumple ese papel y las
Server Actions son la capa de escritura.

## Complexity Tracking

Sin violaciones de la constitución; no se requiere justificación.
