# Feature Specification: Sistema Recolectora – Fase 1 (organización de pedidos, recepción y envío)

**Feature Branch**: `001-recolectora-fase1`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "Sistema de organización de pedidos para una recolectora de compras de
bazares virtuales. Esta especificación cubre la fase 1. Roles: recolectora, clienta y bazar.
Historias: directorio público de bazares, registro de bazares, aprobación de bazares, registro de
clientas, pedidos, recepción de paquetes, envíos y panel de administración."

### Contexto del negocio

La recolectora recibe en su domicilio las compras que sus clientas (locales y foráneas) hacen en
distintos bazares virtuales que venden por Facebook. Cuando un pedido está completo, la recolectora
lo envía a la clienta en un solo paquete. Las compras se siguen haciendo directamente en Facebook;
el sistema no vende productos, solo organiza la recepción y el envío.

## Clarifications

### Session 2026-10-04

- Q: Cuando la clienta abre el enlace de la foto del paquete que le llega por WhatsApp, ¿debe
  iniciar sesión para verla o puede verla directamente durante un tiempo limitado? → A: Debe
  iniciar sesión; el enlace lleva a la página del pedido (FR-019).
- Q: ¿La clienta debe pagar el costo de envío antes de que su pedido pueda enviarse, o en esta
  fase el costo solo se anota como información? → A: Informativo; el cobro se acuerda fuera del
  sistema y no bloquea el envío (FR-023).
- Q: ¿La recolectora debe poder dar de alta clientas y registrar pedidos a nombre de ellas? → A:
  Sí, sin cuenta: la clienta recibe avisos por WhatsApp pero no entra a la app; puede reclamar su
  cuenta después registrándose con el mismo WhatsApp (FR-041 a FR-045).
- Q: Cuando una clienta o un bazar pide que se borren sus datos personales, ¿cómo debe hacerse? →
  A: Autoservicio: cada clienta o bazar puede eliminar su cuenta desde la app; además, la
  recolectora puede eliminar los datos de cualquier clienta o bazar, o darlos de baja temporal y
  reactivarlos después (FR-046 a FR-050).
- Q: Cuando la recolectora confirma o rechaza el pago inicial de una clienta, ¿el sistema también
  debe abrir WhatsApp con un mensaje ya escrito para avisarle? → A: Sí, en ambos casos (FR-051).
- Cambio solicitado por el usuario: ¿las fotos del bazar son obligatorias y los cambios a su ficha
  pública se publican de inmediato? → A: Las fotos son opcionales (0 a 3); sin fotos, el bazar
  aparece en el directorio con su información y sin imágenes. Una vez aprobado, el bazar puede
  editar lo que se ve en el directorio, pero cada cambio debe autorizarlo la recolectora antes de
  publicarse, para evitar imágenes inapropiadas (FR-024, FR-028, FR-035, FR-029 a FR-031).
- Cambio solicitado por el usuario: ¿el bazar puede cambiar sus documentos privados cuando quiera?
  → A: Sí, pero el documento nuevo queda en revisión y el anterior sigue vigente; cuando la
  recolectora autoriza el nuevo, el anterior se borra definitivamente (FR-032 a FR-034).
- Análisis de consistencia: ¿qué estado tiene un pedido con paquetes cuando se confirma su pago? →
  A: "Recibiendo paquetes" directamente (FR-012).
- Análisis de consistencia: ¿el registro puede revelar que un WhatsApp ya está dado de alta como
  clienta sin cuenta para pedir su código? → A: Sí, se acepta ese riesgo para que el registro sea
  claro; solo se revela que el número existe, nunca otros datos (FR-044).
- Análisis de consistencia: ¿qué mensaje recibe la clienta por un paquete sin pedido? → A: Una
  plantilla propia que le pide registrar su pedido, con enlace a su cuenta (FR-018).
- Análisis de consistencia: ¿qué datos de una clienta edita la recolectora? → A: Todos menos el
  código (FR-008).
- Análisis de consistencia: ¿una clienta dada de baja o con pedidos enviados ve sus pedidos? → A:
  Siempre puede verlos; crear y editar solo con cuenta activa y pedido no completo (FR-049).
- Análisis de consistencia: ¿quién lee la configuración? → A: La clienta solo el monto y los datos
  para pagar; las plantillas solo la recolectora; los bazares nada (FR-040).
- Análisis de consistencia: ¿el bazar ve y edita sus propias referencias, también estando
  suspendido? → A: Sí; ve y edita sus 3 referencias en cualquier momento, incluso suspendido. Solo
  la recolectora ve las de otros bazares (FR-026, FR-028, FR-049).
- Análisis de consistencia: si alguien se registra con un WhatsApp que ya pertenece a una clienta
  con cuenta, ¿qué ve? → A: Un aviso claro de que ya existe una cuenta con ese número, con opción
  de iniciar sesión o recuperar la contraseña; solo se revela que el número existe (excepción del
  principio III, constitución 1.2.0) (FR-044).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro de clientas y pedidos con pago inicial (Priority: P1)

Una clienta crea su cuenta con nombre, número de WhatsApp, dirección de envío y si es local o
foránea. Al terminar, el sistema le asigna un código único que ella comparte con los bazares para
que lo escriban en la etiqueta de cada paquete. Después registra un pedido: indica a qué bazar o
bazares compró, describe los artículos, indica cuántos paquetes espera y sube el comprobante del
pago inicial. La recolectora revisa el comprobante y confirma o rechaza el pago. La clienta ve en
todo momento el estado de su pedido.

