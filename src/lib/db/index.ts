import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { supabase } from '../supabaseClient';
import * as schema from './schema';

// Get the connection string from environment variables
// For Supabase, we'll need to use the direct PostgreSQL connection
const connectionString = process.env.NEXT_PUBLIC_SUPABASE_POSTGRES_URL || '';

// Create a postgres connection
const client = postgres(connectionString);

// Create a drizzle instance
export const db = drizzle(client, { schema });

// Helper function to get the current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};

// Driver profile queries
export const driverProfileQueries = {
  // Get driver profile by user ID
  getByUserId: async (userId: string) => {
    const profile = await db.query.driverProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, userId),
      with: {
        verifications: true
      }
    });
    
    // If profile exists but verifications is undefined, set it to an empty array
    if (profile && !profile.verifications) {
      return {
        ...profile,
        verifications: []
      };
    }
    
    return profile;
  },
  
  // Create a new driver profile
  create: async (userId: string) => {
    return db.insert(schema.driverProfiles)
      .values({
        id: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        documentStatus: 'pending',
        availability: 'offline',
      })
      .returning();
  },
  
  // Update driver profile
  update: async (userId: string, data: Partial<schema.NewDriverProfile>) => {
    return db.update(schema.driverProfiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.driverProfiles.id, userId))
      .returning();
  },
  
  // Update driver availability
  updateAvailability: async (userId: string, availability: 'available' | 'offline') => {
    return db.update(schema.driverProfiles)
      .set({
        availability,
        updatedAt: new Date(),
      })
      .where(eq(schema.driverProfiles.id, userId))
      .returning();
  },
  
  // Delete driver profile by ID
  deleteById: async (id: string) => {
    return await db
      .delete(schema.driverProfiles)
      .where(eq(schema.driverProfiles.id, id));
  },
};

// Driver verification queries
export const driverVerificationQueries = {
  // Get verification by driver ID
  getByDriverId: async (driverId: string) => {
    const [verification] = await db
      .select()
      .from(schema.driverVerifications)
      .where(eq(schema.driverVerifications.driverId, driverId));
    return verification;
  },
  
  // Get verification by ID
  getById: async (id: number) => {
    const [verification] = await db
      .select()
      .from(schema.driverVerifications)
      .where(eq(schema.driverVerifications.id, id));
    return verification;
  },
  
  // Create a new verification record
  create: async (driverId: string) => {
    return db.insert(schema.driverVerifications)
      .values({
        driverId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  },
  
  // Update verification status
  updateStatus: async (verificationId: number, status: string, adminNotes?: string) => {
    return db.update(schema.driverVerifications)
      .set({
        status,
        adminNotes: adminNotes || null,
        updatedAt: new Date()
      })
      .where(eq(schema.driverVerifications.id, verificationId))
      .returning();
  },
};

// Order queries
export const orderQueries = {
  // Get active orders for a driver
  getActiveByDriverId: async (driverId: string) => {
    return db.query.orders.findMany({
      where: (orders, { eq, and }) => 
        and(
          eq(orders.driverId, driverId),
          eq(orders.status, 'active')
        ),
    });
  },
  
  // Get pending orders (available for pickup)
  getPending: async () => {
    return db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.status, 'pending'),
    });
  },
  
  // Get order by ID
  getById: async (id: string) => {
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id));
    return order;
  },
  
  // Update order status
  updateStatus: async (orderId: string, status: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled', driverId?: string) => {
    return db.update(schema.orders)
      .set({
        status,
        driverId: driverId || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();
  },
};

// Wallet queries
export const walletQueries = {
  // Get wallet by user ID
  getByUserId: async (userId: string) => {
    const [wallet] = await db
      .select()
      .from(schema.wallets)
      .where(eq(schema.wallets.userId, userId));
    return wallet;
  },
  
  // Create a new wallet
  create: async (userId: string) => {
    return db.insert(schema.wallets)
      .values({
        userId,
        balance: '0',
        currency: 'USD',
        orders: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  },
  
  // Update wallet balance
  updateBalance: async (userId: string, balance: string, orderCount?: number) => {
    const updateData: Record<string, any> = {
      balance,
      updatedAt: new Date(),
    };
    
    if (orderCount !== undefined) {
      updateData.orders = orderCount;
    }
    
    return db.update(schema.wallets)
      .set(updateData)
      .where(eq(schema.wallets.userId, userId))
      .returning();
  },
};

// Driver table queries
export const driverQueries = {
  // Get driver by user ID
  getByUserId: async (userId: string) => {
    const [driver] = await db
      .select()
      .from(schema.drivers)
      .where(eq(schema.drivers.userId, userId));
    return driver;
  },
  
  // Get driver by ID
  getById: async (id: string) => {
    const [driver] = await db
      .select()
      .from(schema.drivers)
      .where(eq(schema.drivers.id, id));
    return driver;
  },
  
  // Create or update driver record
  createOrUpdate: async (data: { id: string, licenseNumber: string, vehicleType: string, vehicleYear: string }) => {
    const existingDriver = await driverQueries.getById(data.id);
    
    if (existingDriver) {
      return driverQueries.update(existingDriver.id, data);
    } else {
      return driverQueries.create({
        id: data.id,
        userId: data.id, // Using the same ID as both driver ID and user ID
        licenseNumber: data.licenseNumber,
        vehicleType: data.vehicleType,
        vehicleYear: data.vehicleYear,
        status: 'pending',
        isAvailable: false
      });
    }
  },
  
  // Create a new driver record
  create: async (data: Partial<schema.NewDriver>) => {
    // Ensure required fields are present for driver creation
    if (!data.licenseNumber || !data.vehicleYear || !data.vehicleType) {
      throw new Error('Missing required fields for driver creation');
    }
    
    // Cast to required type after validation
    const validatedData = {
      licenseNumber: data.licenseNumber,
      vehicleYear: data.vehicleYear,
      vehicleType: data.vehicleType,
      id: data.id,
      userId: data.userId,
      status: data.status || 'pending',
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : false
    };
    
    return db.insert(schema.drivers)
      .values(validatedData)
      .returning();
  },
  
  // Update driver
  update: async (driverId: string, data: Partial<schema.NewDriver>) => {
    return db.update(schema.drivers)
      .set(data)
      .where(eq(schema.drivers.id, driverId))
      .returning();
  },
  
  // Update verification status
  updateVerificationStatus: async (id: string, status: string) => {
    const [driver] = await db
      .update(schema.drivers)
      .set({ status })
      .where(eq(schema.drivers.id, id))
      .returning();
    return driver;
  },

  // Update availability
  updateAvailability: async (id: string, isAvailable: boolean) => {
    const [driver] = await db
      .update(schema.drivers)
      .set({ isAvailable })
      .where(eq(schema.drivers.id, id))
      .returning();
    return driver;
  }
};

export { schema };
