import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'db.hcyodecaeoeiadwyyzrz.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'Ferrychris95@',
    database: 'postgres',
    ssl: true
  },
  verbose: true,
  strict: true,
} satisfies Config;