**Why this priority**: sin clientas, códigos y pedidos no existe nada que recibir ni enviar; es el
núcleo del servicio y lo que hoy se lleva de forma manual.

**Independent Test**: se puede probar creando una cuenta de clienta, registrando un pedido con
comprobante y confirmando el pago como recolectora; entrega valor al dar a la clienta un código y
un registro formal de su pedido y anticipo.

**Acceptance Scenarios**:

1. **Given** una visitante sin cuenta, **When** se registra con nombre, WhatsApp, dirección, tipo
   (local/foránea), correo y contraseña, confirma su correo e inicia sesión, **Then** ve su código
   único de clienta con instrucciones para compartirlo con los bazares.
2. **Given** una clienta con sesión iniciada, **When** registra un pedido con uno o más bazares,
   descripción de artículos, número de paquetes esperados y comprobante de pago inicial, **Then**
   el pedido queda en estado "pago inicial pendiente" y aparece en la lista de pagos por revisar de
   la recolectora.
3. **Given** una clienta que registra un pedido sin adjuntar comprobante, **When** guarda el
   pedido, **Then** el pedido queda en estado "registrado" y se le indica que debe subir el
   comprobante para que avance.
4. **Given** un pedido en "pago inicial pendiente", **When** la recolectora confirma el pago,
   **Then** el pedido pasa a "pago confirmado", la clienta lo ve reflejado y se abre WhatsApp con
   un mensaje prellenado que le avisa que su pago fue confirmado.
5. **Given** un pedido en "pago inicial pendiente", **When** la recolectora rechaza el pago
   indicando un motivo, **Then** el pedido regresa a "registrado", la clienta ve el motivo y puede
   subir un nuevo comprobante, y se abre WhatsApp con un mensaje prellenado que incluye el motivo y
   le pide subir otro comprobante.
6. **Given** una clienta con sesión iniciada, **When** consulta sus pedidos, **Then** ve
   únicamente sus propios pedidos con su estado actual, y nunca los de otra clienta.
7. **Given** una clienta que no quiere usar la app, **When** la recolectora la da de alta con
   nombre, WhatsApp, dirección y tipo, **Then** se crea la clienta "sin cuenta" con su código único,
   y la recolectora puede compartirle el código por WhatsApp.
8. **Given** una clienta sin cuenta, **When** la recolectora registra un pedido a su nombre y anota
   el pago inicial recibido (con comprobante opcional), **Then** el pedido queda en
   "pago confirmado".
9. **Given** una clienta sin cuenta, **When** se registra en la app con el mismo WhatsApp y escribe
   su código de clienta, **Then** su cuenta queda ligada a la clienta existente, conserva su código
   y ve todos sus pedidos anteriores.

---

### User Story 2 - Recepción de paquetes desde el celular (Priority: P1)

Cuando llega un paquete, la recolectora, desde su celular, busca a la clienta por el código escrito
en la etiqueta, elige el pedido al que pertenece, toma una foto del paquete y lo guarda. Al guardar,
el sistema abre WhatsApp con un mensaje ya escrito para la clienta que indica qué llegó e incluye un
enlace para ver la foto. La recolectora solo confirma el envío del mensaje.

**Why this priority**: es la operación diaria más frecuente de la recolectora y la razón principal
del sistema: saber qué llegó, de quién y avisar a la clienta.

**Independent Test**: con una clienta y un pedido existentes, se registra un paquete desde un
celular buscando por código, con foto, y se verifica que el paquete aparece en el pedido y que se
abre WhatsApp con el mensaje correcto.

**Acceptance Scenarios**:

1. **Given** una clienta con un pedido activo, **When** la recolectora escribe el código de la
   clienta, **Then** el sistema muestra a la clienta y sus pedidos activos; si solo hay uno, queda
   preseleccionado.
2. **Given** la clienta y el pedido seleccionados, **When** la recolectora toma la foto con la
   cámara del teléfono, indica el bazar de origen y una nota opcional y guarda, **Then** el paquete
   queda asociado al pedido con fecha y hora de recepción.
3. **Given** el paquete guardado, **When** termina el guardado, **Then** se abre WhatsApp dirigido
   al número de la clienta con un mensaje prellenado que incluye el bazar de origen, el conteo de
   paquetes recibidos contra esperados y un enlace para ver la foto.
4. **Given** un pedido en "pago confirmado", **When** se registra su primer paquete, **Then** el
   pedido pasa a "recibiendo paquetes".
5. **Given** la clienta dueña del pedido, **When** abre el enlace del mensaje, **Then** se le pide
   iniciar sesión (si no la tiene abierta) y después ve la foto del paquete en la página de su
   pedido; **Given** cualquier otra persona, **When** abre el mismo enlace, **Then** no puede ver
   la foto.
6. **Given** un código que no corresponde a ninguna clienta, **When** la recolectora lo busca,
   **Then** el sistema indica que no existe y permite buscar por nombre o teléfono.

---

### User Story 3 - Cierre y envío del pedido (Priority: P2)

Cuando el pedido está completo, la recolectora lo marca como "completo" y registra el envío con
paquetería, número de guía y costo. Al registrar el envío, el sistema abre WhatsApp con un mensaje
ya escrito para la clienta con el número de guía. Para clientas locales, el envío puede registrarse
como entrega o recolección en persona. Finalmente, la recolectora marca el pedido como entregado.

