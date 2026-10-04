# Sistema Recolectora

PWA para organizar las compras que las clientas hacen en bazares de Facebook: las clientas
registran pedidos y su pago inicial, la recolectora recibe cada paquete desde su celular con foto y
avisa por WhatsApp, y registra el envío. Los bazares se registran con documentos privados y, ya
aprobados, aparecen en un directorio público.

- Manual para la recolectora: [`docs/manual-recolectora.md`](docs/manual-recolectora.md)
- Arquitectura y decisiones técnicas: [`docs/arquitectura.md`](docs/arquitectura.md)
- Especificación, plan y tareas: [`specs/001-recolectora-fase1/`](specs/001-recolectora-fase1/)

**Tecnologías**: Next.js 16 (App Router, Server Actions), React 19, TypeScript estricto, Tailwind
CSS 4 y shadcn/ui, Supabase (PostgreSQL, Auth, Storage), Zod, Vitest, Playwright, Sentry.

## Requisitos

- Node.js 22 LTS o más reciente y pnpm 10 (`corepack enable`)
- Docker Desktop (para Supabase local)
- Navegador de Playwright: `pnpm exec playwright install --with-deps chromium`

## Instalación local

```bash
pnpm install
cp .env.example .env.local          # completa las llaves con lo que imprime el paso siguiente
pnpm supabase start                 # Postgres, Auth, Storage y Mailpit locales
pnpm supabase db reset              # aplica supabase/migrations y supabase/seed.sql
pnpm db:types                       # regenera src/lib/supabase/database.types.ts
pnpm dev                            # http://localhost:3000
```

`pnpm supabase status` vuelve a mostrar las llaves locales (`ANON_KEY` y `SERVICE_ROLE_KEY`).

**Usuarios de prueba** (contraseña `Prueba123!`, todos ficticios): `recolectora@test.local`,
`clienta.local@test.local`, `clienta.foranea@test.local` y bazares en cada estado
(`bazar.borrador@`, `bazar.pendiente@`, `bazar.aprobado@`, `bazar.sinfotos@`, `bazar.rechazado@`,
`bazar.suspendido@`, `bazar.cambio@`, todos con `@test.local`).

Los correos de confirmación y recuperación se ven en Mailpit: <http://localhost:54324>.

### Variables de entorno

| Variable                                                    | Uso                                                                                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Conexión a Supabase con la sesión del usuario (RLS aplica)                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | **Secreta.** Solo la usa `src/lib/supabase/admin.ts` para eliminar cuentas, y las pruebas. Nunca con prefijo `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL`                                      | URL pública del sitio; va en los enlaces de los mensajes de WhatsApp                                                        |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`                      | Opcionales; si están vacías no se envían errores                                                                            |
| `SENTRY_AUTH_TOKEN`                                         | Solo en Vercel, para subir source maps                                                                                      |

## Scripts

| Comando                                        | Qué hace                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`       | Desarrollo, build y servidor de producción                        |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, TypeScript y Prettier                                     |
| `pnpm test:unit`                               | Vitest: esquemas, máquina de estados, mensajes, formatos          |
| `pnpm test:integration`                        | Vitest contra Supabase local: RLS, Storage, triggers por rol      |
| `pnpm test:e2e`                                | Playwright en celular (Pixel 7) y escritorio: los flujos críticos |
| `pnpm db:types`                                | Regenera los tipos después de una migración                       |

Las pruebas de integración y E2E necesitan Supabase local corriendo; crean sus propios datos y
pueden repetirse sin reiniciar la base. `pnpm test:e2e` hace el build y levanta el servidor.

### Datos de volumen y archivos huérfanos (manuales)

- `supabase/scripts/seed-volume.sql` carga ~1,000 clientas, ~3,000 pedidos, ~5,000 paquetes y
  ~200 bazares ficticios **en local** para medir rendimiento:
  `docker exec -i supabase_db_BazarApp psql -U postgres < supabase/scripts/seed-volume.sql`.
  Para quitarlos: `pnpm supabase db reset`.
- `supabase/scripts/find-orphan-files.sql` lista archivos de Storage que ya no usa ninguna tabla
  (ver `docs/arquitectura.md`).

## Despliegue

Se usan **dos proyectos de Supabase** (desarrollo y producción) y un proyecto de Vercel.

### Supabase (en cada proyecto)

1. Crear el proyecto en <https://supabase.com> (región cercana, por ejemplo `us-west-1`).
2. Enlazar y aplicar las migraciones:

   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <ref-del-proyecto>
   pnpm supabase db push
   ```

   **No** ejecutes `seed.sql` en producción.

3. **Authentication › URL Configuration**: _Site URL_ = la URL del sitio (por ejemplo
   `https://recolectora.vercel.app`) y en _Redirect URLs_ agrega `https://<sitio>/auth/callback`.
