import { initDb } from './db-sqlite';

async function start() {
  try {
    const db = await initDb();
    console.log('✅ SQLite initialized successfully');

    const rows = await db.all('SELECT * FROM issues');
    console.log('📄 Issues:', rows);
  } catch (err) {
    console.error('❌ Failed to initialize SQLite:', err);
  }
}

start();