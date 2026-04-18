"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Moon, Sun, Monitor, Settings, LogOut, Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "light") root.classList.add("light");
    else if (theme === "dark") root.classList.add("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return [theme, setTheme];
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative ml-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profilo"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
      >
        <User className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg">
          {email && (
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Account
              </p>
              <p className="truncate text-sm font-medium" title={email}>
                {email}
              </p>
            </div>
          )}

          <div className="border-b border-border p-2">
            <p className="mb-1 px-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tema
            </p>
            <div className="grid grid-cols-3 gap-1">
              {[
                { k: "light" as const, icon: Sun, label: "Chiaro" },
                { k: "dark" as const, icon: Moon, label: "Scuro" },
                { k: "system" as const, icon: Monitor, label: "Auto" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTheme(t.k)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition-colors",
                    theme === t.k
                      ? "bg-muted font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-1">
            <MenuLink href="/impostazioni" icon={Settings} label="Impostazioni" onClick={() => setOpen(false)} />
            <MenuLink href="/impostazioni/assistente" icon={Bot} label="Assistente AI" onClick={() => setOpen(false)} />
          </div>

          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" />
              Esci
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof Settings;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
