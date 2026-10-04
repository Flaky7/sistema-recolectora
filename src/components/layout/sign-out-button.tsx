import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut} className={className}>
      <Button type="submit" variant="ghost" size="lg" className="w-full justify-start">
        <LogOutIcon aria-hidden />
        Salir
      </Button>
    </form>
  );
}
