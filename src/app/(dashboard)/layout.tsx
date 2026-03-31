import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <Sidebar />
      <main className="lg:pl-[70px]">
        <div className="mx-auto max-w-7xl px-4 py-6 pt-16 sm:px-6 lg:px-8 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
