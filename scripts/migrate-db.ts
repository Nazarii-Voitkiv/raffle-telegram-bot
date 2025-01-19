import { initDb } from '../lib/db';

async function migrate() {
  try {
    await initDb();
    console.log('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate();
