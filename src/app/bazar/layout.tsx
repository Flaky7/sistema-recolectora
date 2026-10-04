import { BazaarNav } from "@/components/layout/bazaar-nav";
import { requireRole } from "@/lib/auth/session";

export default async function BazaarLayout({
  children,
}: LayoutProps<"/bazar">) {
  await requireRole("bazaar");
  return (
    <>
      <BazaarNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
