/**
 * Drizzle ORM configuration for SQLite
 * This is used for migrations and schema generation
 */
import type { Config } from 'drizzle-kit';
import path from 'path';

// Export Drizzle configuration for SQLite
export default {
  schema: './shared/schema-sqlite.ts',
  out: './drizzle/migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: path.join(process.cwd(), 'data/issues.db'),
  },
} satisfies Config;