4. **Authentication › Sign In / Providers › Email**: confirmación de correo activada.
5. **Authentication › Email Templates**: copia el contenido de
   `supabase/templates/confirmation.html` (Confirm signup) y `supabase/templates/recovery.html`
   (Reset password). Ambos enlazan a `/auth/callback?token_hash=…`.
6. Para producción conviene configurar SMTP propio (**Authentication › SMTP Settings**); el envío
   de correo incluido en Supabase tiene un límite bajo por hora.
7. **Cuenta de la recolectora**: regístrate en la app como clienta con el correo de la
   recolectora, confirma el correo y en el **SQL Editor** ejecuta:

   ```sql
   select promote_to_collector('correo@de-la-recolectora.mx');
   ```

8. Entra como recolectora y en **Configuración** escribe el monto del pago inicial y los datos
   para pagar.

### Vercel

1. Importar el repositorio de GitHub en <https://vercel.com/new> (framework Next.js).
2. Cargar las variables de `.env.example` con los valores del proyecto de Supabase de
   **producción** (y las de desarrollo en _Preview_). `NEXT_PUBLIC_SITE_URL` debe ser la URL
   pública.
3. Desplegar `main`. Cada pull request genera una vista previa.

### Sentry (opcional)

Crear un proyecto Next.js en <https://sentry.io> (plan gratuito), copiar el DSN a `SENTRY_DSN` y
`NEXT_PUBLIC_SENTRY_DSN`, y crear un token de organización para `SENTRY_AUTH_TOKEN`. El SDK ya
está configurado para **no enviar datos personales** y sin Session Replay.

## Flujo de trabajo y la rama `main`

- `main` está **protegida**: los cambios entran solo por pull request y con la CI
  (`.github/workflows/ci.yml`: lint, typecheck, unitarias, integración contra Supabase, build y
  E2E) en verde; la regla aplica también a administradores.
- Para verificarla o restaurarla: **GitHub › Settings › Branches › Branch protection rules ›
  `main`**: _Require a pull request before merging_, _Require status checks to pass_ (check
  `ci`), _Do not allow bypassing the above settings_.
- Hacer una rama por cambio, abrir el pull request y esperar la CI antes de fusionar.

### Por qué el repositorio es público y qué nunca debe subirse

En el plan gratuito de GitHub la protección de ramas solo existe en repositorios públicos
(research R20). El código no tiene licencia abierta: **todos los derechos reservados**. La
seguridad no depende de que el código sea secreto, sino de RLS, enlaces firmados y llaves fuera
del repositorio. **Nunca subas**:

- `.env.local` ni ningún archivo con llaves (`SUPABASE_SERVICE_ROLE_KEY`, tokens de Sentry o
  Vercel). `.gitignore` los excluye y GitHub tiene _secret scanning_ y _push protection_.
- Datos reales de clientas o bazares: `seed.sql` y las pruebas usan solo datos ficticios.

Si una llave se sube por error: rótala de inmediato en Supabase/Sentry/Vercel (subir otro commit
no la borra del historial).

## Cuentas de servicios, planes y costos

| Servicio | Uso                                               | Plan                                                                                                                                                              |
| -------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub   | Código, CI y protección de `main`                 | Gratuito (repositorio público)                                                                                                                                    |
| Vercel   | Hospedaje de la app                               | **Hobby es solo para uso no comercial**; para un negocio corresponde **Pro** (por usuario al mes)                                                                 |
| Supabase | Base de datos, cuentas y archivos (dos proyectos) | Gratuito para empezar; **el plan gratuito pausa los proyectos sin actividad** (unos 7 días) y tiene límites de Storage. Para producción continua conviene **Pro** |
| Sentry   | Errores                                           | Gratuito                                                                                                                                                          |

Revisa los precios vigentes en cada sitio antes de contratar.

## Traspaso a la clienta (al entregar)

1. **GitHub**: _Settings › Transfer ownership_ a la cuenta de la clienta. Verificar que la
   protección de `main` se conserva.
2. **Vercel**: transferir el proyecto al equipo de la clienta (_Settings › Transfer_).
3. **Supabase**: transferir los dos proyectos a la organización de la clienta (_Project Settings ›
   General › Transfer project_).
4. **Sentry**: transferir la organización o el proyecto.
5. **Rotar secretos**: generar nuevas llaves de Supabase (service role), un nuevo
   `SENTRY_AUTH_TOKEN` y cualquier otro token; actualizar las variables en Vercel y en GitHub
   Actions.
6. Quitar el acceso del desarrollador si así se acuerda.
7. Anotar aquí los dueños finales y el plan contratado:

| Servicio              | Dueña       | Plan |
| --------------------- | ----------- | ---- |
| GitHub                | _pendiente_ |      |
| Vercel                | _pendiente_ |      |
| Supabase (dev / prod) | _pendiente_ |      |
| Sentry                | _pendiente_ |      |
