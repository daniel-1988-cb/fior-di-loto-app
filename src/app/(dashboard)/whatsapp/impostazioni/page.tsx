import { MARIALUCIA_SYSTEM_PROMPT } from "@/lib/bot/marialucia-system-prompt";

export default function BotSettingsPage() {
 const envReady = {
  verifyToken: !!process.env.META_WA_VERIFY_TOKEN,
  appSecret: !!process.env.META_WA_APP_SECRET,
  accessToken: !!process.env.META_WA_ACCESS_TOKEN,
  phoneNumberId: !!process.env.META_WA_PHONE_NUMBER_ID,
  anthropicKey: !!process.env.ANTHROPIC_API_KEY,
 };
 const allReady = Object.values(envReady).every(Boolean);

 return (
  <div className="space-y-6">
   <section className="rounded-lg border border-border bg-card p-5">
    <h2 className="mb-3 font-semibold text-brown">Stato configurazione</h2>
    <ul className="space-y-1 text-sm">
     {Object.entries(envReady).map(([k, v]) => (
      <li key={k} className="flex items-center gap-2">
       <span className={v ? "text-success" : "text-red-500"}>{v ? "✓" : "✗"}</span>
       <span className="font-mono text-xs">{k}</span>
      </li>
     ))}
    </ul>
    {!allReady && (
     <p className="mt-3 text-xs text-muted-foreground">
      Variabili mancanti: compilare .env.local locale + Vercel env settings production.
     </p>
    )}
   </section>

   <section className="rounded-lg border border-border bg-card p-5">
    <h2 className="mb-3 font-semibold text-brown">System Prompt Marialucia</h2>
    <pre className="max-h-96 overflow-auto rounded-md bg-cream-dark/40 p-4 text-xs text-brown">
     {MARIALUCIA_SYSTEM_PROMPT}
    </pre>
    <p className="mt-2 text-xs text-muted-foreground">
     Editing del prompt fuori scope first cut — modifica tramite commit su{" "}
     <code className="text-xs">src/lib/bot/marialucia-system-prompt.ts</code>
    </p>
   </section>
  </div>
 );
}
