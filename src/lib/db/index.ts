import postgres from "postgres";

// Durante il build (NEXT_PHASE=phase-production-build) non creare connessioni DB
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/postgres";

function createSql() {
  if (isBuild) {
    // No-op durante build: restituisce array vuoto per qualsiasi query
    const noop = async () => [];
    return new Proxy(noop as unknown as ReturnType<typeof postgres>, {
      apply: () => Promise.resolve([]),
      get: (_t, prop) => {
        if (prop === "end") return () => Promise.resolve();
        return () => Promise.resolve([]);
      },
    });
  }
  return postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
  });
}

export const sql = createSql();
