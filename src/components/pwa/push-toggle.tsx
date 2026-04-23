"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { saveSubscription, deleteSubscription } from "@/lib/actions/push";

type Status = "unsupported" | "unknown" | "off" | "denied" | "on";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
 const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
 const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
 const raw = atob(base64);
 const out = new Uint8Array(raw.length);
 for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
 return out;
}

/**
 * Toggle on/off per le web push notifications. Su click:
 *  - se permission = granted e già subscribed → unsubscribe + delete dal DB
 *  - altrimenti → chiede permission, subscribe al pushManager, salva sub nel DB
 *
 * Safari iOS 16.4+ supporta solo se l'app è installata come PWA.
 * Chrome/Edge/Android: funziona sia da browser che da PWA.
 */
export function PushToggle() {
 const [status, setStatus] = useState<Status>("unknown");
 const [loading, setLoading] = useState(false);
 const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

 useEffect(() => {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
   setStatus("unsupported");
   return;
  }
  if (Notification.permission === "denied") {
   setStatus("denied");
   return;
  }
  // Check se c'è una subscription attiva
  navigator.serviceWorker.ready.then(async (reg) => {
   const sub = await reg.pushManager.getSubscription();
   setStatus(sub ? "on" : "off");
  });
 }, []);

 async function enable() {
  if (!vapidPublicKey) {
   alert("VAPID public key non configurata. Contatta l'amministratore.");
   return;
  }
  setLoading(true);
  try {
   const permission = await Notification.requestPermission();
   if (permission !== "granted") {
    setStatus(permission === "denied" ? "denied" : "off");
    return;
   }
   const reg = await navigator.serviceWorker.ready;
   const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // Cast: TS DOM lib restringe applicationServerKey a BufferSource
    // ma Uint8Array è BufferSource in runtime. Cast sicuro.
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
   });
   const subJson = sub.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
   };
   const res = await saveSubscription({
    endpoint: subJson.endpoint,
    p256dh: subJson.keys.p256dh,
    auth: subJson.keys.auth,
    userAgent: navigator.userAgent,
   });
   if (!res.ok) {
    alert("Errore salvataggio subscription: " + res.error);
    return;
   }
   setStatus("on");
  } catch (e) {
   console.error("[push-toggle] enable failed", e);
   alert("Errore abilitazione notifiche: " + (e instanceof Error ? e.message : "sconosciuto"));
  } finally {
   setLoading(false);
  }
 }

 async function disable() {
  setLoading(true);
  try {
   const reg = await navigator.serviceWorker.ready;
   const sub = await reg.pushManager.getSubscription();
   if (sub) {
    await deleteSubscription(sub.endpoint);
    await sub.unsubscribe();
   }
   setStatus("off");
  } catch (e) {
   console.error("[push-toggle] disable failed", e);
  } finally {
   setLoading(false);
  }
 }

 if (status === "unsupported") {
  return (
   <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
    <p className="font-medium">Notifiche non supportate</p>
    <p className="mt-1 text-xs">
     Questo browser non supporta le notifiche push. Su iPhone: installa
     l&apos;app come PWA (Condividi → Aggiungi a Home Screen) per attivarle
     (richiede iOS 16.4+).
    </p>
   </div>
  );
 }

 if (status === "denied") {
  return (
   <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
    <p className="font-medium text-amber-800 dark:text-amber-300">
     Notifiche bloccate
    </p>
    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
     Hai negato i permessi per le notifiche. Riabilitale dalle
     impostazioni del browser/app → Notifiche → Fior di Loto.
    </p>
   </div>
  );
 }

 const on = status === "on";

 return (
  <button
   type="button"
   onClick={on ? disable : enable}
   disabled={loading}
   className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
    on
     ? "border-rose bg-rose/10 text-rose hover:bg-rose/20"
     : "border-border bg-card text-foreground hover:bg-muted"
   }`}
  >
   {on ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
   {loading ? "..." : on ? "Notifiche attive" : "Attiva notifiche push"}
  </button>
 );
}
