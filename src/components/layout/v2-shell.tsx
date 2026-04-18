import { Shell } from "./shell";
import { Topbar } from "./topbar";
import { v2Navigation } from "./icon-sidebar";
import type { SubNavGroup } from "./sub-sidebar";

export function V2Shell({
  children,
  subNav,
  maxWidth = "7xl",
}: {
  children: React.ReactNode;
  subNav?: { title?: string; groups: SubNavGroup[] };
  maxWidth?: "full" | "7xl" | "5xl";
}) {
  return (
    <Shell
      nav={v2Navigation}
      brandHref="/v2-preview"
      topbar={
        <Topbar
          brandHref="/v2-preview"
          reportsHref="/v2-preview/reports"
          marketingHref="/v2-preview/marketing"
          agendaHref="/v2-preview/agenda"
        />
      }
      subNav={subNav}
      maxWidth={maxWidth}
    >
      {children}
    </Shell>
  );
}
