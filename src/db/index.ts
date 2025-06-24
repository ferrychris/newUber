import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create a PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create drizzle database instance
export const db = drizzle(pool, { schema });

// Export schema for use in other files
export * from './schema';
