"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  Users,
  Tag,
  UserCircle2,
  Megaphone,
  BarChart3,
  Puzzle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface IconNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const defaultNavigation: IconNavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/agenda", label: "Calendario", icon: Calendar },
  { href: "/vendite", label: "Vendite", icon: ShoppingBag },
  { href: "/clienti", label: "Clienti", icon: Users },
  { href: "/catalogo", label: "Catalogo", icon: Tag },
  { href: "/team", label: "Team", icon: UserCircle2 },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/reports", label: "Report", icon: BarChart3 },
  { href: "/add-ons", label: "Componenti", icon: Puzzle },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export const v2Navigation: IconNavItem[] = [
  { href: "/v2-preview", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/v2-preview/agenda", label: "Calendario", icon: Calendar },
  { href: "/v2-preview/vendite", label: "Vendite", icon: ShoppingBag },
  { href: "/v2-preview/clienti", label: "Clienti", icon: Users },
  { href: "/v2-preview/catalogo", label: "Catalogo", icon: Tag },
  { href: "/v2-preview/team", label: "Team", icon: UserCircle2 },
  { href: "/v2-preview/marketing", label: "Marketing", icon: Megaphone },
  { href: "/v2-preview/reports", label: "Report", icon: BarChart3 },
  { href: "/components-preview", label: "Componenti", icon: Puzzle },
  { href: "/v2-preview/impostazioni", label: "Impostazioni", icon: Settings },
];

interface IconSidebarProps {
  items?: IconNavItem[];
  className?: string;
}

export function IconSidebar({ items = defaultNavigation, className }: IconSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden w-14 flex-col border-r border-border bg-sidebar py-3 lg:flex",
        className
      )}
      aria-label="Navigazione principale"
    >
      <nav className="flex-1 space-y-1 px-2">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-sidebar-active text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground"
              )}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span
                className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                role="tooltip"
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
