"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);
 const [attempts, setAttempts] = useState(0);
 const [showPassword, setShowPassword] = useState(false);
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
   {/* Subtle decorative background */}
   <div className="pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute -top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-gold/[0.04] blur-3xl" />
    <div className="absolute -bottom-1/4 -left-1/4 h-[500px] w-[500px] rounded-full bg-rose/[0.04] blur-3xl" />
   </div>

   <div className="relative w-full max-w-md">
    {/* Logo & Brand */}
    <div className="mb-10 text-center">
     {/* Lotus icon */}
     <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center">
      <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" xmlns="http://www.w3.org/2000/svg">
       {/* Center petal */}
       <ellipse cx="40" cy="32" rx="8" ry="22" fill="#CFB06C" opacity="0.9" />
       {/* Left petals */}
       <ellipse cx="40" cy="32" rx="8" ry="22" fill="#CFB06C" opacity="0.7" transform="rotate(-25 40 42)" />
       <ellipse cx="40" cy="32" rx="8" ry="22" fill="#CFB06C" opacity="0.5" transform="rotate(-50 40 42)" />
       {/* Right petals */}
       <ellipse cx="40" cy="32" rx="8" ry="22" fill="#CFB06C" opacity="0.7" transform="rotate(25 40 42)" />
       <ellipse cx="40" cy="32" rx="8" ry="22" fill="#CFB06C" opacity="0.5" transform="rotate(50 40 42)" />
       {/* Base */}
       <path d="M20 52 Q30 46 40 50 Q50 46 60 52 Q50 56 40 54 Q30 56 20 52Z" fill="#C97A7A" opacity="0.4" />
       {/* Inner glow */}
       <circle cx="40" cy="38" r="4" fill="#DCC99A" opacity="0.6" />
      </svg>
     </div>
     <h1 className="font-display text-4xl font-bold tracking-tight text-brown">
      Fior di Loto
     </h1>
     <div className="mx-auto mt-2 flex items-center justify-center gap-3">
      <span className="h-px w-8 bg-gold/40" />
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-dark">
       Centro Estetico & Benessere
      </p>
      <span className="h-px w-8 bg-gold/40" />
     </div>
    </div>

    {/* Login Form */}
    <form
     onSubmit={handleLogin}
     className="rounded-xl border border-border bg-card p-7 shadow-[0_4px_24px_rgba(68,54,37,0.06)]"
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
       <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-brown">
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
        className="w-full rounded-lg border border-input bg-cream/50 px-3.5 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20"
       />
      </div>

      <div>
       <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-brown">
        Password
       </label>
       <div className="relative">
        <input
         id="password"
         type={showPassword ? "text" : "password"}
         value={password}
         onChange={(e) => setPassword(e.target.value)}
         required
         maxLength={128}
         autoComplete="current-password"
         placeholder="••••••••"
         className="w-full rounded-lg border border-input bg-cream/50 px-3.5 py-2.5 pr-10 text-sm text-brown placeholder:text-muted-foreground focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <button
         type="button"
         onClick={() => setShowPassword((v) => !v)}
         className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brown"
         tabIndex={-1}
        >
         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
       </div>
      </div>

      <button
       type="submit"
       disabled={loading}
       className="w-full rounded-lg bg-gradient-to-r from-gold to-gold-light px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
      >
       {loading ? "Accesso in corso..." : "Accedi"}
      </button>
     </div>
    </form>

    <div className="mt-8 flex items-center justify-center gap-2">
     <span className="h-px w-12 bg-border" />
     <p className="text-xs font-medium tracking-wider text-muted-foreground">
      Metodo Rinascita
     </p>
     <span className="h-px w-12 bg-border" />
    </div>
   </div>
  </div>
 );
}
