"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
 { label: "Contenuti", emoji: "📋", href: "/social" },
 { label: "Calendario", emoji: "📅", href: "/social/calendario" },
 { label: "Competitor", emoji: "👁️", href: "/social/competitor" },
 { label: "News", emoji: "📰", href: "/social/news" },
];

export function SocialNav() {
 const pathname = usePathname();

 return (
  <div className="mb-6 flex gap-1 rounded-xl border border-border bg-card p-1 ">
   {tabs.map((tab) => {
    const isActive = pathname === tab.href;
    return (
     <Link
      key={tab.href}
      href={tab.href}
      className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
       isActive
        ? "bg-brown text-white "
        : "text-muted-foreground hover:bg-cream-dark hover:text-brown"
      }`}
     >
      <span className="mr-1">{tab.emoji}</span>
      {tab.label}
     </Link>
    );
   })}
  </div>
 );
}