**Why this priority**: cierra el ciclo del servicio, pero puede llevarse un tiempo de forma manual
mientras las historias P1 ya generan valor.

**Independent Test**: con un pedido con paquetes recibidos, se marca completo, se registra el envío
y se verifica el estado "enviado", el mensaje de WhatsApp prellenado y el paso a "entregado".

**Acceptance Scenarios**:

1. **Given** un pedido en "recibiendo paquetes", **When** la recolectora lo marca como completo,
   **Then** pasa a "completo"; si los paquetes recibidos son menos que los esperados, el sistema
   pide confirmación antes de cambiarlo.
2. **Given** un pedido "completo" de una clienta foránea, **When** la recolectora registra
   paquetería, número de guía y costo, **Then** el pedido pasa a "enviado" y se abre WhatsApp con un
   mensaje prellenado que incluye paquetería y número de guía.
3. **Given** un pedido "completo" de una clienta local, **When** la recolectora registra el envío
   como "entrega en persona" o "recolección en persona" (sin guía obligatoria), **Then** el pedido
   pasa a "enviado" y se abre WhatsApp con un mensaje prellenado acorde al tipo de entrega.
4. **Given** un pedido "enviado", **When** la recolectora marca que fue recibido por la clienta,
   **Then** el pedido pasa a "entregado".
5. **Given** un pedido "enviado", **When** la clienta lo consulta, **Then** ve paquetería, número de
   guía y costo de envío.

---

### User Story 4 - Registro de bazares (Priority: P2)

Un bazar crea una cuenta y se registra con sus datos públicos (nombre, marcas que maneja, link de
su página o perfil y, si lo desea, hasta 3 fotos) y sus datos privados (foto de credencial, foto
de la persona, comprobante de domicilio, comprobante de pago de registro y 3 referencias con
nombre y teléfono). Al registrarse queda en "pendiente de revisión". Una vez aprobado, puede
proponer cambios a lo que se ve en el directorio; los cambios se publican solo cuando la
recolectora los autoriza.

**Why this priority**: alimenta el directorio, que es un servicio adicional para las clientas; la
operación de pedidos funciona sin él.

**Independent Test**: un bazar completa el registro con todos los datos y documentos y se verifica
que queda "pendiente de revisión" y que sus documentos privados no son accesibles públicamente.

**Acceptance Scenarios**:

1. **Given** una visitante, **When** crea su cuenta de bazar, confirma su correo, inicia sesión y
   completa su ficha con todos los datos obligatorios y la envía, **Then** el bazar queda en
   "pendiente de revisión" y ve un mensaje que lo indica. Mientras no la envía, su registro está
   "incompleto" y nadie más lo ve.
2. **Given** un registro al que le falta un documento o una referencia, **When** intenta enviarlo,
   **Then** el sistema indica qué falta y no lo envía. Las fotos públicas no son obligatorias.
3. **Given** un bazar registrado, **When** inicia sesión, **Then** ve el estado de su registro y,
   si fue rechazado, el motivo.
4. **Given** cualquier persona que no sea la recolectora (incluido el propio bazar después de
   enviarlos), **When** intenta abrir un documento privado del bazar, **Then** no puede verlo.
5. **Given** un bazar aprobado, **When** cambia su nombre, marcas, link o fotos y envía el cambio,
   **Then** el directorio sigue mostrando la versión anterior y el bazar ve "Cambio en revisión".
6. **Given** un bazar con un cambio en revisión, **When** la recolectora lo rechaza con un motivo,
   **Then** el directorio no cambia y el bazar ve el motivo y puede proponer otro cambio.
7. **Given** cualquier visitante, **When** un bazar sube una foto que aún no ha sido autorizada,
   **Then** esa foto no es accesible públicamente.
8. **Given** un bazar aprobado, **When** sube un nuevo comprobante de domicilio (o cualquier otro
   documento), **Then** el documento queda "en revisión" y el anterior sigue vigente.

---

### User Story 5 - Aprobación de bazares (Priority: P2)

La recolectora revisa los datos y documentos de cada bazar para aprobarlo, rechazarlo o suspenderlo.
Solo los aprobados aparecen en el directorio.

**Why this priority**: es requisito para que el directorio sea confiable; va junto con el registro
de bazares.

**Independent Test**: con un bazar pendiente, la recolectora abre sus documentos, lo aprueba y se
verifica que aparece en el directorio; luego lo suspende y se verifica que desaparece.

**Acceptance Scenarios**:

1. **Given** bazares "pendiente de revisión", **When** la recolectora abre la lista de revisión,
   **Then** ve cada bazar con sus datos públicos, sus documentos privados y sus referencias.
2. **Given** un bazar pendiente, **When** la recolectora lo aprueba, **Then** pasa a "aprobado" y
   aparece en el directorio público.
3. **Given** un bazar pendiente, **When** la recolectora lo rechaza con un motivo, **Then** pasa a
   "rechazado" y el bazar puede ver el motivo.
4. **Given** un bazar aprobado, **When** la recolectora lo suspende, **Then** pasa a "suspendido" y
   deja de aparecer en el directorio; **When** lo reactiva, **Then** vuelve a "aprobado".
