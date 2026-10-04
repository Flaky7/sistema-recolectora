import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Cómo tratamos tus datos personales en Sistema Recolectora.",
};

// FICTITIOUS controller data (T150): replace with the client's real name, address and contact
// before going to production. Keep the structure: it covers FR-005 and FR-050.
const CONTROLLER = {
  name: "María Ejemplo Ficticia",
  address: "Calle Ejemplo 123, Col. Centro, Tijuana, B.C., C.P. 22000",
  contact: "privacidad@ejemplo.com",
};

export default function PrivacyNoticePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <article className="space-y-6 text-base leading-relaxed">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Aviso de privacidad</h1>
          <p className="text-muted-foreground text-sm">
            Última actualización: 04/10/2026
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            ¿Quién es responsable de tus datos?
          </h2>
          <p>
            {CONTROLLER.name}, con domicilio en {CONTROLLER.address}, es
            responsable del uso y protección de tus datos personales en Sistema
            Recolectora.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">¿Qué datos recabamos?</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Clientas:</strong> nombre, número de WhatsApp, dirección
              de envío, correo, comprobantes de pago y fotos de los paquetes que
              recibimos a tu nombre.
            </li>
            <li>
              <strong>Bazares:</strong> nombre del bazar, marcas, link de su
              página, fotos para el directorio, correo, foto de credencial, foto
              de la persona, comprobante de domicilio, comprobante de pago de
              registro y tres referencias con nombre y teléfono.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">¿Para qué los usamos?</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Recibir tus compras, avisarte por WhatsApp lo que llega y enviarte
              tu pedido.
            </li>
            <li>Confirmar tus pagos.</li>
            <li>
              Verificar la identidad de los bazares antes de mostrarlos en el
              directorio.
            </li>
          </ul>
          <p>
            No vendemos ni compartimos tus datos con otras personas o empresas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">¿Quién puede ver tus datos?</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Tus documentos, comprobantes de pago y referencias solo los ve la
              recolectora. Nunca se publican; se consultan con enlaces
              temporales que caducan en minutos.
            </li>
            <li>
              El directorio público solo muestra el nombre del bazar, sus
              marcas, sus fotos autorizadas y el link a su página.
            </li>
            <li>
              Las fotos de tus paquetes solo las ves tú, con tu sesión iniciada,
              y la recolectora.
            </li>
            <li>
              Al registrarte, si tu número de WhatsApp ya está dado de alta, el
              sistema te lo indicará para que inicies sesión o escribas tu
              código de clienta. No muestra ningún otro dato.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            ¿Cómo elimino mi cuenta y mis datos?
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Desde la app:</strong> entra a tu cuenta y usa la opción
              &quot;Eliminar mi cuenta&quot;. Se borran tu cuenta, tus datos de
              contacto, tus documentos, comprobantes y fotos. Si tienes pedidos
              en curso, primero contacta a la recolectora.
            </li>
            <li>
              <strong>Con la recolectora:</strong> escribe a{" "}
              {CONTROLLER.contact} para pedir la eliminación de tus datos.
            </li>
            <li>
              Para no alterar el historial del negocio, los pedidos se conservan
              sin datos personales (por ejemplo, &quot;Clienta eliminada&quot;).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Tus derechos</h2>
          <p>
            Puedes acceder a tus datos, corregirlos, cancelarlos u oponerte a su
            uso (derechos ARCO) escribiendo a {CONTROLLER.contact}. Te
            responderemos en un plazo máximo de 20 días hábiles.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Cambios a este aviso</h2>
          <p>
            Si este aviso cambia, publicaremos la nueva versión en esta misma
            página.
          </p>
        </section>
      </article>
    </main>
  );
}
