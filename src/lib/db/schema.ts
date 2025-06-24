import { pgTable, serial, text, timestamp, boolean, integer, uuid, numeric, varchar, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';


// Driver Profiles Table
export const driverProfiles = pgTable('driver_profiles', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  documentStatus: varchar('document_status', { length: 20 }).default('pending'),
  availability: varchar('availability', { length: 20 }).default('offline'),
  licenseUrl: text('license_url'),
  vehicleUrl: text('vehicle_url'),
  insuranceUrl: text('insurance_url'),
  licenseNumber: varchar('license_number', { length: 50 }),
  vehicleMake: varchar('vehicle_make', { length: 50 }),
  vehicleModel: varchar('vehicle_model', { length: 50 }),
  vehicleYear: varchar('vehicle_year', { length: 4 }),
  notes: text('notes')
});

// Driver Verifications Table
export const driverVerifications = pgTable('driver_verifications', {
  id: serial('id').primaryKey(),
  driverId: text('driver_id').references(() => driverProfiles.id),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  adminNotes: text('admin_notes')
});

// Orders Table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  status: varchar('status', { length: 20 }).default('pending'),
  driverId: text('driver_id').references(() => driverProfiles.id),
  customerId: text('customer_id'),
  pickupAddress: text('pickup_address'),
  deliveryAddress: text('delivery_address'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  amount: text('amount'),
  estimatedDeliveryTime: timestamp('estimated_delivery_time')
});

// Drivers Table (new table from SQL)
export const drivers = pgTable('drivers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => driverProfiles.id),
  vehicleId: uuid('vehicle_id'),
  licenseNumber: text('license_number').notNull(),
  status: text('status').default('pending'),
  rating: numeric('rating', { precision: 3, scale: 2 }).default('5.0'),
  totalRides: integer('total_rides').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  averageRating: numeric('average_rating').default('0'),
  insuranceExpiry: date('insurance_expiry'),
  insuranceNumber: text('insurance_number'),
  licenseExpiry: date('license_expiry'),
  vehicleColor: text('vehicle_color'),
  vehicleMake: text('vehicle_make'),
  vehicleModel: text('vehicle_model').notNull().default('PENDING'),
  vehiclePlate: text('vehicle_plate').notNull().default('PENDING'),
  vehicleType: text('vehicle_type').notNull(),
  vehicleYear: text('vehicle_year').notNull(),
  verificationStatus: text('verification_status').notNull().default('pending'),
  verificationSubmittedAt: timestamp('verification_submitted_at'),
  isAvailable: boolean('is_available').default(false)
});

// Wallets Table
export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => driverProfiles.id).unique(),
  balance: text('balance').default('0'), // Store as text to match the database schema
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  currency: text('currency'),
  orders: integer('orders').default(0) // Add orders field to match what the Sidebar component expects
});

// Relations
export const driverProfilesRelations = relations(driverProfiles, ({ many, one }) => ({
  verifications: many(driverVerifications),
  orders: many(orders),
  wallet: one(wallets, {
    fields: [driverProfiles.id],
    references: [wallets.userId]
  }),
  driver: one(drivers, {
    fields: [driverProfiles.id],
    references: [drivers.userId]
  })
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  driver: one(driverProfiles, {
    fields: [orders.driverId],
    references: [driverProfiles.id]
  })
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  driver: one(driverProfiles, {
    fields: [wallets.userId],
    references: [driverProfiles.id]
  })
}));

export const driversRelations = relations(drivers, ({ one }) => ({
  profile: one(driverProfiles, {
    fields: [drivers.userId],
    references: [driverProfiles.id]
  })
}));

// Create custom Zod schemas that match the Drizzle table structure
// This approach avoids type errors from the drizzle-zod schemas
export const selectDriverProfileSchema = z.object({
  id: z.string(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  documentStatus: z.string().nullable(),
  availability: z.string().nullable(),
  licenseUrl: z.string().nullable(),
  vehicleUrl: z.string().nullable(),
  insuranceUrl: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  vehicleMake: z.string().nullable(),
  vehicleModel: z.string().nullable(),
  vehicleYear: z.string().nullable(),
  notes: z.string().nullable()
});

export const insertDriverProfileSchema = selectDriverProfileSchema.partial().extend({
  id: z.string()
});

export const selectDriverVerificationSchema = z.object({
  id: z.number(),
  driverId: z.string().nullable(),
  status: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  adminNotes: z.string().nullable()
});

export const insertDriverVerificationSchema = selectDriverVerificationSchema.partial().extend({
  driverId: z.string().nullable().optional()
});

export const selectOrderSchema = z.object({
  id: z.string(),
  status: z.string().nullable(),
  driverId: z.string().nullable(),
  customerId: z.string().nullable(),
  pickupAddress: z.string().nullable(),
  deliveryAddress: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  estimatedDeliveryTime: z.date().nullable()
});

export const insertOrderSchema = selectOrderSchema.partial().extend({
  id: z.string()
});

export const selectWalletSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  balance: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  currency: z.string().nullable(),
  orders: z.number().nullable()
});

export const insertWalletSchema = selectWalletSchema.partial();

export const selectDriverSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  vehicleId: z.string().nullable(),
  licenseNumber: z.string(),
  status: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  isAvailable: z.boolean().nullable(),
  vehicleType: z.string(), // Added: from drivers table, notNull
  vehicleYear: z.string(), // Added: from drivers table, notNull
});

export const insertDriverSchema = selectDriverSchema.partial().extend({
  licenseNumber: z.string(), // Ensure licenseNumber is required for insert
  vehicleType: z.string(),   // Ensure vehicleType is required for insert
  vehicleYear: z.string(),   // Ensure vehicleYear is required for insert
});

// Types
export type DriverProfile = z.infer<typeof selectDriverProfileSchema>;
export type NewDriverProfile = z.infer<typeof insertDriverProfileSchema>;

export type DriverVerification = z.infer<typeof selectDriverVerificationSchema>;
export type NewDriverVerification = z.infer<typeof insertDriverVerificationSchema>;

export type Order = z.infer<typeof selectOrderSchema>;
export type NewOrder = z.infer<typeof insertOrderSchema>;

export type Wallet = z.infer<typeof selectWalletSchema>;
export type NewWallet = z.infer<typeof insertWalletSchema>;

export type Driver = z.infer<typeof selectDriverSchema>;
export type NewDriver = z.infer<typeof insertDriverSchema>;
