"use client";

import { usePathname } from "next/navigation";
import { V2Shell } from "@/components/layout/v2-shell";
import { AiFab } from "@/components/v2/ai-fab";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { UiProviders } from "@/components/providers/ui-providers";
import {
  venditeSubNav,
  clientiSubNav,
  catalogoSubNav,
  teamSubNav,
  marketingSubNav,
  reportsSubNav,
} from "@/components/layout/v2-sidenav";

function subNavFor(pathname: string) {
  if (pathname.startsWith("/vendite")) return { title: "Vendite", groups: venditeSubNav };
  if (pathname.startsWith("/clienti")) return { title: "Clienti", groups: clientiSubNav };
  if (pathname.startsWith("/catalogo")) return { title: "Catalogo", groups: catalogoSubNav };
  if (pathname.startsWith("/team")) return { title: "Team", groups: teamSubNav };
  if (pathname.startsWith("/marketing")) return { title: "Marketing", groups: marketingSubNav };
  if (pathname.startsWith("/reports")) return { title: "Report", groups: reportsSubNav };
  return undefined;
}

function maxWidthFor(pathname: string): "full" | "7xl" | "5xl" {
  if (pathname.startsWith("/agenda")) return "full";
  if (pathname.startsWith("/catalogo/servizi")) return "full";
  return "7xl";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <UiProviders>
      <V2Shell subNav={subNavFor(pathname)} maxWidth={maxWidthFor(pathname)}>
        {children}
        <AiFab />
      </V2Shell>
      <MobileBottomNav />
    </UiProviders>
  );
}
