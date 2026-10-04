import { ExternalLinkIcon, StoreIcon } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BazaarCardProps = {
  name: string;
  brands: string[];
  linkUrl: string;
  /** 0 to 3 public photo URLs, already authorized (FR-031, FR-035). */
  photoUrls: string[];
  className?: string;
};

/**
 * Directory card (US6), also used as preview for the bazaar (US4) and the collector (US5).
 * Without photos it renders a box with the information only (FR-035).
 */
export function BazaarCard({
  name,
  brands,
  linkUrl,
  photoUrls,
  className,
}: BazaarCardProps) {
  return (
    <article
      className={cn("bg-card overflow-hidden rounded-xl border", className)}
    >
      {photoUrls.length > 0 ? (
        <div
          className="flex snap-x snap-mandatory overflow-x-auto"
          aria-label={`Fotos de ${name}`}
        >
          {photoUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square w-full shrink-0 snap-center"
            >
              <Image
                src={url}
                alt={`${name}, foto ${index + 1} de ${photoUrls.length}`}
                fill
                // Photos are compressed on upload; skipping optimization keeps hosting costs low.
                unoptimized
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          {photoUrls.length === 0 ? (
            <StoreIcon
              className="text-muted-foreground mt-0.5 size-5 shrink-0"
              aria-hidden
            />
          ) : null}
          <h3 className="text-lg leading-tight font-semibold">{name}</h3>
        </div>
        {photoUrls.length > 1 ? (
          <p className="text-muted-foreground text-xs">
            Desliza para ver {photoUrls.length} fotos
          </p>
        ) : null}
        <ul className="flex flex-wrap gap-1.5" aria-label="Marcas">
          {brands.map((brand) => (
            <li key={brand}>
              <Badge variant="secondary">{brand}</Badge>
            </li>
          ))}
        </ul>
        <Button asChild size="touch" className="w-full">
          <a href={linkUrl} target="_blank" rel="noopener noreferrer">
            Ver su página
            <ExternalLinkIcon aria-hidden />
          </a>
        </Button>
      </div>
    </article>
  );
}
