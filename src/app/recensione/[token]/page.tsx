import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewForm } from "@/components/recensione/review-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Il tuo parere conta — Fior di Loto",
  description: "Raccontaci come è andata la tua visita.",
  robots: { index: false, follow: false },
};

/**
 * Landing PUBBLICA — non richiede login. Leggiamo la review_request tramite
 * service role (createAdminClient) per recuperare il nome cliente e validare
 * che il token esista + non sia già stato usato.
 *
 * Il flow tracker è:
 *   WA link -> /api/r/<token>  (setta clicked_at, redirect qui)
 *   qui     -> <ReviewForm>    (client component)
 *   submit  -> submitReview action (server) -> optional Google redirect
 */

type Row = {
  id: string;
  token: string;
  submitted_at: string | null;
  clients: { nome: string; cognome: string } | { nome: string; cognome: string }[] | null;
};

async function fetchRequest(token: string): Promise<Row | null> {
  if (!token || !/^[a-f0-9]{8,32}$/i.test(token)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("review_requests")
    .select("id, token, submitted_at, clients(nome, cognome)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Row;
}

export default async function RecensionePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const req = await fetchRequest(token);

  if (!req) {
    return (
      <main className="min-h-screen bg-[#FFFCF6] text-[#443625] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F5E6D8] flex items-center justify-center text-2xl">
            &#x1F33F;
          </div>
          <h1 className="text-2xl font-serif">Link non valido</h1>
          <p className="text-sm text-[#8B7D6B]">
            Questo link non &egrave; pi&ugrave; attivo o &egrave; gi&agrave; stato usato.
            Se hai bisogno di aiuto scrivici su WhatsApp allo{" "}
            <a
              href="https://wa.me/3908741950632"
              className="underline text-[#A85858]"
            >
              0874 1950632
            </a>
            .
          </p>
          <Link
            href="https://www.fiordilotocb.it"
            className="inline-block mt-4 text-sm text-[#A88B4A] hover:underline"
          >
            Vai al sito
          </Link>
        </div>
      </main>
    );
  }

  const clientsRel = Array.isArray(req.clients) ? req.clients[0] : req.clients;
  const clientName = clientsRel?.nome || "";
  const already = Boolean(req.submitted_at);

  return (
    <main className="min-h-screen bg-[#FFFCF6] text-[#443625]">
      <div className="mx-auto max-w-xl px-6 py-12">
        <header className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-[#CFB06C] to-[#C97A7A] flex items-center justify-center text-white text-2xl shadow-sm">
            &#x1F33C;
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[#A88B4A]">
            Fior di Loto
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-serif leading-tight">
            {already
              ? `Grazie ${clientName || ""}`.trim() + "!"
              : clientName
                ? `Grazie ${clientName}, com'è andata?`
                : "Grazie, com'è andata?"}
          </h1>
          <p className="mt-3 text-sm text-[#8B7D6B]">
            {already
              ? "Abbiamo già ricevuto il tuo feedback — grazie di cuore."
              : "Il tuo parere ci aiuta a prenderci cura ogni giorno meglio di te e delle altre donne che vengono da noi."}
          </p>
        </header>

        {already ? (
          <div className="rounded-2xl bg-white border border-[#E8DDD3] p-8 text-center shadow-sm">
            <p className="text-sm text-[#8B7D6B]">
              Se vuoi lasciarci una recensione su Google in qualsiasi momento,
              cerca <strong>Fior di Loto Campobasso</strong> su Google Maps.
            </p>
          </div>
        ) : (
          <ReviewForm token={token} clientName={clientName} />
        )}

        <footer className="mt-10 text-center text-xs text-[#8B7D6B]">
          &copy; Fior di Loto Centro Estetico & Benessere &middot; Campobasso
        </footer>
      </div>
    </main>
  );
}
