# Sistema Recolectora Constitution

Sistema Recolectora es una aplicación web y móvil (PWA) para una recolectora que recibe compras
de bazares virtuales a nombre de sus clientas y las envía consolidadas.

## Core Principles

### I. Simplicidad y mantenibilidad

- El sistema se entregará a la clienta y DEBE poder mantenerlo cualquier desarrollador sin el
  autor original.
- Ante dos soluciones válidas, se DEBE elegir la más simple sobre la más ingeniosa.
- NO se DEBE agregar una dependencia sin una razón clara, documentada en el plan o en el cambio
  que la introduce.
- Todo el código DEBE ser TypeScript en modo estricto (`"strict": true`); no se permite
  desactivarlo por archivo ni por módulo.
- Los nombres de código, tablas, columnas y variables DEBEN estar en inglés; todo texto visible
  para el usuario DEBE estar en español de México.

**Razón**: el éxito del proyecto depende de que pueda mantenerse después del traspaso.

### II. Privacidad de datos personales

- Los documentos de los bazares (credencial, foto personal, comprobante de domicilio,
  comprobante de pago y referencias) y los comprobantes de pago de las clientas son privados y
  solo DEBE poder verlos la recolectora.
  - Excepción (1.1.0): el bazar PUEDE ver y editar las referencias (nombre y teléfono) que él
    mismo proporcionó. Los archivos de sus documentos siguen siendo visibles solo para la
    recolectora, incluso para el bazar que los subió.
- Estos archivos NUNCA DEBEN exponerse mediante enlaces públicos; el acceso DEBE hacerse con
  enlaces temporales (firmados y con expiración) generados tras validar el rol.
- El directorio público de bazares DEBE mostrar únicamente nombre, marcas, fotos y link del
  bazar.
- El sistema DEBE incluir un aviso de privacidad accesible para todos los usuarios.

**Razón**: se manejan documentos de identidad y datos financieros de personas reales.

### III. Control de acceso por roles

- Existen exactamente tres roles: recolectora (administradora), clienta y bazar.
- Cada rol solo DEBE poder ver y modificar su propia información; la recolectora administra la
  operación.
  - Excepción (1.1.0, ampliada en 1.2.0): al registrarse, quien use un WhatsApp que ya existe
    como clienta PUEDE saberlo: si la clienta fue dada de alta sin cuenta por la recolectora, para
    que el formulario le pida su código y pueda ligar su cuenta; si la clienta ya tiene cuenta,
    para avisarle "Ya existe una cuenta con ese número" y ofrecerle iniciar sesión o recuperar su
    contraseña. Solo se revela que el número existe; NUNCA se DEBEN mostrar nombre, dirección,
    pedidos ni ningún otro dato.
- Las reglas de acceso DEBEN aplicarse en la base de datos (por ejemplo, políticas de seguridad
  a nivel de fila y de almacenamiento), no solo en la interfaz. Ocultar un botón no es control
  de acceso.

**Razón**: un error en la interfaz no debe poder filtrar datos de otro usuario.

### IV. Diseño para celular primero

- Toda pantalla DEBE diseñarse primero para celular y después adaptarse a escritorio.
- Los flujos de la recolectora DEBEN poder completarse desde el teléfono, incluida la captura
  de fotos de paquetes con la cámara del dispositivo.

**Razón**: la recolectora operará principalmente desde su teléfono.

### V. Pruebas de los flujos críticos

- Ninguna funcionalidad se considera terminada sin pruebas automatizadas de sus flujos
  principales.
- Los flujos críticos que DEBEN estar cubiertos son: registro de bazar, aprobación de bazar,
  creación de pedido, registro de paquete recibido y envío.
- Las pruebas DEBEN ejecutarse automáticamente en cada cambio (integración continua) y un
  cambio con pruebas fallidas NO DEBE integrarse.

**Razón**: protege la operación diaria de regresiones cuando otra persona mantenga el código.

### VI. Documentación para traspaso

El proyecto DEBE incluir y mantener actualizados:

- Un README con instrucciones de instalación y despliegue.
- Una descripción de la arquitectura y de las cuentas de servicios externos utilizadas.
- Un manual de uso breve para la recolectora, en español de México.

**Razón**: el sistema se entrega a la clienta y debe poder operarse y transferirse sin el autor.

### VII. Costo de operación bajo

- Se DEBEN usar servicios administrados en sus planes básicos.
- El sistema se dimensiona para alrededor de mil usuarios registrados; NO se DEBE diseñar ni
  agregar infraestructura para una escala mayor.

**Razón**: la clienta asumirá el costo mensual de operación.

### VIII. Evolución por fases

- La primera fase NO DEBE usar integraciones de pago en línea ni la API de WhatsApp.
- El diseño DEBE permitir agregarlas después sin rehacer el sistema (por ejemplo, registrando
  pagos y notificaciones como entidades propias y separando su origen manual o automático).

**Razón**: entregar valor pronto sin cerrar el camino a mejoras futuras.

## Restricciones técnicas y de operación

- Plataforma: aplicación web instalable (PWA), una sola base de código para web y móvil.
- Lenguaje: TypeScript estricto en frontend, backend, scripts y pruebas.
- Archivos privados: almacenamiento no público con acceso solo mediante enlaces temporales.
- Seguridad de datos: reglas de acceso por rol definidas en la base de datos y versionadas junto
  con el código (migraciones).
- Escala objetivo: ~1,000 usuarios registrados en planes básicos de servicios administrados.

## Flujo de desarrollo y puertas de calidad

- Cada especificación y plan DEBE verificarse contra estos principios (revisión de
  cumplimiento) antes de implementarse.
- Toda complejidad adicional (nueva dependencia, nuevo servicio, patrón no trivial) DEBE
  justificarse por escrito en el plan.
- Todo cambio que toque un flujo crítico DEBE incluir o actualizar sus pruebas automatizadas.
- Todo cambio que afecte instalación, despliegue, arquitectura o uso DEBE actualizar la
  documentación de traspaso correspondiente.
- Toda pantalla nueva DEBE revisarse primero en tamaño de celular.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica del proyecto.
- Cualquier cambio a estos principios DEBE documentarse en esta constitución, registrando su
  fecha (AAAA-MM-DD) y su motivo en la bitácora de enmiendas.
- Versionado semántico de la constitución:
  - MAJOR: eliminación o redefinición incompatible de un principio o regla de gobernanza.
  - MINOR: nuevo principio o sección, o ampliación material de una guía.
  - PATCH: aclaraciones, redacción y correcciones sin cambio de significado.
- Las revisiones de código y de planes DEBEN verificar el cumplimiento de estos principios.

### Bitácora de enmiendas

| Versión | Fecha      | Motivo                                              |
|---------|------------|-----------------------------------------------------|
| 1.0.0   | 2026-10-04 | Adopción inicial de los principios del proyecto.    |
| 1.1.0   | 2026-10-04 | Excepciones en II y III aprobadas en el análisis de la especificación 001: el bazar ve y edita sus propias referencias (corregir datos sin intervención de la recolectora); el registro revela si un WhatsApp ya existe como clienta sin cuenta para pedir su código (registro claro para clientas que primero dio de alta la recolectora). |
| 1.2.0   | 2026-10-04 | Se amplía la excepción del principio III (cuarto análisis de la especificación 001): el registro también avisa si el WhatsApp ya pertenece a una clienta con cuenta, para que sepa iniciar sesión o recuperar su contraseña en lugar de recibir un error confuso. |

**Version**: 1.2.0 | **Ratified**: 2026-10-04 | **Last Amended**: 2026-10-04
