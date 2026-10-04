"use client";

import { ImageOffIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { formatDateTime } from "@/lib/format";

import { getPackagePhotoUrl } from "../actions";

export type GalleryPackage = {
  id: string;
  received_at: string;
  bazaar_name: string | null;
  note: string | null;
};

type PhotoState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

/**
 * Package photos through 60-minute signed links created with the viewer's own session, so only
 * the owner customer and the collector can see them (FR-019, SC-005).
 */
export function PackageGallery({
  packages,
  renderActions,
}: {
  packages: GalleryPackage[];
  /** Extra controls per package (collector: move to another order). */
  renderActions?: (pkg: GalleryPackage) => ReactNode;
}) {
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});

  useEffect(() => {
    let cancelled = false;
    for (const pkg of packages) {
      getPackagePhotoUrl(pkg.id).then((result) => {
        if (cancelled) return;
        setPhotos((current) => ({
          ...current,
          [pkg.id]: result.ok
            ? { status: "ready", url: result.data.signedUrl }
            : { status: "error" },
        }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [packages]);

  if (packages.length === 0) {
    return (
      <p className="text-muted-foreground">Aún no llega ningún paquete.</p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {packages.map((pkg, index) => {
        const photo = photos[pkg.id] ?? { status: "loading" };
        return (
          <li key={pkg.id} className="overflow-hidden rounded-xl border">
            <div className="bg-muted relative aspect-square">
              {photo.status === "ready" ? (
                <a
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ver foto del paquete ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                  <img
                    src={photo.url}
                    alt={`Paquete ${index + 1} de ${pkg.bazaar_name ?? "bazar desconocido"}`}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="text-muted-foreground flex size-full items-center justify-center">
                  {photo.status === "loading" ? (
                    <Loader2Icon
                      className="size-6 animate-spin"
                      aria-label="Cargando foto"
                    />
                  ) : (
                    <ImageOffIcon
                      className="size-6"
                      aria-label="Foto no disponible"
                    />
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1 p-2 text-sm">
              <p className="font-medium">
                {pkg.bazaar_name ?? "Bazar desconocido"}
              </p>
              <p className="text-muted-foreground">
                {formatDateTime(pkg.received_at)}
              </p>
              {pkg.note ? <p>{pkg.note}</p> : null}
              {renderActions?.(pkg)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
