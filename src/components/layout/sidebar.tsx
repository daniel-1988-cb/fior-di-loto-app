"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  MessageCircle,
  Share2,
  Scissors,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Bot,
  Gift,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LABELS } from "@/lib/constants/italian";

const navigation = [
  { name: LABELS.nav.dashboard, href: "/", icon: LayoutDashboard },
  { name: LABELS.nav.clienti, href: "/clienti", icon: Users },
  { name: LABELS.nav.agenda, href: "/agenda", icon: Calendar },
  { name: LABELS.nav.servizi, href: "/servizi", icon: Scissors },
  { name: LABELS.nav.prodotti, href: "/prodotti", icon: Package },
  { name: LABELS.nav.gestionale, href: "/gestionale", icon: BarChart3 },
  { name: LABELS.nav.whatsapp, href: "/whatsapp", icon: MessageCircle },
  { name: "Voucher", href: "/gestionale/voucher", icon: Gift },
  { name: LABELS.nav.social, href: "/social", icon: Share2 },
  { name: LABELS.nav.assistente, href: "/assistente", icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-brown p-2 text-cream shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — full width on mobile, compact on desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-brown transition-transform duration-300",
          "w-64 lg:w-[70px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 lg:justify-center">
          <Link href="/" className="flex items-center gap-3 lg:gap-0" onClick={() => setMobileOpen(false)}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose">
              <span className="font-[family-name:var(--font-playfair)] text-base font-bold text-white">
                F
              </span>
            </div>
            <div className="lg:hidden">
              <h1 className="font-[family-name:var(--font-playfair)] text-base font-semibold text-cream">
                Fior di Loto
              </h1>
              <p className="text-[10px] text-cream/60">Centro Estetico</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-cream/60 hover:text-cream lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    "lg:justify-center lg:px-0 lg:py-2.5",
                    isActive
                      ? "bg-rose text-white"
                      : "text-cream/70 hover:bg-white/10 hover:text-cream"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="lg:hidden">{item.name}</span>
                </Link>

                {/* Tooltip — desktop only */}
                <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 lg:group-hover:block">
                  <div className="whitespace-nowrap rounded-md bg-brown-dark px-2.5 py-1 text-xs font-medium text-cream shadow-lg">
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-brown-dark" />
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-cream/10 px-2 py-3 space-y-1">
          <div className="group relative">
            <Link
              href="/impostazioni"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream/70 hover:bg-white/10 hover:text-cream lg:justify-center lg:px-0"
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span className="lg:hidden">{LABELS.nav.impostazioni}</span>
            </Link>
            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 lg:group-hover:block">
              <div className="whitespace-nowrap rounded-md bg-brown-dark px-2.5 py-1 text-xs font-medium text-cream shadow-lg">
                {LABELS.nav.impostazioni}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-brown-dark" />
              </div>
            </div>
          </div>

          <form action="/api/auth/logout" method="POST">
            <div className="group relative">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream/70 hover:bg-white/10 hover:text-cream lg:justify-center lg:px-0"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="lg:hidden">Esci</span>
              </button>
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 lg:group-hover:block">
                <div className="whitespace-nowrap rounded-md bg-brown-dark px-2.5 py-1 text-xs font-medium text-cream shadow-lg">
                  Esci
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-brown-dark" />
                </div>
              </div>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}
