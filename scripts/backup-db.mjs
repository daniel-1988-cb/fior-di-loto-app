import postgres from "postgres";
import { writeFileSync, mkdirSync } from "fs";
import { gzipSync } from "zlib";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });

const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = `../../../.backups/fior-di-loto-app/${ts}`;
mkdirSync(outDir, { recursive: true });

try {
  // 1) list public tables
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
  `;
  console.log(`Found ${tables.length} public tables`);

  // 2) dump schema via information_schema (columns, PKs, FKs, indexes)
  const schema = {};
  for (const { tablename } of tables) {
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=${tablename}
      ORDER BY ordinal_position
    `;
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema='public' AND table_name=${tablename}
    `;
    const indexes = await sql`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname='public' AND tablename=${tablename}
    `;
    schema[tablename] = { columns: cols, constraints, indexes };
  }
  writeFileSync(`${outDir}/schema.json`, JSON.stringify(schema, null, 2));
  console.log("Schema dumped");

  // 3) dump data per table as gzipped JSON
  const manifest = { timestamp: ts, tables: {} };
  for (const { tablename } of tables) {
    const rows = await sql.unsafe(`SELECT * FROM public."${tablename}"`);
    const json = JSON.stringify(rows);
    const gz = gzipSync(json);
    writeFileSync(`${outDir}/${tablename}.json.gz`, gz);
    manifest.tables[tablename] = { rows: rows.length, bytes: gz.length };
    console.log(`  ${tablename}: ${rows.length} rows (${gz.length}b)`);
  }
  writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2));

  // 4) dump policies + functions
  const policies = await sql`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname
  `;
  const functions = await sql`
    SELECT n.nspname AS schema, p.proname AS name, pg_get_function_arguments(p.oid) AS args,
           pg_get_function_result(p.oid) AS returns, p.prosecdef AS security_definer,
           p.proconfig AS config, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
  `;
  writeFileSync(`${outDir}/policies.json`, JSON.stringify(policies, null, 2));
  writeFileSync(`${outDir}/functions.json`, JSON.stringify(functions, null, 2));

  console.log(`\nBackup complete: ${outDir}`);
} finally {
  await sql.end();
}
