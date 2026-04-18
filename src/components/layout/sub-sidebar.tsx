"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SubNavGroup {
  title?: string;
  items: SubNavItem[];
}

export interface SubNavItem {
  href: string;
  label: string;
  badge?: string | number;
}

interface SubSidebarProps {
  title?: string;
  groups: SubNavGroup[];
  className?: string;
}

export function SubSidebar({ title, groups, className }: SubSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden w-60 shrink-0 border-r border-border bg-card/40 p-4 lg:block",
        className
      )}
      aria-label="Sotto-navigazione"
    >
      {title && (
        <h2 className="mb-3 px-3 text-base font-semibold text-foreground">{title}</h2>
      )}
      <nav className="space-y-6">
        {groups.map((group, gi) => (
          <div key={group.title ?? gi}>
            {group.title && (
              <h3 className="mb-2 px-3 text-sm font-semibold text-foreground">
                {group.title}
              </h3>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-muted font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <span>{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
