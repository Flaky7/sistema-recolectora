import { describe, expect, it } from "vitest";

import {
  buildOrderShippedMessage,
  buildPackageReceivedMessage,
  buildPackageUnassignedMessage,
  buildPaymentConfirmedMessage,
  buildPaymentRejectedMessage,
  renderTemplate,
  validateTemplate,
} from "@/lib/notifications/messages";
import {
  buildWhatsAppUrl,
  whatsappLinkChannel,
} from "@/lib/notifications/whatsapp-link";

// Same default texts as supabase/migrations/20261004000700_settings.sql.
const TEMPLATES = {
  package_received:
    "¡Hola {nombre}! 📦 Recibimos un paquete de {bazar} para tu pedido #{folio}.\nLlevas {recibidos} de {esperados} paquetes.\nVe la foto aquí: {enlace}",
  package_unassigned:
    "¡Hola {nombre}! 📦 Recibimos un paquete de {bazar} a tu nombre, pero aún no tienes un pedido registrado.\nRegístralo en la app para que lo asignemos: {enlace}",
  payment_confirmed:
    "¡Hola {nombre}! ✅ Confirmamos tu pago de {monto} para el pedido #{folio}.\nYa puedes pedir a los bazares que envíen tus paquetes con tu código.\nVer tu pedido: {enlace}",
  payment_rejected:
    "Hola {nombre}, no pudimos confirmar el pago de tu pedido #{folio}.\nMotivo: {motivo}\nPor favor sube un nuevo comprobante: {enlace}",
  order_shipped:
    "¡Hola {nombre}! 🚚 Tu pedido #{folio} ya salió: {tipo}.\nPaquetería: {paqueteria}\nNúmero de guía: {guia}\nCosto de envío: {costo}",
};

const LINK = "https://recolectora.example/mi-cuenta/pedidos/12";

describe("renderTemplate", () => {
  it("replaces variables", () => {
    expect(renderTemplate("Hola {nombre}", { nombre: "Ana" })).toBe("Hola Ana");
  });

  it("removes a line whose variable has no value", () => {
    expect(
      renderTemplate("Hola {nombre}\nEnlace: {enlace}", {
        nombre: "Ana",
        enlace: null,
      }),
    ).toBe("Hola Ana");
    expect(renderTemplate("A\nB: {x}\nC", { x: "  " })).toBe("A\nC");
  });
});

describe("validateTemplate", () => {
  it("accepts the default templates", () => {
    for (const [kind, template] of Object.entries(TEMPLATES)) {
      expect(
        validateTemplate(kind as keyof typeof TEMPLATES, template),
      ).toEqual({ valid: true });
    }
  });

  it("rejects unknown variables and empty templates", () => {
    expect(
      validateTemplate("payment_confirmed", "Hola {nombre}, guía {guia}"),
    ).toEqual({
      valid: false,
      unknown: ["guia"],
      empty: false,
    });
    expect(validateTemplate("payment_confirmed", "  ")).toMatchObject({
      valid: false,
      empty: true,
    });
  });
});

describe("message builders", () => {
  it("package received, with link", () => {
    const body = buildPackageReceivedMessage(TEMPLATES.package_received, {
      customerName: "Laura",
      bazarName: "Bazar Ñandú",
      received: 2,
      expected: 3,
      folio: 12,
      link: LINK,
    });
    expect(body).toBe(
      `¡Hola Laura! 📦 Recibimos un paquete de Bazar Ñandú para tu pedido #12.\nLlevas 2 de 3 paquetes.\nVe la foto aquí: ${LINK}`,
    );
  });

  it("package received, customer without account has no link line", () => {
    const body = buildPackageReceivedMessage(TEMPLATES.package_received, {
      customerName: "Rosa",
      bazarName: "Bazar Ñandú",
      received: 1,
      expected: 1,
      folio: 7,
      link: null,
    });
    expect(body).not.toContain("Ve la foto");
    expect(body.split("\n")).toHaveLength(2);
  });

  it("package without order links to the account", () => {
    const body = buildPackageUnassignedMessage(TEMPLATES.package_unassigned, {
      customerName: "Laura",
      bazarName: "Bazar Ñandú",
      link: "https://recolectora.example/mi-cuenta",
    });
    expect(body).toContain("aún no tienes un pedido registrado");
    expect(body).toContain("https://recolectora.example/mi-cuenta");
  });

  it("payment confirmed shows the amount in pesos", () => {
    const body = buildPaymentConfirmedMessage(TEMPLATES.payment_confirmed, {
      customerName: "Laura",
      folio: 12,
      amountCents: 15000,
      link: LINK,
    });
    expect(body).toContain("$150.00");
    expect(body).toContain(LINK);
  });

  it("payment rejected includes the reason", () => {
    const body = buildPaymentRejectedMessage(TEMPLATES.payment_rejected, {
      customerName: "Laura",
      folio: 12,
      reason: "El comprobante no es legible",
      link: LINK,
    });
    expect(body).toContain("Motivo: El comprobante no es legible");
  });

  it("shipment by carrier includes carrier, tracking and cost", () => {
    const body = buildOrderShippedMessage(TEMPLATES.order_shipped, {
      customerName: "Fernanda",
      folio: 3,
      type: "carrier",
      carrier: "Estafeta",
      trackingNumber: "ABC123",
      costCents: 18900,
    });
    expect(body).toBe(
      "¡Hola Fernanda! 🚚 Tu pedido #3 ya salió: envío por paquetería.\nPaquetería: Estafeta\nNúmero de guía: ABC123\nCosto de envío: $189.00",
    );
  });

  it.each([
    ["local_delivery", "entrega en persona"],
    ["local_pickup", "recolección en persona"],
  ] as const)("shipment %s omits carrier and tracking lines", (type, text) => {
    const body = buildOrderShippedMessage(TEMPLATES.order_shipped, {
      customerName: "Laura",
      folio: 4,
      type,
      carrier: "Ignorada",
      trackingNumber: "Ignorada",
      costCents: 0,
    });
    expect(body).toContain(`ya salió: ${text}.`);
    expect(body).not.toContain("Paquetería");
    expect(body).not.toContain("guía");
    expect(body).toContain("Costo de envío: $0.00");
  });
});

describe("wa.me link", () => {
  it("encodes emojis, accents and line breaks", () => {
    const url = buildWhatsAppUrl("664 123 4567", "¡Hola! 📦\nPaquete #1");
    expect(url.startsWith("https://wa.me/526641234567?text=")).toBe(true);
    const text = new URL(url).searchParams.get("text");
    expect(text).toBe("¡Hola! 📦\nPaquete #1");
    expect(url).not.toContain(" ");
    expect(url).not.toContain("\n");
  });

  it("channel returns an open_url result", async () => {
    await expect(
      whatsappLinkChannel.deliver({
        kind: "package_received",
        toPhone: "6641234567",
        body: "Hola",
      }),
    ).resolves.toEqual({
      kind: "open_url",
      url: "https://wa.me/526641234567?text=Hola",
    });
  });
});
