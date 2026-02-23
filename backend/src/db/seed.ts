import { getDb, connectDb, disconnectDb } from './connection';
import { users } from './schema';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { connectRedis, disconnectRedis } from '../services/redis';

const seedUsers = [
  { email: 'admin@example.com', name: 'Admin User', role: 'admin' as const, password: 'password123' },
  { email: 'dispatcher@example.com', name: 'Dispatcher User', role: 'dispatcher' as const, password: 'password123' },
  { email: 'viewer@example.com', name: 'Viewer User', role: 'viewer' as const, password: 'password123' },
];

async function seed() {
  await connectRedis();
  await connectDb();

  const db = getDb();

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, config.auth.bcryptRounds);

    await db.insert(users).values({
      email: u.email,
      passwordHash,
      name: u.name,
      role: u.role,
    }).onConflictDoNothing({ target: users.email });

    console.log(`  Seeded ${u.role}: ${u.email} / ${u.password}`);
  }

  console.log('\nSeed complete! All users have password: password123');

  await disconnectDb();
  await disconnectRedis();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
