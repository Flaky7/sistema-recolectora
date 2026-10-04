"use client";

import { useState } from "react";

import { AssignPackage } from "./assign-package";
import { PackageGallery } from "./package-gallery";

type Item = {
  id: string;
  received_at: string;
  bazaar_name: string | null;
  note: string | null;
  customer: { code: string; full_name: string } | null;
};

/**
 * Packages without order or unidentified. The list keeps the items it opened with, so the one
 * just assigned stays on screen with its WhatsApp button after the server data refreshes.
 */
export function PendingPackagesList({ packages }: { packages: Item[] }) {
  const [items] = useState(packages);
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center">
        No hay paquetes en esta lista.
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {items.map((pkg) => (
        <li key={pkg.id} className="space-y-2 rounded-xl border p-3">
          <p className="font-medium">
            {pkg.customer
              ? `${pkg.customer.full_name} · ${pkg.customer.code}`
              : "Sin identificar"}
          </p>
          <PackageGallery packages={[pkg]} />
          <AssignPackage
            packageId={pkg.id}
            customerCode={pkg.customer?.code ?? null}
          />
        </li>
      ))}
    </ul>
  );
}
