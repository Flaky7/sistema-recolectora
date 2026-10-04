# Contrato: rutas de la aplicación

Las URLs son visibles para el usuario, por eso están en español; los nombres de archivos y código
dentro de cada ruta van en inglés. Todas las pantallas se diseñan primero para celular.

| Ruta | Acceso | Historia | Contenido |
|------|--------|----------|-----------|
| `/` | público | US6 | Directorio de bazares aprobados con buscador (`?q=`) |
| `/aviso-de-privacidad` | público | FR-005 | Aviso de privacidad |
| `/entrar` | público | — | Inicio de sesión (correo y contraseña) |
| `/recuperar` | público | FR-002 | Solicitud y cambio de contraseña |
| `/registro/clienta` | público | US1 | Registro de clienta |
| `/registro/bazar` | público | US4 | Creación de cuenta de bazar |
| `/auth/callback` | público | — | Confirmación de correo (Supabase) |
| `/mi-cuenta` | clienta | US1 | Código de clienta destacado, datos y lista de pedidos |
| `/mi-cuenta/pedidos/nuevo` | clienta | US1 | Nuevo pedido con monto, instrucciones y comprobante |
| `/mi-cuenta/pedidos/[folio]` | clienta | US1, US2, US3 | Estado, historial, paquetes con foto, envío; subir comprobante |
| `/bazar` | bazar | US4 | Estado del registro y motivo, ficha a completar/editar y envío a revisión; ya aprobado: versión publicada, propuesta de cambio y su estado ("Cambio en revisión" o motivo de rechazo) |
| `/admin` | recolectora | US7 | Panel con contadores de pendientes |
| `/admin/paquetes/nuevo` | recolectora | US2 | Registro rápido de paquete (pantalla principal en el celular) |
| `/admin/paquetes` | recolectora | US2, US7 | Paquetes; filtros "sin pedido" y "sin identificar" |
| `/admin/pagos` | recolectora | US1 | Pagos por revisar con comprobante, confirmar o rechazar |
| `/admin/pedidos` | recolectora | US7 | Pedidos con filtros (estado, clienta, bazar) |
| `/admin/pedidos/[folio]` | recolectora | US2, US3 | Detalle: paquetes, marcar completo, registrar envío, entregado, cancelar |
| `/admin/clientas` y `/admin/clientas/[code]` | recolectora | US7 | Clientas (con/sin cuenta) y su detalle |
| `/admin/clientas/nueva` | recolectora | US1 (FR-041) | Alta de clienta sin cuenta |
| `/admin/pedidos/nuevo` | recolectora | US1 (FR-042, FR-043) | Pedido a nombre de una clienta, con pago anotado opcional |
| `/admin/bazares` y `/admin/bazares/[id]` | recolectora | US5, US7 | Bazares por estado y pestaña "Cambios por autorizar" (ficha y documentos); revisión con documentos y decisión; comparación de versión publicada contra propuesta y de documento vigente contra documento nuevo |
| `/admin/envios` | recolectora | US7 | Envíos |
| `/admin/configuracion` | recolectora | FR-040 | Monto del anticipo, instrucciones de pago, plantillas |

**Redirecciones** (`middleware.ts`): sin sesión en una ruta protegida → `/entrar?next=…`; con
sesión de otro rol → a la página de inicio de su rol (`/admin`, `/mi-cuenta` o `/bazar`). La
autorización real la hace RLS.
