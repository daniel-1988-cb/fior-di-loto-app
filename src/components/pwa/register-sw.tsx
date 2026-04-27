"use client";

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";

/**
 * Registra il service worker + mostra un banner "Aggiungi a Home Screen"
 * la prima volta che il browser emette `beforeinstallprompt` (Chrome/Edge/
 * Android). Su iOS Safari il prompt API non esiste: mostriamo un hint
 * con istruzioni manuali ("Condividi → Aggiungi a Home Screen") solo se
 * rileviamo iOS + non in standalone.
 *
 * Il dismiss viene persistito in localStorage ("pwa_banner_dismissed")
 * su tutte le piattaforme: Android, iOS, desktop.
 */
export function RegisterSW() {
 const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
 const [showIosHint, setShowIosHint] = useState(false);
 const [dismissed, setDismissed] = useState(false);

 useEffect(() => {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Se già dismissato (qualsiasi piattaforma), non mostrare nulla
  if (localStorage.getItem("pwa_banner_dismissed") === "1") {
   setDismissed(true);
   return;
  }

  // Register SW
  navigator.serviceWorker
   .register("/sw.js", { scope: "/" })
   .catch((err) => console.warn("[sw] register failed", err));

  // Android/desktop install prompt
  const onBIP = (e: Event) => {
   e.preventDefault();
   setInstallEvent(e as BeforeInstallPromptEvent);
  };
  window.addEventListener("beforeinstallprompt", onBIP);

  // iOS detection + standalone check
  const nav = navigator as Navigator & { standalone?: boolean };
  const isIOS =
   /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  const isStandalone =
   window.matchMedia("(display-mode: standalone)").matches || nav.standalone;

  if (isIOS && !isStandalone) {
   const seen = localStorage.getItem("pwa_banner_dismissed");
   if (!seen) setShowIosHint(true);
  }

  return () => window.removeEventListener("beforeinstallprompt", onBIP);
 }, []);

 async function install() {
  if (!installEvent) return;
  await installEvent.prompt();
  const choice = await installEvent.userChoice;
  if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
   localStorage.setItem("pwa_banner_dismissed", "1");
   setInstallEvent(null);
   setDismissed(true);
  }
 }

 function dismissAndroid() {
  localStorage.setItem("pwa_banner_dismissed", "1");
  setInstallEvent(null);
  setDismissed(true);
 }

 function dismissIos() {
  localStorage.setItem("pwa_banner_dismissed", "1");
  setShowIosHint(false);
  setDismissed(true);
 }

 if (dismissed) return null;

 if (installEvent) {
  return (
   <div className="fixed top-2 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-md">
    <Smartphone className="h-4 w-4 shrink-0 text-rose" />
    <p className="text-xs text-foreground">
     Installa Fior di Loto come app
    </p>
    <button
     type="button"
     onClick={install}
     className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background hover:opacity-90"
    >
     Installa
    </button>
    <button
     type="button"
     onClick={dismissAndroid}
     aria-label="Chiudi"
     className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
     <X className="h-3.5 w-3.5" />
    </button>
   </div>
  );
 }

 if (showIosHint) {
  return (
   <div className="fixed top-2 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-md">
    <Smartphone className="h-4 w-4 shrink-0 text-rose" />
    <div className="flex-1 text-xs text-foreground">
     <span className="font-medium">Aggiungi a Home: </span>
     <span className="text-muted-foreground">Condividi ↑ → Aggiungi a Home Screen</span>
    </div>
    <button
     type="button"
     onClick={dismissIos}
     aria-label="Chiudi"
     className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
     <X className="h-3.5 w-3.5" />
    </button>
   </div>
  );
 }

 return null;
}

interface BeforeInstallPromptEvent extends Event {
 prompt: () => Promise<void>;
 userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
