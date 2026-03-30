import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/postgres";

export const sql = postgres(connectionString.replace("[YOUR-DB-PASSWORD]", ""), {
  max: 5,
  idle_timeout: 20,
});
