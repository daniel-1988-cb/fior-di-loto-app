import { teamSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button } from "@/components/ui";
import { ClipboardList } from "lucide-react";

export default function V2PresenzePage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Fogli di presenza</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro entrate e uscite di ogni membro del team.
        </p>
      </header>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Presenze non ancora rilevate</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Abilita il check-in staff per registrare orari di entrata/uscita e
            calcolare le ore lavorate automaticamente.
          </p>
          <Button className="mt-6" variant="outline">
            Abilita check-in
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
