"use client";

import {
  BanknoteIcon,
  ClipboardListIcon,
  HomeIcon,
  MenuIcon,
  PackagePlusIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon };

/** Thumb-reachable bottom bar on phones; the package screen is one tap away (constitution IV). */
const PRIMARY: Item[] = [
  { href: "/admin", label: "Panel", icon: HomeIcon },
  { href: "/admin/paquetes/nuevo", label: "Paquete", icon: PackagePlusIcon },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardListIcon },
  { href: "/admin/pagos", label: "Pagos", icon: BanknoteIcon },
];

const MORE: { href: string; label: string }[] = [
  { href: "/admin/paquetes", label: "Paquetes" },
  { href: "/admin/clientas", label: "Clientas" },
  { href: "/admin/bazares", label: "Bazares" },
  { href: "/admin/envios", label: "Envíos" },
  { href: "/admin/configuracion", label: "Configuración" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/admin/paquetes") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ signOut }: { signOut: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label="Secciones"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid h-16 max-w-3xl grid-cols-5">
        {PRIMARY.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "text-muted-foreground flex h-full flex-col items-center justify-center gap-1 text-xs",
                "aria-[current=page]:text-primary aria-[current=page]:font-semibold",
              )}
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1 text-xs">
              <MenuIcon className="size-6" aria-hidden />
              Más
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Más secciones</SheetTitle>
              </SheetHeader>
              <ul className="grid gap-1 px-4 pb-4">
                {MORE.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={
                        isActive(pathname, href) ? "page" : undefined
                      }
                      className="hover:bg-muted aria-[current=page]:bg-muted flex h-11 items-center rounded-lg px-3"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
                <li>{signOut}</li>
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
