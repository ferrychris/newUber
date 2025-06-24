import { sql } from 'drizzle-orm';
import { db } from '..';

// Migration to create the driver_wallets table if it doesn't exist
export async function createDriverWalletsTable() {
  try {
    // Check if table exists
    const tableExists = await checkIfTableExists('driver_wallets');
    
    if (!tableExists) {
      console.log('Creating driver_wallets table...');
      
      // Create the table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS driver_wallets (
          id SERIAL PRIMARY KEY,
          driver_id TEXT REFERENCES driver_profiles(id) UNIQUE,
          balance TEXT DEFAULT '0',
          orders INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log('driver_wallets table created successfully');
    } else {
      console.log('driver_wallets table already exists');
    }
  } catch (error) {
    console.error('Error creating driver_wallets table:', error);
    throw error;
  }
}

// Helper function to check if a table exists
async function checkIfTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      );
    `);
    
    return result.rows[0]?.exists || false;
  } catch (error) {
    console.error(`Error checking if ${tableName} exists:`, error);
    return false;
  }
}