5. **Given** un bazar aprobado con un cambio en revisión, **When** la recolectora abre el cambio,
   **Then** ve lado a lado la versión publicada y la propuesta (textos y fotos).
6. **Given** un cambio en revisión, **When** la recolectora lo autoriza, **Then** el directorio
   muestra la nueva versión; **When** lo rechaza con un motivo, **Then** el directorio no cambia.
7. **Given** un bazar con un documento nuevo en revisión, **When** la recolectora lo compara con el
   vigente y lo autoriza, **Then** el nuevo pasa a ser el vigente y el anterior se borra
   definitivamente; **When** lo rechaza con un motivo, **Then** el vigente no cambia, el documento
   rechazado se borra y el bazar ve el motivo.

---

### User Story 6 - Directorio público de bazares (Priority: P3)

Cualquier visitante, sin crear cuenta, ve un directorio de bazares aprobados con su nombre, sus
marcas, sus fotos autorizadas (de 0 a 3) y un botón que abre el link de su página. Puede buscar
por nombre del bazar o por marca.

**Why this priority**: aporta valor a las clientas y atrae bazares, pero depende de que existan
bazares aprobados.

**Independent Test**: con bazares en distintos estados, un visitante sin sesión abre el directorio,
busca por marca y verifica que solo ve bazares aprobados con sus datos públicos.

**Acceptance Scenarios**:

1. **Given** bazares en todos los estados, **When** una visitante abre el directorio, **Then** solo
   ve los "aprobados", cada uno con nombre, marcas, sus fotos autorizadas y botón al link de su
   página; un bazar sin fotos aparece como un recuadro con su información y sin imágenes.
2. **Given** el directorio, **When** la visitante busca un texto, **Then** ve los bazares aprobados
   cuyo nombre o alguna marca contiene ese texto, sin distinguir mayúsculas ni acentos.
3. **Given** una búsqueda sin coincidencias, **When** se ejecuta, **Then** se muestra un mensaje
   claro de que no hay resultados.
4. **Given** el directorio, **When** se consulta, **Then** no se expone ningún dato privado del
   bazar (documentos, referencias, datos de contacto privados).

---

### User Story 7 - Panel de administración (Priority: P3)

La recolectora ve todos los bazares, clientas, pedidos, pagos y envíos, y los busca por clienta,
bazar o estado.

**Why this priority**: las historias anteriores ya incluyen las listas mínimas para operar; el panel
unificado mejora la consulta y el seguimiento.

**Independent Test**: con datos de prueba, la recolectora filtra pedidos por estado, busca por
código de clienta y por bazar, y obtiene los resultados correctos.

**Acceptance Scenarios**:

1. **Given** la recolectora con sesión iniciada, **When** abre el panel, **Then** ve accesos a
   bazares, clientas, pedidos, pagos y envíos, con el número de pendientes por atender (bazares por
   revisar, cambios de ficha por autorizar, documentos por autorizar, pagos por confirmar, paquetes
   sin asignar y pedidos completos por enviar).
2. **Given** la lista de pedidos, **When** filtra por estado, por clienta (nombre o código) o por
   bazar, **Then** ve solo los pedidos que cumplen el filtro.
3. **Given** una clienta o un bazar, **When** intenta abrir cualquier pantalla del panel, **Then**
   el sistema niega el acceso.

---

### Edge Cases

- **Paquete sin pedido**: llega un paquete con el código de una clienta que no tiene pedido activo.
  La recolectora puede registrarlo asociado solo a la clienta ("sin pedido") y asignarlo después a
  un pedido; la clienta recibe un mensaje propio que le pide registrar su pedido (FR-018).
- **Paquete sin código legible o desconocido**: la recolectora puede buscar por nombre o teléfono;
  si no identifica a la clienta, lo registra como "sin identificar" con foto para asignarlo después.
- **Paquete antes de confirmar el pago**: se puede registrar; el pedido conserva su estado de pago y
  pasa a "recibiendo paquetes" cuando se confirme el pago.
- **Más paquetes que los esperados**: se permite registrar; el sistema muestra el conteo
  (por ejemplo, "5 de 4") para que la recolectora lo revise.
- **Clienta con varios pedidos activos**: la recolectora elige el pedido; puede mover un paquete
  de un pedido a otro de la misma clienta antes de que el pedido se envíe.
- **Pago rechazado varias veces**: cada comprobante y cada rechazo quedan en el historial del pedido.
- **Cancelación**: la clienta puede cancelar su pedido mientras no tenga pagos confirmados ni
  paquetes; en otro caso, solo la recolectora puede cancelarlo.
- **Edición del pedido**: la clienta puede modificar bazares, descripción y paquetes esperados
  mientras el pedido no esté "completo".
- **Bazar rechazado**: puede corregir sus datos y volver a enviar el registro, que regresa a
  "pendiente de revisión".
- **Bazar aprobado que cambia sus datos públicos**: el cambio queda "en revisión" y el directorio
  sigue mostrando la versión publicada hasta que la recolectora lo autorice (FR-029).
- **Bazar con un cambio en revisión que propone otro**: el nuevo cambio reemplaza al pendiente; solo
  existe un cambio en revisión por bazar.
- **Bazar suspendido o eliminado con un cambio en revisión**: el cambio se descarta.
- **Documentos durante el registro**: mientras el bazar no ha sido aprobado, sus documentos están
  "en revisión"; al aprobar el bazar, todos pasan a vigentes. Si el registro se rechaza, el bazar
  puede reemplazarlos antes de reenviarlo.
