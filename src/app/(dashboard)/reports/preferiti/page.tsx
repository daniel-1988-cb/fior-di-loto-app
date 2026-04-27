export const dynamic = "force-dynamic";

import Link from "next/link";
import { Star } from "lucide-react";

// ============================================
// /reports/preferiti — Wave 4 Agent C
//
// Placeholder con empty state caldo.
// La feature richiede tabella user_report_favorites + UI "salva" su ogni
// report — fuori scope. Prevista nelle prossime settimane.
// ============================================

export default function ReportPreferitiPage() {
  return (
    <>
      <header className="mb-6">
        <Link
          href="/reports"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden="true">&#8592;</span>&nbsp;Reports
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Report preferiti</h1>
      </header>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-8 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Star className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Salva i tuoi report pi&#249; usati</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Da qui troverai i report che apri pi&#249; spesso, per averli sempre a portata di mano.
          Funzione in arrivo nelle prossime settimane.
        </p>
        <Link
          href="/reports"
          className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Vai a Tutti i report
        </Link>
      </div>
    </>
  );
}
