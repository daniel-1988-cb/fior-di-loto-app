import { IconSidebar, type IconNavItem } from "./icon-sidebar";
import { Topbar } from "./topbar";
import { SubSidebar, type SubNavGroup } from "./sub-sidebar";
import { cn } from "@/lib/utils";

interface ShellProps {
  children: React.ReactNode;
  subNav?: { title?: string; groups: SubNavGroup[] };
  topbar?: React.ReactNode;
  nav?: IconNavItem[];
  brandHref?: string;
  maxWidth?: "full" | "7xl" | "5xl";
  className?: string;
}

const maxWidthMap = {
  full: "max-w-none",
  "7xl": "max-w-7xl",
  "5xl": "max-w-5xl",
} as const;

export function Shell({
  children,
  subNav,
  topbar,
  nav,
  brandHref = "/",
  maxWidth = "7xl",
  className,
}: ShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <IconSidebar items={nav} />
      <div className="lg:pl-14">
        {topbar ?? <Topbar brandHref={brandHref} />}
        <div className="flex">
          {subNav && <SubSidebar title={subNav.title} groups={subNav.groups} />}
          <main className={cn("flex-1 min-w-0", className)}>
            <div className={cn("mx-auto px-4 py-6 sm:px-6 lg:px-8", maxWidthMap[maxWidth])}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