- **Bazar suspendido con un documento en revisión**: no puede subir documentos nuevos; el que estaba
  en revisión se conserva para que la recolectora lo autorice o rechace.
- **WhatsApp no disponible en el dispositivo**: el sistema muestra el mensaje con opción de copiarlo
  para enviarlo manualmente; el paquete o envío ya queda guardado.
- **Foto fallida o sin conexión al guardar**: el sistema no da por guardado el paquete sin foto e
  informa el error para reintentar sin perder los datos capturados.
- **Número de WhatsApp duplicado o mal formado**: se valida el formato (10 dígitos de México, con
  lada internacional al construir el enlace). Si el número ya pertenece a una clienta con cuenta,
  se avisa "Ya existe una cuenta con ese número" y se ofrece iniciar sesión o recuperar la
  contraseña; no se muestra ningún otro dato de esa clienta.
- **Registro con el WhatsApp de una clienta sin cuenta**: si la persona no escribe el código
  correcto, no se liga la cuenta y se le indica que pida su código a la recolectora; nunca se
  muestran datos de la clienta existente durante el intento.
- **Clienta que quiere eliminar su cuenta con pedidos en curso**: si tiene pedidos que no están
  entregados ni cancelados (hay paquetes o anticipos bajo custodia de la recolectora), la app no
  permite la eliminación y le pide contactar a la recolectora, quien decide cómo cerrarlos.
- **Clienta o bazar dados de baja temporal que inician sesión**: ven un aviso de que su cuenta está
  dada de baja y que deben contactar a la recolectora; no pueden crear ni modificar nada, salvo el
  bazar, que puede actualizar sus referencias (FR-028).
- **Avisos a clientas sin cuenta**: el mensaje de WhatsApp de paquete recibido no incluye enlace
  (no tienen dónde iniciar sesión); indica qué llegó y el conteo de paquetes.
- **Archivos demasiado grandes o de tipo no permitido**: se rechazan con un mensaje claro indicando
  tipos y tamaño máximo.

## Requirements *(mandatory)*

### Functional Requirements

**Cuentas y acceso**

- **FR-001**: El sistema MUST manejar tres roles: recolectora (administradora), clienta y bazar.
  Cada usuario tiene exactamente un rol.
- **FR-002**: Clientas y bazares MUST poder crear su cuenta e iniciar sesión con correo y
  contraseña, y recuperar su contraseña por correo.
- **FR-003**: La cuenta de la recolectora MUST crearse durante la instalación; no existe registro
  público de recolectoras.
- **FR-004**: Cada clienta y cada bazar MUST poder ver y modificar únicamente su propia información;
  la recolectora puede ver y administrar toda la información. Estas restricciones MUST cumplirse
  aun si alguien intenta acceder a los datos sin pasar por las pantallas.
- **FR-005**: El sistema MUST mostrar un aviso de privacidad accesible sin iniciar sesión, y los
  registros de clienta y bazar MUST requerir aceptarlo.

**Clientas**

- **FR-006**: El registro de clienta MUST pedir nombre, número de WhatsApp, dirección de envío,
  tipo (local o foránea), correo y contraseña.
- **FR-007**: El sistema MUST asignar a cada clienta un código único, corto, fácil de escribir a
  mano y de dictar, que no cambia y que se muestra de forma destacada en su cuenta.
- **FR-008**: La clienta MUST poder actualizar su dirección, WhatsApp y tipo; la recolectora MUST
  poder editar nombre, WhatsApp, dirección y tipo de cualquier clienta (con o sin cuenta). El código
  nunca cambia.

**Pedidos y pagos**

- **FR-009**: La clienta MUST poder registrar un pedido con: uno o más bazares (elegidos del
  directorio o escritos libremente si el bazar no está registrado), descripción de artículos y
  número de paquetes esperados (mínimo 1).
- **FR-010**: Al registrar el pedido, el sistema MUST mostrar el monto del pago inicial y los datos
  para realizarlo, ambos definidos por la recolectora, y permitir adjuntar el comprobante.
- **FR-011**: El pedido MUST manejar los estados: registrado, pago inicial pendiente, pago
  confirmado, recibiendo paquetes, completo, enviado, entregado, además de cancelado.
- **FR-012**: Las transiciones de estado MUST ser: registrado → pago inicial pendiente (al subir
  comprobante); registrado → pago confirmado (la recolectora anota un pago ya confirmado,
  FR-043); pago inicial pendiente → pago confirmado (recolectora confirma) o → registrado
  (recolectora rechaza con motivo); pago confirmado → recibiendo paquetes (primer paquete
  registrado); pago inicial pendiente → recibiendo paquetes (la recolectora confirma el pago de un
  pedido que ya tiene paquetes); recibiendo paquetes → completo (recolectora); completo → enviado
  (registro de envío); enviado → entregado (recolectora). Ninguna otra transición está permitida
  salvo la cancelación descrita en los casos límite.
- **FR-013**: El sistema MUST conservar el historial de cambios de estado y de comprobantes de cada
  pedido, con fecha, hora y quién hizo el cambio.
- **FR-014**: La clienta MUST poder ver el estado de cada pedido, los paquetes recibidos con su foto,
  el conteo recibidos/esperados y, una vez enviado, los datos del envío.
