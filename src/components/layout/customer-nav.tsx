import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { Brand } from "./brand";
import { SignOutButton } from "./sign-out-button";

export function CustomerNav() {
  return (
    <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
        <Brand href="/mi-cuenta" />
        <nav className="flex items-center gap-1">
          <Button asChild size="lg">
            <Link href="/mi-cuenta/pedidos/nuevo">
              <PlusIcon aria-hidden />
              <span className="sr-only sm:not-sr-only">Nuevo pedido</span>
            </Link>
          </Button>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
