import Link from "next/link";
import { V2Shell } from "@/components/layout/v2-shell";
import { Card, CardContent, Button } from "@/components/ui";
import { Search } from "lucide-react";

export default function V2NotFound() {
  return (
    <V2Shell>
      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Search className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Pagina non trovata</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            L&apos;URL che stai cercando non esiste o è stato spostato.
          </p>
          <Link href="/v2-preview" className="mt-6 inline-block">
            <Button variant="outline">Torna alla dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </V2Shell>
  );
}
