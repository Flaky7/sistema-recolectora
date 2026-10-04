import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROLE_HOME } from "@/lib/auth/roles";
import { getSessionProfile } from "@/lib/auth/session";

import { Brand } from "./brand";

export async function PublicNav() {
  const profile = await getSessionProfile();
  return (
    <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Brand />
        <nav className="flex items-center gap-1">
          {profile ? (
            <Button asChild size="lg">
              <Link href={ROLE_HOME[profile.role]}>Mi cuenta</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="lg">
                <Link href="/registro/clienta">Soy clienta</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/entrar">Entrar</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
