import type { Metadata } from "next";

import { SettingsForm } from "@/features/settings/components/settings-form";
import { getSettings } from "@/features/settings/queries";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const settings = await getSettings();
  if (!settings) {
    return (
      <p className="text-destructive">No se pudo cargar la configuración.</p>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <SettingsForm
        defaults={{
          initialDepositCents: settings.initial_deposit_cents,
          paymentInstructions: settings.payment_instructions,
          templatePackageReceived: settings.template_package_received,
          templatePackageUnassigned: settings.template_package_unassigned,
          templatePaymentConfirmed: settings.template_payment_confirmed,
          templatePaymentRejected: settings.template_payment_rejected,
          templateOrderShipped: settings.template_order_shipped,
        }}
      />
    </div>
  );
}
