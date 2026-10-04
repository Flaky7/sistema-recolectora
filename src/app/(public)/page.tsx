import { StoreIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BazaarCard } from "@/components/bazaar-card";
import { Button } from "@/components/ui/button";
import { DirectorySearch } from "@/features/directory/components/directory-search";
import { searchDirectory } from "@/features/directory/queries";

export default async function DirectoryPage({ searchParams }: PageProps<"/">) {
  const { q, cuenta } = await searchParams;
  const term = typeof q === "string" ? q : "";
  const bazaars = await searchDirectory(term);

  return (
    <div className="space-y-6">
      {cuenta === "eliminada" ? (
        <p role="status" className="bg-muted rounded-lg p-3">
          Tu cuenta y tus datos personales fueron eliminados.
        </p>
      ) : null}
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Directorio de bazares
        </h1>
        <p className="text-muted-foreground">
          Compra en tus bazares favoritos de Facebook; nosotros recibimos tus
          paquetes y te los enviamos juntos.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <Button asChild variant="outline" size="touch">
            <Link href="/registro/clienta">
              <UserIcon aria-hidden />
              Soy clienta
            </Link>
          </Button>
          <Button asChild variant="outline" size="touch">
            <Link href="/registro/bazar">
              <StoreIcon aria-hidden />
              Registrar mi bazar
            </Link>
          </Button>
        </div>
      </section>

      <Suspense>
        <DirectorySearch />
      </Suspense>

      {bazaars.length === 0 ? (
        <p
          role="status"
          className="text-muted-foreground rounded-xl border border-dashed p-8 text-center"
        >
          {term
            ? "No encontramos bazares con esa búsqueda."
            : "Todavía no hay bazares en el directorio."}
        </p>
      ) : (
        <ul
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Bazares"
        >
          {bazaars.map((bazaar) => (
            <li key={bazaar.id}>
              <BazaarCard
                name={bazaar.name}
                brands={bazaar.brands}
                linkUrl={bazaar.linkUrl}
                photoUrls={bazaar.photoUrls}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
