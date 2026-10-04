import { CustomerNav } from "@/components/layout/customer-nav";
import { requireRole } from "@/lib/auth/session";

export default async function CustomerLayout({
  children,
}: LayoutProps<"/mi-cuenta">) {
  await requireRole("customer");
  return (
    <>
      <CustomerNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
