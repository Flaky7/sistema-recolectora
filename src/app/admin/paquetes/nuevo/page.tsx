import type { Metadata } from "next";

import { PackageReception } from "@/features/packages/components/package-reception";

export const metadata: Metadata = { title: "Registrar paquete" };

export default function NewPackagePage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Registrar paquete</h1>
      <PackageReception />
    </div>
  );
}
