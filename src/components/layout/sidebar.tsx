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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brown transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose">
              <span className="font-[family-name:var(--font-playfair)] text-lg font-bold text-white">
                F
              </span>
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-cream">
                Fior di Loto
              </h1>
              <p className="text-xs text-cream/60">Centro Estetico</p>
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
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-rose text-white"
                    : "text-cream/70 hover:bg-brown-light hover:text-cream"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-cream/10 p-3">
          <Link
            href="/impostazioni"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream/70 hover:bg-brown-light hover:text-cream"
          >
            <Settings className="h-5 w-5" />
            {LABELS.nav.impostazioni}
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cream/70 hover:bg-brown-light hover:text-cream"
            >
              <LogOut className="h-5 w-5" />
              Esci
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