- **FR-015**: Los pagos MUST registrarse como elementos propios ligados al pedido (monto, concepto,
  comprobante, estado, método "transferencia/depósito manual"), de modo que en fases futuras puedan
  agregarse otros conceptos y métodos de pago sin cambiar los pedidos.

**Paquetes**

- **FR-016**: La recolectora MUST poder registrar un paquete desde el celular buscando a la clienta
  por código (y alternativamente por nombre o teléfono), eligiendo el pedido, indicando el bazar de
  origen, agregando una nota opcional y tomando una foto con la cámara del dispositivo. La foto es
  obligatoria para guardar el paquete.
- **FR-017**: El sistema MUST permitir registrar paquetes "sin pedido" (solo clienta) y
  "sin identificar", y asignarlos después a un pedido.
- **FR-018**: Al guardar un paquete, el sistema MUST abrir WhatsApp hacia el número de la clienta
  con un mensaje prellenado que indique el bazar de origen, el conteo recibidos/esperados y un enlace
  para ver la foto; el envío del mensaje lo confirma la recolectora manualmente. Si el paquete se
  registra "sin pedido", el mensaje usa una plantilla propia que indica el bazar de origen y le pide
  a la clienta registrar su pedido, con enlace a su cuenta; al asignarlo después a un pedido se
  genera el mensaje normal. Los paquetes "sin identificar" no generan mensaje.
- **FR-019**: El enlace del mensaje MUST llevar a la página del pedido dentro del sistema, que
  exige iniciar sesión; la foto se muestra solo a la clienta dueña del pedido y a la recolectora,
  mediante un enlace temporal que expira. Nunca se envía un enlace público permanente a la foto.

**Envíos**

- **FR-020**: La recolectora MUST poder marcar un pedido como completo; si los paquetes recibidos son
  menos que los esperados, el sistema MUST pedir confirmación.
- **FR-021**: El registro de envío MUST incluir tipo (paquetería, entrega en persona o recolección
  en persona), paquetería, número de guía y costo; paquetería y guía son obligatorias para el tipo
  "paquetería". Los tipos "entrega en persona" y "recolección en persona" solo están disponibles
  para clientas locales.
- **FR-022**: Al registrar el envío, el sistema MUST abrir WhatsApp hacia la clienta con un mensaje
  prellenado que incluya el tipo de envío y, si aplica, paquetería y número de guía.
- **FR-023**: El costo de envío MUST registrarse en el pedido y mostrarse a la clienta. En la
  fase 1 es solo informativo: el cobro se acuerda fuera del sistema y no bloquea el envío. Un pago
  con concepto "envío" podrá agregarse después usando la entidad Pago (FR-015).

**Bazares**

- **FR-024**: El registro de bazar MUST pedir: nombre, una o más marcas, link de su página o
  perfil, correo y contraseña; y como datos privados: foto de credencial, foto de la persona,
  comprobante de domicilio, comprobante de pago de registro y 3 referencias con nombre y teléfono.
  Las fotos públicas son opcionales: de 0 a 3.
- **FR-025**: El bazar MUST manejar los estados: pendiente de revisión, aprobado, rechazado y
  suspendido. Un registro enviado o reenviado queda en "pendiente de revisión". Además existen dos
  estados internos que no se muestran en el directorio: "registro incompleto" (cuenta creada, ficha
  aún no enviada) y "eliminado" (FR-048).
- **FR-026**: Además del propio bazar, solo la recolectora MUST poder ver las referencias de un
  bazar. Los archivos de documentos privados solo los MUST ver la recolectora (ni siquiera el bazar
  que los subió, FR-034), y siempre mediante enlaces temporales que expiran.
- **FR-027**: La recolectora MUST poder aprobar, rechazar (con motivo), suspender (con motivo) y
  reactivar bazares; el bazar MUST ver su estado y el motivo.
- **FR-028**: Un bazar MUST poder proponer cambios a sus datos públicos (nombre, marcas, link y
  fotos) según FR-029, subir documentos privados nuevos en cualquier momento según FR-032, y ver y
  actualizar sus referencias en cualquier momento, incluso si está suspendido (la recolectora ve la
  fecha de la última actualización); no puede registrar pedidos ni ver información de clientas.

**Moderación de la ficha pública**

- **FR-029**: Antes de la primera aprobación, los datos públicos se revisan junto con el registro.
  Después, cualquier cambio de un bazar aprobado a su nombre, marcas, link o fotos MUST quedar
  "en revisión" y no publicarse hasta que la recolectora lo autorice; si lo rechaza, MUST indicar
  un motivo que el bazar puede ver. Solo hay un cambio en revisión por bazar; uno nuevo reemplaza
  al anterior.
- **FR-030**: Las fotos que todavía no han sido autorizadas MUST NOT ser accesibles públicamente;
  solo el bazar que las subió y la recolectora pueden verlas.
- **FR-031**: El directorio MUST mostrar siempre la última versión autorizada de la ficha.

**Actualización de documentos del bazar**

- **FR-032**: Un bazar MUST poder subir en cualquier momento una nueva versión de cualquiera de sus
  cuatro documentos. Antes de la primera aprobación, los documentos se revisan junto con el
  registro. Después, cada documento nuevo MUST quedar "en revisión" mientras el anterior sigue
  siendo el vigente.
