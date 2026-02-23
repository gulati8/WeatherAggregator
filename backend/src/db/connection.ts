import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { config } from '../config';
import * as schema from './schema';
import path from 'path';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.database.url,
      max: 10,
    });
  }
  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export async function connectDb(): Promise<void> {
  const p = getPool();
  // Test connection
  const client = await p.connect();
  client.release();
}

export async function runMigrations(): Promise<void> {
  const db = drizzle(getPool());
  await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });
}

export async function isDbHealthy(): Promise<boolean> {
  try {
    const p = getPool();
    const client = await p.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
