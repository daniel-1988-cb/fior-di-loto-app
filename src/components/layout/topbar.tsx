"use client";

import Link from "next/link";
import { Search, BarChart3, Rocket, Bell, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileMenu } from "./profile-menu";

interface TopbarProps {
  logo?: React.ReactNode;
  className?: string;
  onSearchClick?: () => void;
  brandHref?: string;
  reportsHref?: string;
  marketingHref?: string;
  agendaHref?: string;
}

export function Topbar({
  logo,
  className,
  onSearchClick,
  brandHref = "/",
  reportsHref = "/reports",
  marketingHref = "/marketing",
  agendaHref = "/agenda",
}: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {logo ?? (
          <Link href={brandHref} className="font-display text-xl tracking-tight">
            Fior di Loto
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1">
        <IconButton label="Cerca" onClick={onSearchClick}>
          <Search className="h-4 w-4" />
        </IconButton>
        <IconButton label="Analytics rapidi" href={reportsHref}>
          <BarChart3 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Marketing boost" href={marketingHref}>
          <Rocket className="h-4 w-4" />
        </IconButton>
        <IconButton label="Notifiche">
          <Bell className="h-4 w-4" />
        </IconButton>
        <IconButton label="Agenda oggi" href={agendaHref}>
          <CalendarDays className="h-4 w-4" />
        </IconButton>
        <ProfileMenu />
      </div>
    </header>
  );
}

function IconButton({
  label,
  children,
  href,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
