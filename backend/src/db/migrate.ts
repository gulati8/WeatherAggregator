import { runMigrations, disconnectDb } from './connection';

async function main() {
  console.log('Running migrations...');
  await runMigrations();
  console.log('Migrations complete');
  await disconnectDb();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
