"use client";

import { useEffect } from "react";
import { Card, CardContent, Button } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

export default function V2Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Mi dispiace, qualcosa non ha funzionato</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Si &egrave; verificato un errore nel caricamento della pagina. Riprova o torna alla
            dashboard.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground">Riferimento: {error.digest}</p>
          )}
          {isDev && error.message && (
            <pre className="mx-auto mt-4 max-w-lg overflow-auto rounded-lg bg-muted px-4 py-3 text-left text-xs text-muted-foreground">
              {error.message}
            </pre>
          )}
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button onClick={reset}>Riprova</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Torna alla dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
