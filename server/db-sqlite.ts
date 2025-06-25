/**
 * Tiny bootstrap file that …
 *   1. Forces the project to use SQLite
 *   2. Runs (or re-runs) migrations so the DB is always up to date
 *   3. Prints some diagnostic output
 *   4. Finally boots the real Express/Vite server (server/index.ts)
 */

process.env.USE_SQLITE = "true";
delete process.env.DATABASE_URL;

import { migrateDatabase } from "./drizzle-sqlite"; // adjust path if needed

async function start() {
  console.log("🟢 sqlite-start.ts booting…");

  console.log("🔄 running migrations …");
  await migrateDatabase();
  console.log("✅ migrations finished");

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

  console.log("🚀 launching server/index.ts …");
  await import("./index");
}

start().catch((err) => {
  console.error("❌ start() failed:", err);
  process.exit(1);
});