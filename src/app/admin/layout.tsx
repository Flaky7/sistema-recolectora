import { AdminNav } from "@/components/layout/admin-nav";
import { Brand } from "@/components/layout/brand";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole("collector");
  return (
    <>
      <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Brand href="/admin" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24">{children}</main>
      <AdminNav signOut={<SignOutButton />} />
    </>
  );
}
