"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

/** Updates ?q= 300 ms after the visitor stops typing (T127). */
export function DirectorySearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const [value, setValue] = useState(initial);
  const lastPushed = useRef(initial);

  useEffect(() => {
    const term = value.trim();
    if (term === lastPushed.current) return;
    const timer = setTimeout(() => {
      lastPushed.current = term;
      const params = new URLSearchParams(searchParams);
      if (term) params.set("q", term);
      else params.delete("q");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative">
      <SearchIcon
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
        aria-hidden
      />
      <label htmlFor="directory-search" className="sr-only">
        Buscar por bazar o marca
      </label>
      <Input
        id="directory-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Busca por bazar o marca, por ejemplo: Zara"
        className="pl-10"
        autoComplete="off"
        enterKeyHint="search"
      />
    </div>
  );
}
