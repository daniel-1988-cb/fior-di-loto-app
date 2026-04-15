"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
 LayoutDashboard,
 Calendar,
 Users,
 BarChart3,
 MoreHorizontal,
} from "lucide-react";

const NAV_ITEMS = [
 { href: "/", icon: LayoutDashboard, label: "Home" },
 { href: "/agenda", icon: Calendar, label: "Agenda" },
 { href: "/clienti", icon: Users, label: "Clienti" },
 { href: "/gestionale", icon: BarChart3, label: "Cassa" },
 { href: "/impostazioni", icon: MoreHorizontal, label: "Altro" },
];

export function MobileBottomNav() {
 const pathname = usePathname();

 // Nascondi su agenda — ha la sua bottom bar
 if (pathname.startsWith("/agenda")) return null;

 return (
  <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card shadow-lg">
   <div className="flex items-center justify-around px-2 py-1.5">
    {NAV_ITEMS.map((item) => {
     const isActive =
      item.href === "/"
       ? pathname === "/"
       : pathname.startsWith(item.href);
     return (
      <Link
       key={item.href}
       href={item.href}
       className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
        isActive ? "text-gold" : "text-muted-foreground hover:text-brown"
       }`}
      >
       <item.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
       <span className={`text-[10px] font-medium ${isActive ? "text-gold" : ""}`}>
        {item.label}
       </span>
      </Link>
     );
    })}
   </div>
  </nav>
 );
}
