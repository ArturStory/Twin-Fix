/**
 * Tiny bootstrap file that …
 *   1. Forces the project to use SQLite
 *   2. Runs (or re-runs) migrations so the DB is always up to date
 *   3. Prints some diagnostic output
 *   4. Finally boots the real Express/Vite server (server/index.ts)
 */

/* ------------------------------------------------------------------ */
/*  1️⃣  Force SQLite mode and wipe any Postgres URL that may be set   */
/* ------------------------------------------------------------------ */
process.env.USE_SQLITE = "true";
delete process.env.DATABASE_URL;             // make 100 % sure PG is off

/* ------------------------------------------------------------------ */
/*  2️⃣ Import the migration helper and define our bootstrap function */
/* ------------------------------------------------------------------ */
import { migrateDatabase } from "./drizzle-sqlite";   // adjust if path differs

async function start() {
  console.log("🟢 sqlite-start.ts booting…");

  /* -------------------------------------------------------------- */
  /*  3️⃣ Run migrations (NO-OP if the schema is already current)   */
  /* -------------------------------------------------------------- */
  console.log("🔄 running migrations …");
  await migrateDatabase();
  console.log("✅ migrations finished");

  /* ---------------------------------------------------------------- */
  /* 4️⃣ Optional sanity-check query (safe to remove if not needed)   */
  /* ---------------------------------------------------------------- */
  try {
    const { open } = await import("sqlite");
    const path = await import("path");
    const dbPath  = path.join(process.cwd(), "data", "issues.db");
    const db      = await open({ filename: dbPath, driver: (await import("sqlite3")).Database });

    const rows = await db.all("SELECT * FROM issues");
    console.log("📋 Issues table rows:", rows.length);
  } catch (qErr) {
    console.warn("⚠️  couldn’t query issues table (not fatal):", qErr.message);
  }

  /* -------------------------------------------------------------- */
  /* 5️⃣ Launch the real Express / Vite app                          */
  /* -------------------------------------------------------------- */
  console.log("🚀 launching server/index.ts …");
  await import("./index");          // ← your main app lives here
}

/* ------------------------------------------------------------------ */
/*  6️⃣ Kick everything off                                           */
/* ------------------------------------------------------------------ */
start().catch((err) => {
  console.error("❌ start() failed:", err);
  process.exit(1);
});