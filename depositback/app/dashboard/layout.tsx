import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader session={session} />
        <main id="main-content" className="flex-1 overflow-y-auto px-5 pt-8 pb-16 sm:px-8 lg:px-12 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
