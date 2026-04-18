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
    console.error("V2 preview error:", error);
  }, [error]);

  return (
    <>
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Qualcosa non ha funzionato</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Si è verificato un errore nel caricamento della pagina. Riprova oppure torna alla
            dashboard.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground">Riferimento: {error.digest}</p>
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