- **FR-033**: Al autorizar un documento nuevo, el sistema MUST convertirlo en el vigente y borrar
  definitivamente el anterior (archivo y registro). Al rechazarlo, MUST pedir un motivo que el
  bazar puede ver, conservar el vigente y borrar el archivo rechazado.
- **FR-034**: Solo puede haber un documento en revisión por tipo; si el bazar sube otro del mismo
  tipo, reemplaza y borra al que estaba en revisión. El bazar ve, por tipo, la fecha del vigente y
  el estado del nuevo ("En revisión" o "Rechazado" con motivo), sin poder abrir los archivos.

**Directorio público**

- **FR-035**: El directorio MUST ser accesible sin cuenta y mostrar solo bazares aprobados, con
  nombre, marcas, sus fotos autorizadas (0 a 3) y botón que abre su link en una pestaña nueva. Un
  bazar sin fotos se muestra como un recuadro con su información, sin imágenes.
- **FR-036**: El directorio MUST permitir buscar por nombre del bazar o por marca, sin distinguir
  mayúsculas ni acentos.
- **FR-037**: El directorio MUST NOT mostrar ningún dato privado de los bazares.

**Panel de administración**

- **FR-038**: La recolectora MUST tener un panel con listas de bazares, clientas, pedidos, pagos,
  paquetes y envíos, con contadores de pendientes (bazares por revisar, cambios de ficha por
  autorizar, documentos por autorizar, pagos por confirmar, paquetes sin asignar, pedidos completos
  por enviar).
- **FR-039**: Las listas del panel MUST permitir buscar y filtrar por clienta (nombre o código),
  bazar y estado.
- **FR-040**: La recolectora MUST poder configurar el monto del pago inicial, los datos para
  realizar el pago y las plantillas de los mensajes de WhatsApp. Las clientas solo pueden leer el
  monto y los datos para pagar; las plantillas solo las ve la recolectora; los bazares no ven la
  configuración.

**Clientas sin cuenta**

- **FR-041**: La recolectora MUST poder dar de alta una clienta sin cuenta con nombre, WhatsApp,
  dirección de envío y tipo; el sistema le asigna código único igual que a cualquier clienta.
- **FR-042**: La recolectora MUST poder registrar y editar pedidos a nombre de cualquier clienta
  (con o sin cuenta), con los mismos datos que FR-009.
- **FR-043**: La recolectora MUST poder anotar directamente un pago inicial como confirmado
  (monto y comprobante opcional), sin el paso de revisión, en pedidos que ella registra.
- **FR-044**: Una persona que se registra con el WhatsApp de una clienta sin cuenta MUST escribir
  el código de esa clienta para ligar la cuenta; al ligarse, conserva código, datos y pedidos. Sin
  el código correcto el registro se rechaza con un mensaje que no revela datos de la clienta. Si el
  WhatsApp ya pertenece a una clienta con cuenta, el registro se rechaza indicando que ya existe una
  cuenta con ese número. En ambos casos solo se revela que el número existe (excepción del
  principio III de la constitución).
- **FR-045**: Los mensajes de WhatsApp para clientas sin cuenta MUST omitir el enlace a la app.

**Eliminación y baja de cuentas**

- **FR-046**: Una clienta o un bazar MUST poder eliminar su propia cuenta desde la app, después de
  confirmarlo escribiendo una palabra de confirmación. Una clienta con pedidos que no estén
  entregados ni cancelados no puede eliminarla (ver casos límite).
- **FR-047**: La recolectora MUST poder eliminar los datos personales de cualquier clienta (con o
  sin cuenta) o bazar desde el panel, después de una confirmación explícita, aunque existan pedidos
  en curso (los cancela con motivo "datos eliminados").
- **FR-048**: Eliminar MUST borrar de forma definitiva: la cuenta de acceso; nombre, WhatsApp,
  dirección y correo; documentos privados, referencias, fotos públicas, propuestas de cambio y fotos
  sin autorizar del bazar; comprobantes de
  pago y fotos de paquetes de la clienta. Los pedidos, pagos, paquetes y envíos se conservan sin
  datos personales (por ejemplo, "Clienta eliminada") para no alterar el historial de la
  recolectora.
- **FR-049**: La recolectora MUST poder dar de baja temporal a una clienta o a un bazar y
  reactivarlos después. Mientras estén de baja: la clienta no puede crear ni modificar pedidos ni
  subir comprobantes, pero sí puede ver sus pedidos; el bazar no aparece en el directorio ni puede
  editar su ficha ni subir documentos, pero sí actualizar sus referencias. La baja temporal de un
  bazar es el estado "suspendido" (FR-027).
- **FR-050**: El aviso de privacidad MUST explicar cómo eliminar la cuenta desde la app y cómo
  pedirle a la recolectora la eliminación de los datos.

**Avisos de pago**

- **FR-051**: Al confirmar o rechazar un pago inicial (FR-012), el sistema MUST abrir WhatsApp
  hacia la clienta con un mensaje prellenado: de confirmación con el folio del pedido, o de rechazo
  con el motivo y la indicación de subir otro comprobante (con enlace al pedido si la clienta tiene
  cuenta, FR-045). No se genera aviso cuando la recolectora anota un pago ya confirmado (FR-043).

**Generales**

- **FR-052**: Todas las pantallas MUST poder usarse completamente desde un celular, y el sistema MUST
  poder instalarse en la pantalla de inicio del teléfono.
