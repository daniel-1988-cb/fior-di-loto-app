"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side basic checks
    if (!email.trim() || !password) {
      setError("Inserisci email e password");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAttempts((prev) => prev + 1);

        if (res.status === 429) {
          setError("Troppi tentativi. Riprova tra qualche minuto.");
        } else {
          setError(data.error || "Email o password non corretti");
        }

        // Progressive delay after failed attempts
        if (attempts >= 3) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Errore di connessione. Riprova.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose">
            <span className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white">
              F
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
            Fior di Loto
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centro Estetico & Benessere
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
          autoComplete="off"
        >
          <h2 className="mb-6 text-center text-lg font-semibold text-brown">
            Accedi al Gestionale
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-brown">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                autoComplete="email"
                placeholder="info@fiordiloto.it"
                className="w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-brown">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={128}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-dark disabled:opacity-50"
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Fior di Loto — Metodo Rinascita
        </p>
      </div>
    </div>
  );
}
