import { PackageIcon } from "lucide-react";
import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2 font-semibold">
      <PackageIcon className="text-primary size-5" aria-hidden />
      Recolectora
    </Link>
  );
}
