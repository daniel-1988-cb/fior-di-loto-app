import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-[70px]">
        <div className="mx-auto max-w-7xl px-4 py-6 pt-16 pb-20 sm:px-6 sm:pb-6 lg:px-8 lg:pt-6 lg:pb-6">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