- **FR-053**: Todos los textos visibles MUST estar en español de México; fechas en formato
  dd/mm/aaaa y montos en pesos mexicanos.
- **FR-054**: Los archivos subidos MUST limitarse a imágenes (y PDF para comprobantes de pago y
  documentos de bazar) con un tamaño máximo definido, mostrando un mensaje claro cuando no se
  cumple.
- **FR-055**: Los mensajes de WhatsApp MUST generarse como enlaces que abren la conversación con el
  texto prellenado, de modo que en una fase futura puedan enviarse automáticamente sin cambiar el
  resto del flujo.

### Key Entities *(include if feature involves data)*

- **Usuario**: persona con acceso al sistema; correo, rol (recolectora, clienta, bazar).
- **Clienta**: nombre, WhatsApp, dirección de envío, tipo (local/foránea), código único, estado
  (activa, dada de baja temporal, eliminada); puede tener cuenta de usuario o no (alta hecha por
  la recolectora). Tiene muchos pedidos.
- **Bazar**: perfil de un usuario bazar; nombre, marcas, link, estado, motivo del último cambio de
  estado. Tiene de 0 a 3 fotos públicas autorizadas, documentos privados y 3 referencias.
- **Cambio de ficha de bazar**: propuesta de un bazar aprobado para cambiar nombre, marcas, link
  y fotos; estado (en revisión, autorizado, rechazado), motivo de rechazo y fechas. Como máximo
  uno en revisión por bazar.
- **Documento de bazar**: archivo privado de un bazar; tipo (credencial, foto de la persona,
  comprobante de domicilio, comprobante de pago); estado (en revisión, vigente, rechazado) y
  motivo de rechazo. Como máximo uno vigente y uno en revisión por tipo.
- **Referencia de bazar**: nombre y teléfono de una referencia.
- **Pedido**: pertenece a una clienta; bazares asociados (registrados o escritos libremente),
  descripción, paquetes esperados, estado, historial de estados.
- **Pago**: ligado a un pedido; concepto (pago inicial; en el futuro otros), monto, método,
  comprobante, estado (pendiente, confirmado, rechazado), motivo de rechazo.
- **Paquete**: recibido por la recolectora; clienta (o sin identificar), pedido (opcional), bazar de
  origen, foto, nota, fecha y hora de recepción.
- **Envío**: ligado a un pedido; tipo, paquetería, número de guía, costo, fecha.
- **Notificación**: registro de cada mensaje generado para la clienta (motivo: paquete recibido,
  paquete sin pedido, pago confirmado, pago rechazado o pedido enviado; texto, fecha y canal
  "WhatsApp manual"), para permitir en el futuro el envío automático.
- **Configuración**: monto del pago inicial, datos para pagar, plantillas de mensajes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La recolectora registra un paquete (búsqueda por código, foto y guardado hasta abrir
  WhatsApp) en menos de 1 minuto desde su celular.
- **SC-002**: Una clienta nueva completa su registro y su primer pedido con comprobante en menos de
  5 minutos.
- **SC-003**: El 100% de los paquetes registrados quedan asociados a una clienta o marcados como
  "sin identificar"; ninguno se pierde sin registro.
- **SC-004**: En cualquier momento, la recolectora puede responder "¿qué ha llegado del pedido de
  esta clienta?" en menos de 30 segundos.
- **SC-005**: Ningún documento privado de bazar, comprobante de pago o foto de paquete es
  accesible para una persona sin permiso, verificado con pruebas de acceso por cada rol.
- **SC-006**: Una visitante encuentra un bazar en el directorio buscando por marca en menos de
  30 segundos.
- **SC-007**: El sistema funciona sin degradación perceptible con alrededor de 1,000 usuarios
  registrados.
- **SC-008**: La recolectora completa sus tareas diarias (revisar pagos, registrar paquetes,
  registrar envíos) usando solo su celular, sin necesidad de computadora.

## Assumptions

- **Pendientes de confirmar con la clienta** (se toman como verdaderos para esta fase):
  - El pago inicial es un anticipo del servicio y su monto lo define la recolectora (configurable).
  - El comprobante de pago del bazar corresponde a una cuota de registro.
  - Las clientas (y los bazares) inician sesión con correo y contraseña.
  - Los bazares no registran pedidos ni ven información de las clientas.
- Existe una sola recolectora (una cuenta administradora) en la fase 1.
- Las clientas no requieren aprobación para crear su cuenta.
- El pago inicial se hace por transferencia o depósito fuera del sistema; el sistema solo registra
  el comprobante y la confirmación.
- Un pedido puede incluir compras de varios bazares; un bazar no registrado puede escribirse como
  texto libre en el pedido.
- La marca de "completo" es una decisión de la recolectora; el conteo de paquetes es solo una guía.
- El número de WhatsApp es de México (10 dígitos).
- Las clientas y la recolectora tienen WhatsApp instalado en su teléfono.
- Los documentos vigentes de bazares (incluidos los de bazares rechazados) se conservan mientras
  exista la cuenta y se borran al eliminarla (FR-048); los documentos reemplazados o rechazados se
  borran al momento (FR-033). No hay borrado automático por tiempo en la fase 1.
- **Fuera de alcance en la fase 1**: envío automático de mensajes con la API de WhatsApp; pagos en
  línea con tarjeta, OXXO o SPEI; aplicación nativa en tiendas de apps; reportes y estadísticas.
