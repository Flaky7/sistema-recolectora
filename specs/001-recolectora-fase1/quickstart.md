# Quickstart: validar la Fase 1

Guía para levantar el proyecto localmente y comprobar que la fase 1 funciona de extremo a extremo.
Detalles de datos y contratos: [data-model.md](./data-model.md), [contracts/](./contracts/).

## Requisitos

- Node.js 22 LTS o más reciente y pnpm 10
- Docker Desktop (para Supabase local)
- Supabase CLI (`pnpm dlx supabase --version`)
- Navegadores de Playwright (`pnpm exec playwright install --with-deps chromium`)

## Preparación

```bash
pnpm install
cp .env.example .env.local          # completar con los valores que imprime `supabase start`
pnpm supabase start                 # Postgres, Auth, Storage y Mailpit (correo) locales
pnpm supabase db reset              # aplica migraciones y supabase/seed.sql
pnpm db:types                       # genera src/lib/supabase/database.types.ts
pnpm dev                            # http://localhost:3000
```

`seed.sql` crea: la recolectora `recolectora@test.local`, una clienta local, una clienta foránea,
bazares en cada estado y la configuración por defecto (anticipo y plantillas). Contraseña de todos
los usuarios de prueba: `Prueba123!`. Los correos de confirmación se ven en Mailpit
(`http://localhost:54324`).

## Verificaciones automáticas

```bash
pnpm lint
pnpm typecheck
pnpm test:unit            # Vitest: esquemas, máquina de estados, mensajes y wa.me, formatos
pnpm test:integration     # Vitest contra Supabase local: matriz de acceso RLS y Storage por rol
pnpm test:e2e             # Playwright en viewport de celular: los 5 flujos críticos
```

Resultado esperado: todo en verde. Estos mismos pasos corren en GitHub Actions en cada push y pull
request.

## Escenarios manuales (desde un celular o con DevTools en modo móvil)

1. **Registro de clienta y pedido (US1)**: registrarse en `/registro/clienta`, confirmar correo en
   Mailpit, ver el código de 5 caracteres en `/mi-cuenta`, crear pedido con comprobante →
   estado "Pago inicial pendiente".
2. **Revisión de pago (US1)**: como recolectora, `/admin/pagos` → abrir comprobante (enlace
   temporal) → confirmar → la clienta ve "Pago confirmado". Repetir rechazando con motivo → la
   clienta ve el motivo y puede subir otro.
3. **Recepción de paquete (US2)**: `/admin/paquetes/nuevo` → escribir el código → tomar foto →
   guardar → se abre WhatsApp (o `wa.me` en escritorio) con el mensaje y el enlace al pedido. El
   pedido pasa a "Recibiendo paquetes".
4. **Privacidad de fotos (SC-005)**: copiar el enlace firmado de la foto, abrirlo en ventana
   privada después de 60 min → expirado. Iniciar sesión como otra clienta y abrir
   `/mi-cuenta/pedidos/{folio}` ajeno → "No encontrado".
5. **Envío (US3)**: marcar completo con menos paquetes que los esperados → pide confirmación;
   registrar envío por paquetería con guía → WhatsApp con la guía; clienta local → opción
   "Entrega en persona"; marcar entregado.
6. **Bazar (US4, US5, US6)**: registrar bazar, completar ficha y enviar a revisión; como
   recolectora, ver documentos y aprobar → aparece en `/`; buscar la marca sin acentos; suspender →
   desaparece. Como bazar aprobado, cambiar una foto → el directorio no cambia hasta que la
   recolectora autoriza el cambio; un bazar sin fotos se ve como recuadro sin imágenes.
7. **PWA**: en Android/Chrome o iOS/Safari, "Agregar a pantalla de inicio" y abrir la app instalada.

## Despliegue (resumen; detalle en README)

1. Crear proyectos de Supabase de desarrollo y producción; `pnpm supabase link` y
   `pnpm supabase db push` en cada uno.
2. Crear el usuario de la recolectora (registro normal) y ejecutar
   `select promote_to_collector('correo@…');` en el SQL editor.
3. Configurar en Supabase Auth la URL del sitio y las URLs de redirección.
4. Crear el proyecto en Vercel, cargar las variables de `.env.example` y desplegar `main`.
