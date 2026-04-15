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
  Gift,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LABELS } from "@/lib/constants/italian";

const navigation = [
  { name: LABELS.nav.dashboard, href: "/", icon: LayoutDashboard },
  { name: LABELS.nav.agenda, href: "/agenda", icon: Calendar },
  { name: LABELS.nav.clienti, href: "/clienti", icon: Users },
  { name: LABELS.nav.servizi, href: "/servizi", icon: Scissors },
  { name: LABELS.nav.prodotti, href: "/prodotti", icon: Package },
  { name: LABELS.nav.gestionale, href: "/gestionale", icon: BarChart3 },
  { name: "Voucher", href: "/gestionale/voucher", icon: Gift },
  { name: LABELS.nav.whatsapp, href: "/whatsapp", icon: MessageCircle },
  { name: LABELS.nav.social, href: "/social", icon: Share2 },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "light") root.classList.add("light");
    else if (theme === "dark") root.classList.add("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === "system" ? "dark" : t === "dark" ? "light" : "system");
  return { theme, toggle };
}

function LotusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="12" rx="3.2" ry="9" fill="currentColor" opacity="0.95" />
      <ellipse cx="16" cy="12" rx="3.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(-28 16 16)" />
      <ellipse cx="16" cy="12" rx="3.2" ry="9" fill="currentColor" opacity="0.45" transform="rotate(-56 16 16)" />
      <ellipse cx="16" cy="12" rx="3.2" ry="9" fill="currentColor" opacity="0.7" transform="rotate(28 16 16)" />
      <ellipse cx="16" cy="12" rx="3.2" ry="9" fill="currentColor" opacity="0.45" transform="rotate(56 16 16)" />
      <circle cx="16" cy="15" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function NavItem({
  href, icon: Icon, label, active, onClick,
}: {
  href: string; icon: React.ElementType; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
          "lg:justify-center lg:px-0 lg:py-3",
          active
            ? "text-gold"
            : "text-sidebar-foreground/50 hover:text-sidebar-foreground/90"
        )}
      >
        {/* Active left bar — gold brand */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-gold lg:left-0" />
        )}
        {/* Active background pill on desktop */}
        {active && (
          <span className="absolute inset-0 lg:inset-x-1 lg:inset-y-0.5 rounded-lg bg-gold/10" />
        )}
        <Icon className="relative h-5 w-5 shrink-0" />
        <span className="relative lg:hidden">{label}</span>
      </Link>
      {/* Tooltip desktop */}
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 lg:group-hover:block">
        <div className="whitespace-nowrap rounded-md bg-brown px-2.5 py-1 text-xs font-medium text-white shadow-lg">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-brown" />
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 left-3.5 z-50 rounded-lg bg-sidebar p-2 text-sidebar-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={close} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-transform duration-200",
          "w-60 lg:w-[56px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo — Lotus Brand */}
        <div className="flex h-14 items-center justify-between px-3 lg:justify-center lg:px-0 lg:h-16">
          <Link href="/" onClick={close} className="flex items-center gap-3 lg:gap-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <LotusIcon className="h-8 w-8 text-gold" />
            </div>
            <span className="font-display text-base font-bold text-sidebar-foreground lg:hidden">Fior di Loto</span>
          </Link>
          <button onClick={close} className="text-sidebar-foreground/40 hover:text-sidebar-foreground lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-sidebar-foreground/10 lg:mx-2" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <NavItem key={item.href} href={item.href} icon={item.icon} label={item.name} active={active} onClick={close} />
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-3 h-px bg-sidebar-foreground/10 lg:mx-2" />

        {/* Bottom actions */}
        <div className="py-2">
          <NavItem href="/impostazioni" icon={Settings} label={LABELS.nav.impostazioni} active={pathname.startsWith("/impostazioni")} onClick={close} />

          {/* Theme toggle */}
          <div className="group relative">
            <button
              onClick={toggle}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground/90 transition-colors lg:justify-center lg:px-0 lg:py-3"
            >
              {theme === "dark" ? <Moon className="h-5 w-5 shrink-0" /> : <Sun className="h-5 w-5 shrink-0" />}
              <span className="lg:hidden">{theme === "dark" ? "Tema scuro" : theme === "light" ? "Tema chiaro" : "Auto"}</span>
            </button>
            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 lg:group-hover:block">
              <div className="whitespace-nowrap rounded-md bg-brown px-2.5 py-1 text-xs font-medium text-white shadow-lg">
                {theme === "dark" ? "Tema scuro" : theme === "light" ? "Tema chiaro" : "Auto"}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-brown" />
              </div>
            </div>
          </div>

          {/* Logout */}
          <form action="/api/auth/logout" method="POST">
            <div className="group relative">
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground/90 transition-colors lg:justify-center lg:px-0 lg:py-3"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="lg:hidden">Esci</span>
              </button>
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 lg:group-hover:block">
                <div className="whitespace-nowrap rounded-md bg-brown px-2.5 py-1 text-xs font-medium text-white shadow-lg">
                  Esci
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-brown" />
                </div>
              </div>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}
