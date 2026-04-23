"use client";

import { useState, useTransition } from "react";
import { Star, Check, ExternalLink } from "lucide-react";
import { submitReview } from "@/lib/actions/reviews";

type Props = {
  token: string;
  clientName?: string;
};

export function ReviewForm({ token, clientName }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Stato post-submit: ramo Google (4-5 stelle + URL configurato) vs grazie.
  const [result, setResult] = useState<
    | null
    | { kind: "google"; url: string }
    | { kind: "thanks" }
  >(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (rating < 1 || rating > 5) {
      setErr("Seleziona una valutazione da 1 a 5 stelle");
      return;
    }
    startTransition(async () => {
      try {
        const res = await submitReview(token, { rating, text: text.trim() || null });
        if (!res.ok) {
          setErr(res.error);
          return;
        }
        if (res.shouldRedirectGoogle && res.googleUrl) {
          setResult({ kind: "google", url: res.googleUrl });
        } else {
          setResult({ kind: "thanks" });
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Errore invio");
      }
    });
  }

  if (result?.kind === "google") {
    return (
      <div className="rounded-2xl bg-white border border-[#E8DDD3] p-8 text-center shadow-sm space-y-5">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#F0F9EE] flex items-center justify-center text-[#4CAF50]">
          <Check className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-serif">Grazie!</h2>
          <p className="mt-3 text-sm text-[#5C4333]">
            {clientName ? `${clientName}, ` : ""}ci fai un enorme favore se lasci
            lo stesso voto anche su Google — aiuta altre donne a trovarci.
          </p>
        </div>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#CFB06C] text-white px-6 py-3 text-sm font-medium hover:bg-[#A88B4A] transition-colors"
        >
          <Star className="h-4 w-4 fill-current" />
          Lascia la recensione su Google
          <ExternalLink className="h-4 w-4" />
        </a>
        <p className="text-xs text-[#8B7D6B]">
          Ti ci vogliono 20 secondi. Grazie davvero.
        </p>
      </div>
    );
  }

  if (result?.kind === "thanks") {
    return (
      <div className="rounded-2xl bg-white border border-[#E8DDD3] p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#F5E6D8] flex items-center justify-center text-2xl">
          &#x1F33C;
        </div>
        <h2 className="text-2xl font-serif">Grazie</h2>
        <p className="text-sm text-[#5C4333]">
          Il tuo feedback &egrave; prezioso — lo leggiamo sempre e lo usiamo per
          migliorare.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-[#E8DDD3] p-6 sm:p-8 shadow-sm space-y-6"
    >
      <div>
        <p className="text-sm font-medium text-[#443625] mb-3">
          Quante stelle ci dai?
        </p>
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CFB06C] rounded"
                aria-label={`${n} stell${n === 1 ? "a" : "e"}`}
              >
                <Star
                  className={`h-10 w-10 sm:h-12 sm:w-12 transition-colors ${
                    active
                      ? "fill-[#CFB06C] text-[#CFB06C]"
                      : "text-[#E8DDD3]"
                  }`}
                />
              </button>
            );
          })}
        </div>
        {rating > 0 && (
          <p className="mt-2 text-center text-xs text-[#8B7D6B]">
            {rating === 5
              ? "Sei bellissima — grazie!"
              : rating === 4
                ? "Grazie, ci fa molto piacere"
                : rating === 3
                  ? "Raccontaci cosa migliorare"
                  : "Ci dispiace — raccontaci cosa è andato storto"}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="text"
          className="text-sm font-medium text-[#443625] mb-2 block"
        >
          Raccontaci di pi&ugrave; (opzionale)
        </label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Cosa ti &egrave; piaciuto? C'&egrave; qualcosa su cui possiamo migliorare?"
          className="w-full rounded-xl border border-[#E8DDD3] bg-[#FFFCF6] px-4 py-3 text-sm text-[#443625] placeholder:text-[#B8A690] focus:outline-none focus:border-[#CFB06C] focus:ring-2 focus:ring-[#CFB06C]/30 resize-none"
        />
      </div>

      {err && (
        <div className="rounded-lg bg-[#FDECEA] border border-[#E53935]/30 px-4 py-3 text-sm text-[#B71C1C]">
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || rating < 1}
        className="w-full rounded-full bg-[#CFB06C] text-white px-6 py-3 text-sm font-medium hover:bg-[#A88B4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Invio\u2026" : "Invia"}
      </button>
    </form>
  );
}
