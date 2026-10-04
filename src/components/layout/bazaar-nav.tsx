import { Brand } from "./brand";
import { SignOutButton } from "./sign-out-button";

export function BazaarNav() {
  return (
    <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
        <Brand href="/bazar" />
        <SignOutButton />
      </div>
    </header>
  );
}
